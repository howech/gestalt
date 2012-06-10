var util = require('util'),
    _ = require('underscore'),
    Configuration = require('./config').Configuration;
    
exports.ConfigContainer = ConfigContainer;

function ConfigContainer(options) {
    var config;
    options = _.extend({},options);
    ConfigContainer.super_.call(this,options);
    if( ! options.config ) {
        config = new Configuration(options);
    } else {
	config = options.config;
    }
    this._config_ = config;
    // TODO _linkage_ not really used
    this._linkage_ = [];
    this._contents_ = [];
    this.state( config.state() );
    this.addOverride( config );
    delete this._values_;
    delete this._listeners_;
}

util.inherits(ConfigContainer, Configuration);
exports.ConfigContainer = ConfigContainer;

var p = ConfigContainer.prototype;

// Delegate sets to the main configuration object
p.set = function(name,value,source) {
    source = this._get_source_( source, this._source_ );
    this._config_.set(name,value,source);
};

p._touch_ = function() {
    _.each( this._contents_, function(value) {
        value._touch_();
    });
};

p.get = function(name) {
    var results;
    // Find the first config on the stack with a defined value
    // for the name, setting the value as a side effect.
    _.find( this._contents_, function(c) { 
        results = c.get(name);
        return( ! _.isUndefined( results ) );
    });
    return results;
};

// Get the value that the higher priority configs think that the
// name has
p._get_above_ = function(name, config) {
    var valSource;
    _.find( this._contents_, function(c) {
	if( c === config ) {
	    return true;
	} else {
	    valSource = c.getValSource(name);
	    return( !_.isUndefined( valSource ));
	} 
    });	
    return valSource;
}

// Get the value that the lower priority objects think that the
// name has
p._get_below_ = function(name,config) {
    var valSource;
    var state = false;
    _.find( this._contents_, function(c) {
	if( c === config ) {
	    state = true;
	    return false;
	} else if( state ) {
	    valSource = c.getValSource(name);
	    return( !_.isUndefined(valSource));
	} else {
	    return false;
	}
    });
    return valSource;
}


p.getValSource = function(name) {
    var results;
    // same pattern as get
    _.find( this._contents_, function(c) { 
        results = c.getValSource(name);
        return( ! _.isUndefined( results ) );
    });
    return results;
};

p.keys = function() {
    var keys = [];
    // Take the union of all of the keys
    _.each( this._contents_, function(c)  {
        keys = _.union( keys, c.keys() );
    });
    return keys;
};

p.remove = function( name ) {
    // Delegate to the main object
    this._config_.remove(name);
};

p._hook_up_ = function( config ) {
    var self = this;
    config.on('change', function(change) {self._react_(config,change) } );
    config.on('state', function(change_state) { self._state_react_(config, change_state) } );
    this._state_react_( config );
}
p.addDefault = function( config ) {
    // Add a configuration object to the low-priority end of the stack
    var self = this;
    this._contents_.push( config );
    this._hook_up_( config );
    config._touch_();
};

p.addOverride = function( config ) {
    // Add a configuration object to the high-priority end of the  stack
    var self = this;
    this._contents_.unshift( config );
    this._hook_up_( config );
    config._touch_();
};


p._dependency_states_ = function() {
    return ConfigContainer.super_.prototype._dependency_states_.call(this).concat(
	_.map( this._contents_, function(config) { return config.state() } ) 
    );
}

p._state_react_ = function( config, change_state ) {
    var state = change_state ? change_state.state : config.state();
    var data = change_state ? change_state.data : undefined;

    if( state == 'invalid' ) {
	this.state( state, data );
    } else if (state == 'ready' ) {
	if( _.all( this._contents_, function(config) { return config.state() === 'ready' } ) ) {
	    this.state( state, data);
	}
    } else {
	this.state( 'not ready', data );
    }
}

p._react_ = function( config, change) {
    var above_valSource = this._get_above_(change.name, config );
    if( !_.isUndefined( above_valSource ) ) {
	// An overriding configuration holds a value for this name,
	// so this change is masked.
	// emit NOTHING
    } else if( _.isUndefined( change.value ) ) {
	// This is a deletion. change.old_value is good, but
	// we need the new value and source from below.
	var below_valSource = this._get_below_(change.name, config);
	var below_val = below_valSource && below_valSource.value;
	if( change.old_value != below_val ) {
	    // dont emit a change if there is no change other than source.
	    this.emit( 'change', { 
		name: change.name, 
		value: below_val,
		old_value: change.old_value, 
		source: change.source } ); // the change came from here, even though the value comes from elsewhere....
	}
    } else if( _.isUndefined( change.old_value ) ) {
	// New value for this layer, but there might be an old value on a
	// lower priority layer.
	var below_valSource = this._get_below_(change.name, config);
	var below_val = below_valSource && below_valSource.value;
	if( change.value != below_val ) {
	    // dont emit a change if there is not change other than source
	    this.emit( 'change', { 
		name: change.name, 
		value: change.value,
		old_value: below_val, 
		source: change.source } );	
	}
    } else {
	// Whatever came to us is a valid description of the change. 
        this.emit('change', change );
    }
};

    
