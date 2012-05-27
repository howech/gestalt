var parsers = require('./format').parsers,
    config = require('./config'),
    util = require('util'),
    _ = require('underscore');  //jslint ignore


function RemapConfig( mapper, org ) {
    var self = this;
    var source = "remap";
    this._mapper_ = mapper;
    this._org_ = org;
    var options = {};
    RemapConfig.super_.call(this,source,options);

    this._cache_ = {forward: {}, reverse: {}};

    org.on('change', function(change) {
        var new_name = self.map_old_name( change.name );
	var new_change = {};
	_.each( change, function(val, index) { new_change[index] = val } );
	new_change.name = new_name;
	self.emit('change', new_change );
    });
    this._touch_();
}

util.inherits(RemapConfig, config.Configuration);
module.exports.RemapConfig = RemapConfig;

var p = RemapConfig.prototype;

// Sample remapper function:
//
// function mapper( old_name ) {
//     return "path:to:new:" + old_name;
// }

p.map_old_name = function(old_name) {
    var forward = this._cache_.forward;
    var reverse = this._cache_.reverse;

    if( _.has( forward, old_name ) ) {
	return forward[old_name];
    }
    var new_name = this._mapper_(old_name);
    forward[old_name] = new_name;
    if( new_name ) {
	reverse[new_name] = old_name;
    }
    return new_name;
}

p.map_new_name = function(new_name) {
    var reverse = this._cache_.reverse;

    if( _.has( reverse, new_name ) ) {
	return reverse[new_name];
    } else {
	return undefined;
    }
}

p._touch_ = function() {
    this._org_._touch_();
};

p.get = function(name) {
    return this._org_.get( this.map_new_name(name));
};

p.getValSource = function(name) {
    return this._org_.getValSource( this.map_new_name(name));
};

p.remove = function(name) {
    this._org_.remove( this.map_new_name(name));
};

p.set = function(name,value,source) {
    this._org_.set( this.map_new_name(name), val, source);
};

p.has = function( name ) {
    return this._org_.has( this.map_new_name(name));
};

p.keys = function( callback ) {
    var self = this;
    var keys = [];
    _.each( this._org_.keys(), function(key) {
        var new_key = self.map_old_name(key);
        if( !_.isUndefined(new_key )) {
            keys.push( new_key );	    
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

