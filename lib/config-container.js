var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('underscore'),
    config = require('./config');
    
var Configuration = config.Configuration;
var getPath = config.getPath;


function ConfigContainer(source,options) {
    this._source_ = source;
    this._options_ = options;
    this._config_ = new Configuration(source);
    this._contents_ = [];
    this.addOverride( this._config_ );
    EventEmitter.call(this,source);
    return this;
}
util.inherits(Configuration, EventEmitter);
exports.ConfigContainer = ConfigContainer;


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


ConfigContainer.prototype.each = function( callback ) {
    var done = {};
    this._contents_.foreEach( function( c ) {
        c.each( function(element, index, list) {
            if( done[index] === undefined ) {
                done[index] = 1;
                callback(element,index,list);
            } 
        });
    });
}

ConfigContainer.prototype.remove = function( name ) {
    this._config_.remove(name);
}

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
    // special case for undefined - emit a different event if this 
    // exposes a deeper default value
    if( _.isUndefined(value) ) {
        var back_end = false;
        for( var i=0; i< this._contents_.length; ++i ) {
            var cfg = this._contents_[i];
            if( cfg === config ) {
                back_end = true;
            } else if( back_end ) {
                var v = cfg.get(path);
                if( ! _.isUndefined(v) ) {
                    this.emit('change',path,v,cfg._source_);
                    return;
                }
            } else {
                var v = cfg.get(path);
                if( ! _.isUndefined(v) ) {
                    return;
                }
            }
        }
        this.emit('change', path, value, source);
    } else {
        for( var i=0; i< this._contents_.length; ++i) {
            var cfg = this._contents_[i];
            if( cfg === config )
                break;
            oldval = cfg.get(path);        
            if( ! _.isUndefined(oldval) )
                return;
        }
        this.emit('change', path, value, source);
    }
};

    
exports.Configuration = Configuration;
exports.ConfigContainer = ConfigContainer;
//exports.ConfigFile = require('./file').ConfigFile;