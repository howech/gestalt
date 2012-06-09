var vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore'),
    util = require('util');

var gestalt         = require('../lib/gestalt'),
    Configuration   = gestalt.Configuration,
    ConfigContainer = gestalt.ConfigContainer,
    ConfigFile      = gestalt.ConfigFile,
    RemapConfig     = gestalt.RemapConfig;

exports.configuration = vows.describe('gestalt configurtion objects');


vows.describe("Gestalt Configuration Remap Object").addBatch( {
    'basic remapped configuration object': {
            topic: function() {
		var config = new Configuration({source: "basic config object"});
		var mapper = function(old_name) {
		    return {a:'e:f', b:'e:g', b:'d'}[old_name];
		};
		var remap = new RemapConfig({mapper: mapper, original: config});
		return remap;
	    },
            'should be an object':          function(config) { assert.instanceOf(config,Configuration); },
            'should be a remapper':         function(config) { assert.instanceOf(config,RemapConfig); },
            'should be an EventEmitter':    function(config) { assert.instanceOf(config,EventEmitter); },
            'should have a get method':     function(config) { assert.isFunction( config.get ); },
            'should have a set method':     function(config) { assert.isFunction( config.set ); },
            'should have a remove method':  function(config) { assert.isFunction( config.remove ); },
            'should return undefined for a new value': 
                function(config) { assert.isUndefined( config.get('non existant value') ); },
            'should return undefined for a new path':
                function(config) { assert.isUndefined( config.get('non:existant:path') ); },
        },
    'configuration keys and each': {
        topic: function() {
	    var config = new Configuration({source: "basic config object"});
	    var mapper = function(old_name) {
		return {a:'e:f', b:'e:g', c:'d'}[old_name];
	    };
	    var remap = new RemapConfig({mapper: mapper, original: config});
	    config.set("a", 1);
	    config.set("b", 2);
	    config.set("c", 3);

	    return remap;
        },
        'has keys': function(config) { 
            assert.deepEqual( config.keys().sort(), ['d','e:f','e:g'  ] ) ;
        },
        'each works': function(config) {
            var keys = config.keys();
            var each_keys = [];
            
            config.each( function(element, key, source, cfg) {
                each_keys.push(key);
                assert.equal( element, cfg.get(key) );
            });
            
            assert.deepEqual( keys.sort(), each_keys.sort() );
        }
    },
    'mapped config read only': {
        topic: function() {
	    var config = new Configuration({source: "basic config object"});
	    var mapper = function(old_name) {
		return {a:'e:f', b:'e:g', c:'d'}[old_name];
	    };
	    var remap = new RemapConfig({mapper: mapper, original: config});
	    config.set("a", 1);
	    config.set("b", 2);
	    config.set("c", 3);
	    remap.set("d", 0);
	    remap.set("e:f", 0);
	    remap.set(["e","g"],0);
	    return remap;
        },
        'writes were not effective': function(remap) { 
	    assert.equal( remap.get("d"), 3 );
	    assert.equal( remap.get("e:f"), 1);
	    assert.equal( remap.get("e:g"), 2);
        },
    },

    'Configuration events': {
        "set behavior on original": {
            topic: function() {
		var config = new Configuration({source: "basic config object"});
		var mapper = function(old_name) {
		    return {a:'e:f', b:'e:g', c:'d'}[old_name];
		};
		var remap = new RemapConfig({mapper: mapper, original: config});
		var changes = [];
                remap.on('change', function( change ) {
                    changes.push( change );
                });
		config.set("a", 1, "A");
		config.set("b", 2, "B");
		config.set("c", 3, "C");
		config.set("c", 3, "C");
		config.set("a", 4, "D");
		return changes;
            },
            "emits a 'change' when changed":      function(changes) { assert.lengthOf(changes, 4);
                                                                      assert.isObject(changes[0]);
                                                                      assert.isObject(changes[1]);
								      assert.isObject(changes[2]);
								      assert.isObject(changes[3]);
								    },
            "identifies mapped name of change":   function(changes) { assert.equal( changes[0].name, "e:f" );
                                                                      assert.equal( changes[1].name, "e:g" ); 
                                                                      assert.equal( changes[2].name, "d" ); 
                                                                      assert.equal( changes[3].name, "e:f" ); 
								    },
            "identifies new value":               function(changes) { assert.equal( changes[0].value, "1" );  
                                                                      assert.equal( changes[1].value, "2" ); 
                                                                      assert.equal( changes[2].value, "3" ); 
                                                                      assert.equal( changes[3].value, "4" ); 
								    },
            "identifies the source":              function(changes) { assert.equal( changes[0].source, "A" );
                                                                      assert.equal( changes[1].source, "B");
                                                                      assert.equal( changes[2].source, "C"); 
                                                                      assert.equal( changes[3].source, "D"); 
								    },
            "identifies the old value":           function(changes) { assert.isUndefined( changes[0].old_value );
								      assert.isUndefined( changes[1].old_value );
								      assert.isUndefined( changes[2].old_value );
                                                                      assert.equal( changes[3].old_value, changes[0].value);
								    }
        },
        "structured remap": {
            topic: function() {
		var config = new Configuration({source: "basic config object"});
		var mapper = function(old_name) {
		    var m;
		    if( m = old_name.match(/^a((:.*)?)$/)) {
			return "b"+m[1];
		    } else if( m = old_name.match(/^b((:.*)?)$/)) {
			return "a"+m[1];
		    }
		    return undefined;
		};
		var remap = new RemapConfig({mapper: mapper, original: config});
		var changes = [];
                remap.on('change', function( change ) {
                    changes.push( change );
                });
		config.set("a:b", 1, "A");
		config.set("b:a", 2, "B");
		return changes;
            },
            "emits a 'change' when changed":      function(changes) { assert.lengthOf(changes, 2);
                                                                      assert.isObject(changes[0]);
                                                                      assert.isObject(changes[1]);
								    },
            "identifies mapped name of change":   function(changes) { assert.equal( changes[0].name, "b:b" );
                                                                      assert.equal( changes[1].name, "a:a" ); 
								    },
            "identifies new value":               function(changes) { assert.equal( changes[0].value, "1" );  
                                                                      assert.equal( changes[1].value, "2" ); 
								    },
            "identifies the source":              function(changes) { assert.equal( changes[0].source, "A" );
                                                                      assert.equal( changes[1].source, "B");
								    }
        },
        "structured remap": {
            topic: function() {
		var config = new Configuration({source: "basic config object"});
		var mapper = function(old_name) {
		    var m;
		    if( m = old_name.match(/^a((:.*)?)$/)) {
			return "b"+m[1];
		    } else if( m = old_name.match(/^b((:.*)?)$/)) {
			return "a"+m[1];
		    }
		    return undefined;
		};
		var remap = new RemapConfig({mapper: mapper, original: config});
		var changes = [];
                remap.on('change', function( change ) {
                    changes.push( change );
                });
		config.set("a:b", 1, "A");
		config.set("b:a", 2, "B");
		return remap;
            },
	    'keys': function(remap) {
		var keys = remap.keys().sort();
		assert.deepEqual( keys, [ "a", "a:a", "b", "b:b" ]);
	    },
	    'toObject': function(remap) {
		var obj = remap.toObject();
		assert.deepEqual( obj, { a: {a:2}, b: {b:1} } );
	    }
	}
    },
    "State Change": {
	topic: function() {
	    var states = [];
	    var config = new Configuration({source: "basic config object"});
	    var mapper = function(old_name) {
		return {a:'e:f', b:'e:g', c:'d'}[old_name];
	    };
	    var remap = new RemapConfig({mapper: mapper, original: config});
	    remap.on('state', function(state) {states.push(state);} );
	    config.state('invalid', 'test1');
	    config.state('invalid', 'test2'); 
	    config.state('weird', 'test3');
	    config.state('weird', 'doesnt propagate');
	    config.state('ready', 'test4');
	    return states;
	}, 
	"4 state changes": function(states) {
	    assert.equal( states.length, 4 );
	    assert.deepEqual( _.pluck(states,'state'),
			      ['invalid','invalid','weird','ready'] );
	    assert.deepEqual( _.pluck(states,'data'),
			      ['test1','test2','test3','test4' ] );
	}
    }

}).export(module);


//exports.configuration.run();