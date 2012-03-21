var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('underscore');
    

function Configuration(source, options) {
    this._options_ = options;
    this._source_ = source; 
    this._values_ = {};
    EventEmitter.call(this);
}
util.inherits(Configuration, EventEmitter);
exports.Configuration = Configuration;

function getPath(name) {
    var path;
    if( typeof(name)== 'string' ) {
         path = name.split(/:/);
    } else {
        path = name;
    }
    return path;
}

Configuration.prototype._touch_ = function() {
    var self = this;
    _.each( this._values_, function(value,key) {
        if( _.isUndefined( value._touch_ ) ) {
            self.emit('change', key, value, self._source_ );
        } else {
            value._touch_();
        }
    });
};

Configuration.prototype.get = function(name) {
    var path = getPath(name);
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

Configuration.prototype.remove = function(name) {
    console.log("remove ", name);
    var path = getPath(name);
    var n = path.shift();
    if(path.length === 0) {
    delete this._values_[n];
	this.emit('change', n, undefined, this._source_);
    } else {
	var next = this._values_[n];
        if( typeof(next) == 'object' && ! _.isNull(next) ) {
            next.remove(path);            
        } 
    }
};

	
Configuration.prototype.set = function(name,value,source) {
    var self = this;
    var path = getPath(name);
    
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
            var changed = this._values_[n] != value;
            this._values_[n] = value;
            if(changed)
                this.emit('change', n, value, source);
        } 
    } else {
        var next = this._values_[n];
        if( typeof(next) == 'object' && ! _.isNull(next) ) {
            next.set(path,value,source);            
        } else {
            var self = this;
            var prefix = n + ":";
            this._values_[n] = new Configuration(source);
            this._values_[n].on('change', function(name,value,source) {
                self.emit('change', prefix + name, value, source );
            });
            this._values_[n].set(path,value,source);
        }
    }
};

Configuration.prototype.each = function( callback ) {
    var self = this;
    _.each( this._values_, function(element,index,list ) {
        callback(element,index,self);
    });
};

