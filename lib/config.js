var EventEmitter = require('events').EventEmitter,
    util = require('util'),
_ = require('underscore');
    

module.exports.Configuration = Configuration;

function Configuration(source, options) {
    Configuration.super_.call(this);
    this._options_ = options || {};
    this._source_ = source; 
    this._values_ = {};    
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
}

p._touch_ = function() {
    var self = this;
    _.each( this._values_, function(value,key) {
        if( _.isUndefined( value._touch_ ) ) {
            self.emit('change', key, value, self._source_ );
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
    console.log("remove ", name);
    var path = this.getPath(name);
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

p.each = function( callback ) {
    var self = this;
    _.each( this._values_, function(element,index,list ) {
        callback(element,index,self);
    });
};

