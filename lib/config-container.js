var util = require('util'),
    _ = require('underscore'),
    Configuration = require('./config').Configuration;
    
exports.ConfigContainer = ConfigContainer;

function ConfigContainer(source,options, config) {
    ConfigContainer.super_.call(this,source,options);
    if( ! config ) {
        config = new Configuration(source,options);
    }
    this._config_ = config;
    this._linkage_ = [];
    this._contents_ = [config];
    delete this._values_;
    delete this._listeners_;
}

util.inherits(ConfigContainer, Configuration);
exports.ConfigContainer = ConfigContainer;

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
    _.find( this._contents_, function(c) { 
        results = c.get(path);
        return( ! _.isUndefined( results ) );
    });
    return results;
};

p.keys = function() {
    var keys = [];
    _.each( this._contents_, function(c)  {
        keys = _.union( keys, c.keys() );
    });
    return keys;
};

p.remove = function( name ) {
    this._config_.remove(name);
};

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
    var link = function(change) {
        self._react_( config, change );
    };
    this._linkage_.unshift( link );
    config.on('change', link );
    config._touch_();
};

p._react_ = function( config, change) {
    var actual_value = this.get( change.name );
    if( actual_value == change.value  && change.value != change.old_value ) {
        this.emit('change', change );
    }
};

    
