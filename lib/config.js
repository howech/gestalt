var EventEmitter = require('events').EventEmitter,
    util = require('util'),
_ = require('underscore');
    

module.exports.Configuration = Configuration;

function Configuration(options) {
    Configuration.super_.call(this);
    this._options_ = { destructure_assignments: true,  // if set to false, objects or arrays
                                                       // can be added as values to the config.
		                                       // when set to true, complex objects get
			                               // broken up into atomic chunks.
		       destructure_arrays: true,       // if set to false, arrays
		                                       // can be added as values to the config.
		       source: undefined,              // default source for the object
		       initial_state: 'ready'          // state to transition to after initialization
		     };
    this.options( options );

    this._source_ = this._options_.source;  // the default source for the configuration
    this._sources_ = {};             // sources for individual name pairs
    this._values_ = {};              // values
    this._listeners_ = {};           // listener hierarchy
    this._pattern_listeners_ = [];
    this._state_ = 'not ready';

    var self = this;
    this.on('change', function(change) { this._on_change_(change) });
    process.nextTick( function() {self.state( self._options_.initial_state_ ) } );
}

util.inherits(Configuration, EventEmitter);

var p = Configuration.prototype;

p.state = function(state, extra) {
    if( state === 'ready') {
	this._state_ = 'ready';
	this.emit('ready');
    } else if(state === 'loading') {
	this._state_ = 'loading';
	this.emit('loading');
    } else if(state === 'invalid') {
	this.emit('invalid', extra);
	this._state_ = 'invalid';
    }
    return this._state_;
}

p._on_change_ = function(change) {
    _.each( this._pattern_listeners_, function( l ) {
	var match = false;
	if( _.isString( l.pattern )) {
	    match = ( l.pattern === change.name );
	} else if( _.isRegExp( l.pattern )) {
	    match = ( change.name.match( l.pattern) );
	} else if( _.isFunction( l.pattern )) {
	    match = l.pattern( change );
	}
 
	if( match ) {
	    l.callback( change );
	}
    });
}

p.addPatternListener = function( pattern, callback ) {
    this._pattern_listeners_.push( { pattern: pattern, callback: callback } );
    return callback;
};

p.removePatternListener = function( callback ) {
    this._pattern_listeners_ = _.reject( this._pattern_listeners_, function(pl) {
	return pl.callback === callback
    });
};

p.options = function ( options ) {
    _.extend( this._options_, options );
};

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
        if( ! _.isUndefined( value ) ) {
            self.emit('change', { name: key, value: value, source: self._src_(key) , old_value: undefined } );
        }
        if( value instanceof Configuration ) {
            value._touch_();
        }
    });
};


p._get_source_ = function(source, default_source) {
    var src = source || default_source;
    if(src) {
	return src;
    }
    // If the source was not explicitly set, figure it out based on the caller...
    var stack = new Error().stack.split(/\n/);
    var caller = stack[3]; // 0 = error, 1 = set, 2 = whoever call set. Note that this
                           // meands that places where we delegate need to figure out
                           // the source at the delegation entry point.
    var match = caller.match(/^\s+at\s(.*)$/);
    return (match && match[1]) || "unknown" ;    
}

// Internal method for getting the source of a particular non-nested name
p._src_ = function(n) {
    return this._sources_[n] || this._source_;
    if(src) {
	return src;
    }
    // If the source was not explicitly set, figure it out based on the caller...
    var stack = new Error().stack.split(/\n/);
    var caller = stack[2]; // 0 = error, 1 = set, 2 = whoever call set. Note that this
                           // meands that places where we delegate need to figure out
                           // the source at the delegation entry point.
    var match = caller.match(/^\s+at\s(.*)$/);
    return match && match[1];
}

p.get = function(name) {
    var path = this.getPath(name);
    if( _.isUndefined(path)) {
        return undefined;	    
    }
    var n = path.shift();
    if( path.length === 0 ) {
        return this._values_[n];
    } else {
        var next = this._values_[n];
        if( typeof(next) == 'object' && ! _.isNull(next) && next instanceof Configuration ) {
            return next.get(path);            
        } else {
            return undefined;
        }
    }
};

p.getValSource = function(name) {
    var path = this.getPath(name);
    if( _.isUndefined(path)) {
        return undefined;	    
    }
    var n = path.shift();
    if( path.length === 0 ) {
        if( _.isUndefined( this._values_[n] ) )
            return undefined;
        else
            return { value: this._values_[n], source: this._src_(n) };
    } else {
        var next = this._values_[n];
        if( typeof(next) == 'object' && ! _.isNull(next) ) {
            return next.getValSource(path);            
        } else {
            return undefined;
        }
    }
};

p.remove = function(name) {
    var self = this;
    var path = this.getPath(name);
    if( _.isUndefined(path)) {
        return;	    
    }
    var n = path.shift();
    if(path.length === 0) {
        if( ! _.isUndefined(this._values_[n]) ) {
            var old_value = this._change_value_(n,undefined);
	    if( old_value instanceof Configuration ) {
		old_value.each( function(val,name,source) {
		    self.emit('change', {name: n+':'+name, value:undefined,  source: source, old_value: val } );
		});
	    } else {
		self.emit('change', {name:n, value:undefined, source: this._src_(n), old_value: old_value} );
	    }
	    delete this._values_[n];
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

// If we do surgery on a tree that includes configuration objects,
// we need to make sure to detach any listeners when we remove a node.
p._teardown_listeners_ = function(name) {
    var self = this;
    var listeners = this._listeners_[name];
    if( this._values_[name] && this._values_[name] instanceof Configuration ) {
	_.each( listeners, function( listener, event) {
	   self._values_[name].removeListener( event, listener );
	});
    }
};

// These are the listeners that make events propagate from node to parent
p._default_listeners_ = function(prefix) {
    var self = this;
    return { 
	change:   function(change) { self.emit('change', addPrefix(change,prefix) ); },
	delete:   function() {},
	ready:    function() { self.state('ready') },
	invalid:  function() { self.state('invalid') }
    };
}
 
// When we asign a value to a node, we need to make sure to 
// detatch the old listeners (if present), and hook up new listeners
// if needed. We dont want events going on while the surgury is being
// performes, and something else will take care of emitting the changes
// when they come. 
p._change_value_ = function(name,value) {
    this._teardown_listeners_(name);
    var old_value = this._values_[name];
    this._values_[name] = value;
    this._setup_listeners_(name);
    return old_value;
};

// Hook up listeners to child configurations
p._setup_listeners_ = function(name) {
    var self = this;
    if( this._values_[name] instanceof Configuration ) {
	this._listeners_[name] = this._listeners_[name] || this._default_listeners_(name+":");	
	var listeners = this._listeners_[name];
	_.each( listeners , function( listener, event ) {
	    self._values_[name].on(event,listener);
	});
    }
};

p.update = function(name, value, source) {
    // works like set, but without using the default source
    this.set(name,value, this._get_source_( source, undefined  ));
}

p.set = function(name,value,source) {
    var self = this;

    // Bulk assignment
    //if( _.isObject(name) && !_.isArray(name) && _.isUndefined(source )) {
//	source = this._get_source_( value, this._source_ );
//	_.each( name, function(n,v) {
//	    self.set( n,v, source );
//	} );
//	return;
//    } 

    var path = this.getPath(name);

    // do nothing if the path is not valid
    if( _.isUndefined(path)) {
        return;	    
    }
    
    // default source
    source = this._get_source_(source, this._source_);
        
    var n = path.shift();

    if( path.length === 0 ) {
	// we are at the end of the path
        if( _.isObject( value ) 
	    && !(value instanceof Configuration) 
	    && this._options_.destructure_assignments 
	    && ( !_.isArray(value) || this._options_.destructure_arrays )
	  ) {
	    // plain old object, break it apart
	    if( this._values_[n] ) {
		// remove values that are not present in the new value
		_.each( this._values_[n].flat_keys, function(key) {
                    if( !_.has(value, key) ) {
			self.remove([n,key]);
		    }
		});
	    }
	    // set the new value
            _.each( value, function(element, index) {
                self.set([n,index], element, source);
            });
	} else {
            var old_value = this._change_value_(n,value);
	    // clean up sources - if the change source is the same
	    // as the default source for this node, then revert to 
	    // the default. Otherwise, keep track of the source 
	    // precisely.
            if( source == this._source_ ) {
                delete this._sources_[n];
            } else {
                this._sources_[n] = source;
            }
	    // Hmm. This seems wrong for structures...
            var changed = old_value != value;
            if(changed) {
		this.emit('change', { name:n, value: value, source: source, old_value: old_value });
	    }
        } 
    } else {
	// We have not reached the end of the path we are going down. 
        var next = this._values_[n];
        if( next instanceof Configuration ) {
            next.set(path,value,source);            
        } else {
            this._change_value_( n, new Configuration( this._options_ ) );
	    this._sources_[n] = source;
            this._values_[n].set(path,value,source);
        }
    }
};

p.has = function( name ) {
    var self = this;
    var path = this.getPath(name);
    var n = path.shift();
    if( path.length === 0 ) {
	return _.has( self._values_, n );
    } else {
	var next = this._values_[n];
	return next instanceof Configuration && next.has( path );
    }
};

p.keys = function( callback ) {
    var keys = [];
    _.each( this._values_, function(element, index) {
        keys.push(index);
        if( element instanceof Configuration ) {
            var prefix = index + ":";
            _.each( element.keys(), function(element) {
		var key = prefix + element;
                keys.push(key);
            });
        }
    });
    return keys;
};

p.flat_keys = function() {
    var keys = [];
    return _.keys( this._values_ );
}

p.each = function( callback ) {
    var self = this;
    _.each( this.keys(), function(key) {
	var vs = self.getValSource(key);
        callback( vs.value, key, vs.source, self);
    });
};

p.isArrayLike  = function() {
    var arrayLike = true;
    this.flat_keys().map( function(x) { return(Number(x)); })
        .sort()
        .forEach( function(element,index) {
            arrayLike = arrayLike && (element===index);
        });
    return arrayLike;
};

//p.toObject = function() {
//    var result;
//    if( this.isArrayLike() ) {
//        result = [];
//        _.each( this._values_, function(element,index)  {
//            var val = element;
//            if( _.isObject(val) ) 
//                val = val.toObject();
//            result[ Number(index) ] = val;
//        });
//    } else {
//        result = {};
//        _.each( this._values_, function(element,index) {
//            var val = element;
//            if( _.isObject(val) ) 
//                val = val.toObject();
//            result[ index ] = val;
//        });
//    }
//    return result;
//};


p.report = function (indent) {
    var self = this;
    _.each( this.keys().sort(), function(key) {
        var valSource = self.getValSource(key);
        var value = valSource.value;
        if (value instanceof Configuration) { 
            value = '[Configuration]'; 
        } else if ( _.isString(value) ) { 
            value = "'" + value + "'"; 
        }
        console.log("%s=%s  --%s", key, value, valSource.source);
    });
};


p.patternListen = function( pattern, listener ) {
    this.on('change', function(change) {
        if( change.name.match( pattern ) ) {
	    listener(change);
	}	
    });
}

function arrayify( object ) {
    if( !_.isObject(object) || _.isArray(object) ) {
	return object;
    } else {
	var keys = _.keys(object).map( function(x) { return Number(x); } );
	keys.sort( function(a,b) { return a-b;});
	if( _.all( keys, function(element,index){ return element === index } ) ) {
	    var result = [];
	    _.each( keys, function(key) {
		result[key] = arrayify( object[key] );
            });
	    return result;
	} else {
	    var result = {};
	    _.each( object, function( val, key ) {
		result[key] = arrayify( val );
	    });
	    return result
	}	  
    }
}

p.toObject = function() {
    var result = {};
    var self = this;
    _.each( this.keys().sort() , function(key) {
	var path = self.getPath(key);
	var val = self.get(key);
	if( val instanceof Configuration ) {
	    val = {};
	}
	var res = result;
	var n;
	while( path.length > 1) {
	    n = path.shift();
	    res[n] = res[n] || {};
	    res = res[n];
	}
	n = path.shift();
	res[n] = val;
    });	
    return arrayify(result);
};
