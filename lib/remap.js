var parsers = require('./format').parsers,
    Configuration = require('./config').Configuration,
    util = require('util'),
    _ = require('underscore');  //jslint ignore


function RemapConfig( options ) {
    var self = this;    
    options = _.extend({ mapper: function(x) { return x; } }, options);
    RemapConfig.super_.call(this,options);

    if( _.isFunction(this._options_.mapper) ) {
	this._mapper_ = this._options_.mapper;	
    } else {
	// Build a function to dereference an object
	var m = this._options_.mapper;
	this._mapper_ = function(old) { return m[old];  };
    }

    var org = this._org_ = this._options_.config;
    this._cache_ = {forward: {}, reverse: {}};

    org.on('change', function(change) {
        var new_name = self.map_old_name( change.name );

	// Only emit change events for changes that are
	// mapped to something
	if( !_.isUndefined( new_name )) {
	    var new_change = _.clone( change );
	    new_change.name = new_name;
	    self.emit('change', new_change );
	}
    });

    org.on( 'state', function( state_change ) {
		self.keys();
		self.state( state_change.state, state_change.data );
	    });

    this.keys();    
}

util.inherits(RemapConfig, Configuration);
module.exports.RemapConfig = RemapConfig;

var p = RemapConfig.prototype;

// Sample remapper function:
//
// function mapper( old_name ) {
//     return "path:to:new:" + old_name;
// }
//
// mapper can return undefined for values that it does not want to match
// other than that, mapper should be 1-1

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

// map_new_name relies entirely on the cache to reverse map
p.map_new_name = function(new_name) {
    var reverse = this._cache_.reverse;

    if( _.has( reverse, new_name ) ) {
	return reverse[new_name];
    } else {
	return undefined;
    }
}

// delegate most methods to the original object
// note that events will be passed on appropriately by the 
// listener registered in the constructor
p._touch_ = function() {
    this._org_._touch_();
};

p.get = function(name) {
    return this._org_.get( this.map_new_name(name) );
};

p.getValSource = function(name) {
    return this._org_.getValSource( this.map_new_name(name));
};

p.remove = function(name) {
    // remapped configs are read only
    // this._org_.remove( this.map_new_name(name));
};

p.update = function(name,value,source) {
    // remapped objects are read only
    // this._org_.set( this.map_new_name(name), value, source);
};

p.set = function(name,value,source) {
    // remapped objects are read only
    // this._org_.set( this.map_new_name(name), value, source);
};

p.has = function( name ) {
    return this._org_.has( this.map_new_name(name) );
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

p.original = function() {
    return this._org_;
}


