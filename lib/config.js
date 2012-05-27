var EventEmitter = require('events').EventEmitter,
    util = require('util'),
_ = require('underscore');
    

module.exports.Configuration = Configuration;

function Configuration(source, options) {
    Configuration.super_.call(this);
    this._options_ = options || {};
    this._source_ = source; 
    this._sources_ = {};
    this._values_ = {};
    this._listeners_ = {};
}

util.inherits(Configuration, EventEmitter);

var p = Configuration.prototype;

p.getPath = function(name) {
    var path;
    if( typeof(name)== 'string' ) {
         path = name.split(/:/);
    } else {
        path = name;
    }
    return path;
};

p._touch_ = function() {
    var self = this;
    _.each( this._values_, function(value,key) {
        if( ! _.isUndefined( value ) ) {
            self.emit('change', { name: key, value: value, source: self._sources_[key] || self._source_, old_value: undefined } );
        }
        if( value instanceof Configuration ) {
            value._touch_();
        }
    });
};

p.get = function(name) {
    var path = this.getPath(name);
    var n = path.shift();
    if( path.length === 0 ) {
        return this._values_[n];
    } else {
        var next = this._values_[n];
        if( typeof(next) == 'object' && ! _.isNull(next) ) {
            return next.get(path);            
        } else {
            return undefined;
        }
    }
};

p.getValSource = function(name) {
    var path = this.getPath(name);
    var n = path.shift();
    if( path.length === 0 ) {
        if( _.isUndefined( this._values_[n] ) )
            return undefined;
        else
            return { value: this._values_[n], source: this._sources_[n] || this._source_ };
    } else {
        var next = this._values_[n];
        if( typeof(next) == 'object' && ! _.isNull(next) ) {
            return next.getValSource(path);            
        } else {
            return undefined;
        }
    }
};

p.remove = function(name) {
    var path = this.getPath(name);
    var n = path.shift();
    if(path.length === 0) {
        if( ! _.isUndefined(this._values_[n]) ) {
            var old_value = this._change_value_(n,undefined);
	    if( old_value instanceof Configuration ) {
		old_value.del(this, n);	
	    } else {
		this.emit('change', { name: n, value: undefined, source: this._sources_[n] || this._source_, old_value: old_value} );
	    }
	    delete this._values_[n];
        }
    } else {
        var next = this._values_[n];
        if( next instanceof Configuration ) {
            next.remove(path);            
        } 
    }
};

p.del = function(top,n) {
    var self = this;
    _.each( this._values_, function(value, name) {
	var path = n + ":" + name;
	if( value instanceof Configuration ) {
	    value.del(top, path);
	} else {
	    top.emit('change', { name: path, value: undefined, source: (this._sources_ && this._sources_[name]) || this._source_, old_value: value} );
	}
    });
}

function addPrefix(change,prefix) {
    return { 
        name: prefix + change.name, 
        value: change.value,
        source: change.source,
        old_value: change.old_value
    };
}

p._teardown_listener_ = function(name,event) {
    var l = this._listeners_[name]; 
    if( l ) {
        if( !event )
            event = 'change';
        this._values_[name].removeListener(event,l[event]);
        delete this._listeners_[name]; // = undefined;
	delete l[event];
    }
};

p._change_value_ = function(name,value,event,listener) {
    this._teardown_listener_(name,event);
    var old_value = this._values_[name];
    this._values_[name] = value;
    this._setup_listener_(name,event,listener);
    return old_value;
};

p._setup_listener_ = function(name, event, l) {
    var self = this;
    if( this._values_[name] instanceof Configuration ) {
        if( !event )
            event = 'change';
        if( !l ) {
            var prefix = name + ":";
            l = function(change) { self.emit(event, addPrefix(change,prefix) ); };
        }
        this._listeners_[name] =  this._listeners_[name] || {};
	this._listeners_[name][event] = l;
        this._values_[name].on(event,l);
    }
};

p.set = function(name,value,source) {
    var self = this;
    var path = this.getPath(name);
    
    if( !source ) {
        source = this._source_;
    }
        
    var n = path.shift();
    if( path.length === 0 ) {
        if( _.isObject( value ) && !(value instanceof Configuration)) {
	    if( this._values_[n] ) {
		_.each( this._values_[n]._values_, function(val,key) {
                    if( !_.has(value, key) ) {
			console.log("removing %s",key);
			self.remove([n,key]);
		    }
		});
	    }
            _.each( value, function(element, index) {
                self.set([n,index], element, source);
            });
	} else {
            var old_value = this._change_value_(n,value);
            if( source == this._source_ ) {
                delete this._sources_[n];
            } else {
                this._sources_[n] = source;
            }
            var changed = old_value != value;
            if(changed) {
		this.emit('change', { name:n, value: value, source: source, old_value: old_value });
	    }
        } 
    } else {
        var next = this._values_[n];
        if( next instanceof Configuration ) {
            next.set(path,value,source);            
        } else {
            this._change_value_( n, new Configuration(source) );
            this._values_[n].set(path,value,source);
        }
    }
};

p.has = function( name ) {
    var self = this;
    var path = this.getPath(name);
    var n = path.shift();
    if( path.length === 0 ) {
	return _.has( self._values_, n );
    } else {
	var next = this._values_[n];
	return next instanceof Configuration && next.has( path );
    }
};

p.keys = function( callback ) {
    var keys = [];
    _.each( this._values_, function(element, index) {
        keys.push(index);
        if( element instanceof Configuration ) {
            var prefix = index + ":";
            _.each( element.keys(), function(element) {
		var key = prefix + element;
                keys.push(key);
            });
        }
    });
    return keys;
};

p.each = function( callback ) {
    var self = this;
    _.each( this.keys(), function(key) {
        callback( self.get(key), key, self);
    });
};

p.isArrayLike  = function() {
    var arrayLike = true;
    _.keys(this._values_).map( function(x) { return(Number(x)); })
        .sort()
        .forEach( function(element,index) {
            arrayLike = arrayLike && (element===index);
        });
    return arrayLike;
};

p.toObject = function() {
    var result;
    if( this.isArrayLike() ) {
        result = [];
        _.each( this._values_, function(element,index)  {
            var val = element;
            if( _.isObject(val) ) 
                val = val.toObject();
            result[ Number(index) ] = val;
        });
    } else {
        result = {};
        _.each( this._values_, function(element,index) {
            var val = element;
            if( _.isObject(val) ) 
                val = val.toObject();
            result[ index ] = val;
        });
    }
    return result;
};


p.report = function (indent) {
    var self = this;
    _.each( this.keys().sort(), function(key) {
        var valSource = self.getValSource(key);
        var value = valSource.value;
        if (value instanceof Configuration) { 
            value = '[Configuration]'; 
        } else if ( _.isString(value) ) { 
            value = "'" + value + "'"; 
        }
        console.log("%s=%s  --%s", key, value, valSource.source);
    });
};