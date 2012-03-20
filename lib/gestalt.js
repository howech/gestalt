var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    sys = require('sys'),
    _ = require('underscore');
    

function Configuration(source) {
    this._source_ = source; 
    this._values_ = {};
    EventEmitter.call(this);
}
sys.inherits(Configuration, EventEmitter);


function ConfigContainer(source) {
    this._source_ = source;
    this._config_ = new Configuration(source);
    this._contents_ = [];
    this.addOverride( this._config_ );
    EventEmitter.call(this,source);
    return this;
}
sys.inherits(Configuration, EventEmitter);

//ConfigContainer.prototype = new EventEmitter();

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

Configuration.prototype.set = function(name,value,source) {
    var path = getPath(name);
    
    if(!source) {
        source = this._source_;
    }
    
    var n = path.shift();
    if( path.length === 0 ) {
        var changed = this._values_[n] != value;
        this._values_[n] = value;
        if(changed)
            this.emit('change', n, value, source);
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


ConfigContainer.prototype.set = function(name,value,source) {
    this._config_.set(name,value,source);
};

ConfigContainer.prototype._touch_ = function() {
    _.each( this._contents_, function(value) {
        value._touch_();
    });
};

ConfigContainer.prototype.get = function(name) {
    var path = getPath(name);
    var results;
    this._contents_.forEach( function(c) { 
        results = c.get(path);
        if( ! _.isUndefined( results ) ) {
            return results;
        }
    });
    return results;
};


ConfigContainer.prototype.addDefault = function( config ) {
    var self = this;
    this._contents_.push( config );
    config.on('change', function( path, value, source) {
        self._react_(config,path,value,source);
    });
    config._touch_();
};

ConfigContainer.prototype.addOverride = function( config ) {
    var self = this;
    this._contents_.unshift( config );
    config.on('change', function( path, value, source) {
        self._react_(config,path,value,source);
    });
    config._touch_();
};

ConfigContainer.prototype._react_ = function( config, path, value, source) {
    var oldval;
    for( var i=0; i< this._contents_.length; ++i) {
        var cfg = this._contents_[i];
        if( cfg === config )
            break;
        oldval = cfg.get(path);        
        if( ! _.isUndefined(oldval) )
            return;
    }
    this.emit('change', path, value, source);
};

    
exports.Configuration = Configuration;
exports.ConfigContainer = ConfigContainer;
//exports.ConfigFile = require('./file').ConfigFile;