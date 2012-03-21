var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('underscore'),
    Configuration = require('./config').Configuration;
    

exports.ConfigContainer = ConfigContainer;

function ConfigContainer(source,options) {
    ConfigContainer.super_.call(this,source,options);
}

util.inherits(ConfigContainer, EventEmitter);

var p = ConfigContainer.prototype;

p.set = function(name,value,source) {
    this._config_.set(name,value,source);
};

p._touch_ = function() {
    _.each( this._contents_, function(value) {
        value._touch_();
    });
};

p.get = function(name) {
    var path = this.getPath(name);
    var results;
    this._contents_.forEach( function(c) { 
        results = c.get(path);
        if( ! _.isUndefined( results ) ) {
            return results;
        }
    });
    return results;
};


p.each = function( callback ) {
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

p.remove = function( name ) {
    this._config_.remove(name);
}

p.addDefault = function( config ) {
    var self = this;
    this._contents_.push( config );
    config.on('change', function( path, value, source) {
        self._react_(config,path,value,source);
    });
    config._touch_();
};

p.addOverride = function( config ) {
    var self = this;
    this._contents_.unshift( config );
    config.on('change', function( path, value, source) {
        self._react_(config,path,value,source);
    });
    config._touch_();
};

p._react_ = function( config, path, value, source) {
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

    
