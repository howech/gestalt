var EventEmitter = require('events').EventEmitter,
    util = require('util'),
_ = require('underscore');
    

module.exports.Configuration = Configuration;

function Configuration(source, options) {
    Configuration.super_.call(this);
    this._options_ = options || {};
    this._source_ = source; 
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
        if( _.isUndefined( value._touch_ ) ) {
            self.emit('change', { name: key, value: value, source: self._source_, old_value: value } );
        } else {
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

p.remove = function(name) {
    var path = this.getPath(name);
    var n = path.shift();
    if(path.length === 0) {
        if( ! _.isUndefined(this._values_[n]) ) {
            var old_value = this._change_value_(n,undefined);
            this.emit('change', { name: n, value: undefined, source: this._source_, old_value: old_value} );
        }
    } else {
        var next = this._values_[n];
        if( next instanceof Configuration ) {
            next.remove(path);            
        } 
    }
};


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
        this._values_[name].removeListener(event,l);
        delete this._listeners_[name]; // = undefined;
    }
};

p._change_value_ = function(name,value,event, listener) {
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
        this._listeners_[name] = l;
        this._values_[name].on(event,l);
    }
};

p.set = function(name,value,source) {
    var self = this;
    var path = this.getPath(name);
    
    if(!source) {
        source = this._source_;
    }
    
    var n = path.shift();
    if( path.length === 0 ) {
        if( _.isObject( value ) ) {
            _.forEach( value, function(element, index) {
                self.set([n,index], element, source);
            });
        } else {
            var old_value = this._change_value_(n,value);
            var changed = old_value != value;
            if(changed)
                this.emit('change', { name:n, value: value, source: source, old_value: old_value });
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

p.each = function( callback ) {
    var self = this;
    _.each( this._values_, function(element,index ) {
        callback(element,index,self);
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
                val = val.toObject;
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
    
