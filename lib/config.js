var EventEmitter = require('events').EventEmitter,
    util = require('util'),
_ = require('underscore');
    

module.exports.Configuration = Configuration;

function Configuration(options) {
    Configuration.super_.call(this);
    options = _.extend( {}, options );
    this._options_ = options;  // the options object
    this._source_ = options.source;  // the default source for the configuration
    this._sources_ = {};             // sources for individual name pairs
    this._values_ = {};              // values
    this._listeners_ = {};           // listener hierarchy
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
            self.emit('change', { name: key, value: value, source: self._src_(key) , old_value: undefined } );
        }
        if( value instanceof Configuration ) {
            value._touch_();
        }
    });
};


p._get_source_ = function(source) {
    var src = source || this._source_;
    if(src) {
	return src;
    }
    // If the source was not explicitly set, figure it out based on the caller...
    var stack = new Error().stack.split(/\n/);
    var caller = stack[3]; // 0 = error, 1 = set, 2 = whoever call set. Note that this
                           // meands that places where we delegate need to figure out
                           // the source at the delegation entry point.
    var match = caller.match(/^\s+at\s(.*)$/);
    return (match && match[1]) || "unknown" ;    
}

// Internal method for getting the source of a particular non-nested name
p._src_ = function(n) {
    return this._sources_[n] || this._source_;
    if(src) {
	return src;
    }
    // If the source was not explicitly set, figure it out based on the caller...
    var stack = new Error().stack.split(/\n/);
    var caller = stack[2]; // 0 = error, 1 = set, 2 = whoever call set. Note that this
                           // meands that places where we delegate need to figure out
                           // the source at the delegation entry point.
    var match = caller.match(/^\s+at\s(.*)$/);
    return match && match[1];
}

p.get = function(name) {
    var path = this.getPath(name);
    if( _.isUndefined(path)) {
        return undefined;	    
    }
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
    if( _.isUndefined(path)) {
        return undefined;	    
    }
    var n = path.shift();
    if( path.length === 0 ) {
        if( _.isUndefined( this._values_[n] ) )
            return undefined;
        else
            return { value: this._values_[n], source: this._src_(n) };
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
    if( _.isUndefined(path)) {
        return;	    
    }
    var n = path.shift();
    if(path.length === 0) {
        if( ! _.isUndefined(this._values_[n]) ) {
            var old_value = this._change_value_(n,undefined);
	    if( old_value instanceof Configuration ) {
		old_value.del(this, n);	
	    } else {
		this.emit('change', { name: n, value: undefined, source: this._src_(n), old_value: old_value} );
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

// Special handling for removing nested data
p.del = function(top,n) {
    var self = this;
    _.each( this._values_, function(value, name) {
	var path = n + ":" + name;
	if( value instanceof Configuration ) {
	    value.del(top, path);
	} else {
	    top.emit('change', { name: path, value: undefined, source: self._src_(name), old_value: value} );
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

// If we do surgery on a tree that includes configuration objects,
// we need to make sure to detach any listeners when we remove a node.
p._teardown_listeners_ = function(name) {
    var self = this;
    var listeners = this._listeners_[name];
    if( this._values_[name] && this._values_[name] instanceof Configuration ) {
	_.each( listeners, function( listener, event) {
	   self._values_[name].removeListener( event, listener );
	});
    }
};

// These are the listeners that make events propagate from node to parent
p._default_listeners_ = function(prefix) {
    var self = this;
    return { 
	change:  function(change) { self.emit('change', addPrefix(change,prefix) ); },
	delete:  function() {},
	invalid: function() {},
	loaded:  function() {}
    };
}
 
// When we asign a value to a node to a value, we need to make sure to 
// detatch the old listeners (if present), and hook up new listeners
// if needed. We dont want events going on while the surgury is being
// performes, and something else will take care of emitting the changes
// when they come. 
p._change_value_ = function(name,value) {
    this._teardown_listeners_(name);
    var old_value = this._values_[name];
    this._values_[name] = value;
    this._setup_listeners_(name);
    return old_value;
};

// Hook up listenerst to child configurations
p._setup_listeners_ = function(name, event) {
    var self = this;
    if( this._values_[name] instanceof Configuration ) {
	this._listeners_[name] = this._listeners_[name] || this._default_listeners_(name+":");	
	var listeners = this._listeners_[name];
	_.each( listeners , function( listener, event ) {
	    self._values_[name].on(event,listener);
	});
    }
};

p.set = function(name,value,source) {
    var self = this;
    var path = this.getPath(name);

    // do nothing if the path is not valid
    if( _.isUndefined(path)) {
        return;	    
    }
    
    // default source
    source = this._get_source_(source);
        
    var n = path.shift();

    if( path.length === 0 ) {
	// we are at the end of the path
        if( _.isObject( value ) && !(value instanceof Configuration)) {
	    // plain old object, break it apart
	    if( this._values_[n] ) {
		// remove values that are not present in the new value
		_.each( this._values_[n].flat_keys, function(key) {
                    if( !_.has(value, key) ) {
			self.remove([n,key]);
		    }
		});
	    }
	    // set the new value
            _.each( value, function(element, index) {
                self.set([n,index], element, source);
            });
	} else {
            var old_value = this._change_value_(n,value);
	    // clean up sources - if the change source is the same
	    // as the default source for this node, then revert to 
	    // the default. Otherwise, keep track of the source 
	    // precisely.
            if( source == this._source_ ) {
                delete this._sources_[n];
            } else {
                this._sources_[n] = source;
            }
	    // Hmm. This seems wrong for structures...
            var changed = old_value != value;
            if(changed) {
		this.emit('change', { name:n, value: value, source: source, old_value: old_value });
	    }
        } 
    } else {
	// We have not reached the end of the path we are going down. 
        var next = this._values_[n];
        if( next instanceof Configuration ) {
            next.set(path,value,source);            
        } else {
            this._change_value_( n, new Configuration({source: this._source_ }) );
	    this._sources_[n] = source;
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

p.flat_keys = function() {
    var keys = [];
    return _.keys( this._values_ );
}

p.each = function( callback ) {
    var self = this;
    _.each( this.keys(), function(key) {
        callback( self.get(key), key, self);
    });
};

p.isArrayLike  = function() {
    var arrayLike = true;
    this.flat_keys().map( function(x) { return(Number(x)); })
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


p.patternListen = function( pattern, listener ) {
    this.on('change', function(change) {
        if( change.name.match( pattern ) ) {
	    listener(change);
	}	
    });
}