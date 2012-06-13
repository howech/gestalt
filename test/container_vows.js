require('v8-profiler');
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


vows.describe("Gestalt Configuration Container Object").addBatch( {
    'config container object': {
            topic: new ConfigContainer({source: "config container basics"}),
            'should be an object':          function(config) { assert.instanceOf(config,ConfigContainer); },
            'should be a Container':        function(config) { assert.instanceOf(config,Configuration); },
            'should be an EventEmitter':    function(config) { assert.instanceOf(config,EventEmitter); },
            'should have a get method':     function(config) { assert.isFunction( config.get ); },
            'should have a set method':     function(config) { assert.isFunction( config.set ); },
            'should have a remove method':  function(config) { assert.isFunction( config.remove ); },
            'should return undefined for a new value': 
                function(config) { assert.isUndefined( config.get('non existant value') ); },
            'shoule return undefined for a new path':
                function(config) { assert.isUndefined( config.get('non:existant:path') ); },
            'should populate new values when set': 
                function(config) {
                    var name = "new name";
                    var value = "my value";
                    var value2 = "second";
                    config.set(name, value);                
                    assert.equal( config.get(name), value );
                    config.set(name, value2);                
                    assert.equal( config.get(name), value2 );
                },
            'should populate new paths when set': 
                function(config) {
                    var path = "a:long:path:name";
                    var value = "aasdfWdRC";
                    config.set(path, value);
                    assert.equal( config.get(path), value );
                },
            'should allow removal of settings':
                function(config) {
                    config.set("doomed","xxx");
                    config.set("youre:gonna:die","zzz");
                    config.remove("doomed");
                    config.remove("youre:gonna");
                    assert.isUndefined( config.get("doomed") );
                    assert.isUndefined( config.get("youre:gonna:die") );
                },
            'should destructure values when set':
                function(config) {
                    config.set("structured", { a: "a", b: "b", c: [1,2,3], d: {e: "f"} });
                    assert.equal( config.get("structured:a") , "a" );
                    assert.equal( config.get("structured:b") , "b" );                    
                    assert.equal( config.get("structured:c:0") , 1 );
                    assert.equal( config.get("structured:c:1") , 2 );
                    assert.equal( config.get("structured:c:2") , 3 );
                    assert.equal( config.get("structured:d:e") , "f" );
                }//,
     //       'can be converted to a plain object':
     //           function(config) {
     //               var objVal = { a: "a", b: "b", c: [1,2,3], d: {e: "f"} };
//		    config.set('a','a');/
//		    config.set('b','b');
//		    config.set('c',[1,2,3]);
//		    config.set('d', {e:'f'} );
//
 //                  // config.set( { a: "a", b: "b", c: [1,2,3], d: {e: "f"} });
//                   // var objConfig = config.get("object");
//                   // var obj = objConfig.toObject();
//		    var obj = config.toObject();
//                    assert.deepEqual( obj, objVal );
//                }
        },
    'configuration keys and each': {
        topic: function() {
            var config = new Configuration();
            config.set("a", { b: '1', c: '2'} );
            config.set("e", [ "f", "g", {h: 'i'} ] );
            return config;            
        },
        'has keys': function(config) { 
            assert.deepEqual( config.keys().sort(), ['a','a:b','a:c', 'e', 'e:0', 'e:1', 'e:2', 'e:2:h' ] ) ;
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
    'overrides and defaults basics': {
        "values without paths": {
            topic: function() {
                var override = new Configuration({source: 'override'});
                var config = new Configuration({source: 'config'});
                var defaults = new Configuration({source: 'default'});
                var container = new ConfigContainer( {source: 'container', config: config} );
                container.addOverride( override );
                container.addDefault( defaults );
                
                override.set( "a" , "override" );
                override.set( "b", "override" );
                override.set("f", "override" );
                config.set( "a", "masked");
                config.set( "c", "normal");
                defaults.set("b", "masked");
                defaults.set("c", "masked");
                defaults.set("d","default");
                container.set("e", "container");
                container.set("f", "masked");
    
                return container;
            },
            'internal structure of container': function(container) {
                assert.lengthOf( container._contents_, 3 );
            },
            'overrides take precedence, defaults fill in gaps': function(container) {
                assert.equal( container.get("a"), "override" );
                assert.equal( container.get("b"), "override" );
                assert.equal( container.get("c"), "normal" );
                assert.equal( container.get("d"), "default" );
                assert.equal( container.get("e"), "container" );
                assert.equal( container.get("f"), "override" );
            },
            //'report': function(container) {
            //    container.report();
            //    assert.equal(1,1);
            //}
        },
        "values with paths": {
            topic: function() {
                var override = new Configuration({source: 'override'});
                var config = new Configuration({source: 'config'});
                var defaults = new Configuration({source: 'default'});
                var container = new ConfigContainer( { source: 'container', config: config} );
                container.addOverride( override );
                container.addDefault( defaults );
                container.set("a:b",1);
                override.set("a:a",2);
                defaults.set("a:c",3);
                return container;
            },
            'things work with paths, too': function(container) {
                assert.equal( container.get("a:a") , 2);
                assert.equal( container.get("a:b"), 1);
                assert.equal( container.get("a:c"), 3);
            },
            //'report': function(container) {
            //    container.report();
            //    assert.equal(1,1);
            //}
        },
        "config container change events": {
            topic: function() {
                var container_changes = [];
                var override_changes  = [];
                var config_changes    = [];
                var defaults_changes  = [];
                
                var override = new Configuration({ source: 'override'});
                var config = new Configuration({source: 'config'});
                var defaults = new Configuration({source: 'default'});
                var container = new ConfigContainer( {source: 'container', config: config} );
                
                override.on('change',  function(change) { override_changes.push( change );  } );
                config.on('change',    function(change) { config_changes.push( change );    } );
                defaults.on('change',  function(change) { defaults_changes.push( change );  } );
                container.on('change', function(change) { container_changes.push( change ); } );

                container.addOverride( override );
                container.addDefault( defaults );

                defaults.set("a", "default");
                container.set("a", "container");
                override.set("a", "override");
                
                defaults.set("b", "default");
                override.set("b", "override");
                container.set("b", "container");

                container.set("c", "container");
                defaults.set("c", "default");
                override.set("c", "override");

                container.set("d", "container");
                defaults.set("d", "default");
                override.set("d", "override");

                override.set("e", "override");
                defaults.set("e", "default");
                container.set("e", "container");

                override.set("f", "override");
                container.set("f", "container");
                defaults.set("f", "default");                
                
                return  { 
                    container: container_changes,
                    override: override_changes,
                    config: config_changes,
                    defaults: defaults_changes
                };
            },
            'change lengths': function( changes ) {
                assert.lengthOf( changes.defaults, 6 );
                assert.lengthOf( changes.config, 6);
                assert.lengthOf( changes.override, 6);
                assert.lengthOf( changes.container,11); 
            }
        },
        "more config container change events": {
            topic: function() {
                var changes = [];
                
                var override = new Configuration({source: 'override'});
                var defaults = new Configuration({source: 'default'});
                var container = new ConfigContainer({source: 'container'});
                
                container.on('change', function(change) { changes.push( change ); } );

                container.addOverride( override );
                container.addDefault( defaults );

                defaults.set("a",  1); // change 0
                container.set("a", 2); // change 1
                override.set("a",  3); // change 2
                
		container.set("a", 4); // no change
		defaults.set("a", 5);  // no change
		container.remove("a"); // no change
		override.remove("a");  // change 3

                return  changes;
            },
            'changes': function( changes ) {
		assert.deepEqual( changes, 
		 [ {name:"a", value: 1, old_value: undefined, source:"default" },
		   {name:"a", value: 2, old_value: 1, source:"container" },
		   {name:"a", value: 3, old_value: 2, source:"override" },
		   {name:"a", value: 5, old_value: 3, source:"override" }
		 ]); 
            }
        }                                        
    },
    "State Change": {
	topic: function() {
	    var states = [];
	    var orig = new ConfigContainer();
	    var config = new ConfigContainer({config: orig})
	        .on('state', function(state) { states.push(state); } );
	    var def = new Configuration();
	    var over = new Configuration();
	    config.addDefault(def);
	    config.addOverride(over);

	    def.state('invalid', 'test1'); 
	    over.state('invalid', 'test2');
	    orig.state('unknown', 'test3');
	    orig.state('ready', 'doesnt propagate');
	    def.state('ready', 'doesnt propagate');
	    over.state('ready', 'test4');
	    return states;
	}, 
	"4 state changes": function(states) {
	    assert.equal( states.length, 4 );
	    assert.deepEqual( _.pluck(states,'state'),
			      ['invalid','invalid','invalid', 'ready'] );
	    assert.deepEqual( _.pluck(states,'data'),
			      ['test1','test2','test3','test4' ] );
	}
    },
    "Initial State": {
	topic: function() {
	    var states = [];
	    var orig = new ConfigContainer();
	    orig.state('not ready');

	    var config = new ConfigContainer({config: orig});
	    states.push( config.state() );

	    var def = new Configuration();
	    def.state('invalid')
	    
	    var over = new Configuration();
	    over.state('unknown');

	    config.addDefault(def);
	    states.push( config.state() );

	    config.addOverride(over);
	    states.push( config.state() );

	    return states;
	}, 
	"states": function(states) {
	    assert.deepEqual( states,
			      ['ready','invalid','invalid'] );
	}
    }


}).export(module);


