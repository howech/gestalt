var vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore'),
    util = require('util');

var gestalt         = require('../lib/gestalt'),
    Configuration   = gestalt.Configuration;

vows.describe('gestalt configurtion objects').addBatch({
    'basic config object interface': {
        topic: new Configuration({source: "config object basics"}),
        'should be an object':           function(config) { assert.instanceOf(config,Configuration); },
        'should be an EventEmitter':     function(config) { assert.instanceOf(config,EventEmitter); },
        'should have a get method':      function(config) { assert.isFunction( config.get ); },
        'should have a getValSource method': function(config) { assert.isFunction( config.getValSource ); },
        'should have a set method':      function(config) { assert.isFunction( config.set ); },
	'should have an update method':  function(config) { assert.isFunction( config.update ); },
	'should have a has method':      function(config) { assert.isFunction( config.has ); },
	'should have an each method':    function(config) { assert.isFunction( config.each ); },
	'should have a keys method':     function(config) { assert.isFunction( config.keys ); },
        'should have a remove method':   function(config) { assert.isFunction( config.remove ); },
	'should have a report method':   function(config) { assert.isFunction( config.report ); },
	'should have a toObject method': function(config) { assert.isFunction( config.toObject ); }
         },
    'get, set, update, remove behavior': {
	topic: new Configuration({source: "default"}),
	"get on new names returns undefined": function(config) {
	    assert.isUndefined( config.get('a') );
	    assert.isUndefined( config.get('a:b') );
	    // assert.isUndefined( config.get( {} ) ); // what should get do with an object as a key?
	    // assert.isUndefined( config.get( [] ) );
	    assert.isUndefined( config.get( ['a','b','c'] ) );
	    // assert.isUndefined( config.get( function() {} ) );
	    assert.isUndefined( config.get( undefined ) );
	},
	"set writes new values into config": function(config) {
	    config.set("b",1);
	    config.set("c:a",2);
	    config.set("d",3,"source");
	    config.set("c:b",4,"source");
	    assert.equal( config.get("b"),   1);
	    assert.equal( config.get("c:a"), 2);
	    assert.equal( config.get("d"),   3);
	    assert.equal( config.get("c:b"), 4);
	    assert.equal( config.getValSource("b").value,   1);
	    assert.equal( config.getValSource("c:a").value, 2);
	    assert.equal( config.getValSource("d").value,   3);
	    assert.equal( config.getValSource("c:b").value, 4);
	    assert.equal( config.getValSource("b").source,   "default");
	    assert.equal( config.getValSource("c:a").source, "default");
	    assert.equal( config.getValSource("d").source,   "source");
	    assert.equal( config.getValSource("c:b").source, "source"); 
	    config.set("b",1,"new source");
	    assert.equal( config.getValSource("b").source,   "new source");
	    config.set("b",2,"new source");
	    assert.equal( config.getValSource("b").source,   "new source");
	    config.set("b",2);
	    assert.equal( config.getValSource("b").source,   "default");
	    config.set("b",1);
	    assert.equal( config.getValSource("b").source,   "default");
	},
	"update writes new values into config": function(config) {
	    config.update("e",1);
	    config.update("f:a",2);
	    config.update("g",3,"source");
	    config.update("f:b",4,"source");
	    assert.equal( config.get("e"),   1);
	    assert.equal( config.get("f:a"), 2);
	    assert.equal( config.get("g"),   3);
	    assert.equal( config.get("f:b"), 4);
	    assert.equal( config.getValSource("e").value,   1);
	    assert.equal( config.getValSource("f:a").value, 2);
	    assert.equal( config.getValSource("g").value,   3);
	    assert.equal( config.getValSource("f:b").value, 4);
	    assert.equal( config.getValSource("e").source,   "default");
	    assert.equal( config.getValSource("f:a").source, "default");
	    assert.equal( config.getValSource("g").source,   "source");
	    assert.equal( config.getValSource("f:b").source, "source"); 
	    config.update("e",1,"new source");
	    assert.equal( config.getValSource("e").source,   "new source");
	    config.update("e",2,"new source");
	    assert.equal( config.getValSource("e").source,   "new source");
	    config.update("e",2);
	    assert.equal( config.getValSource("e").source,   "default");
	    config.update("e",1);
	    assert.equal( config.getValSource("e").source,   "default");
	},
	"remove": function(config) {
	    config.set("zzz",123);
	    config.set("zz:z",123);
	    config.set("z:z:z", 123);
	    config.remove("zzz");
	    config.remove("zz:z");
	    config.remove("z:z");
	    assert.isUndefined( config.get("zzz") );
	    assert.isUndefined( config.get("zz:z") );
	    assert.isUndefined( config.get("z:z") );
	},
	"destructure values when set": function(config) {
            config.set("structured", { a: "a", b: "b", c: [1,2,3], d: {e: "f"} });
            assert.equal( config.get("structured:a") , "a" );
            assert.equal( config.get("structured:b") , "b" );                    
            assert.equal( config.get("structured:c:0") , 1 );
            assert.equal( config.get("structured:c:1") , 2 );
            assert.equal( config.get("structured:c:2") , 3 );
            assert.equal( config.get("structured:d:e") , "f" );
	},
	'can be converted to a plain object': function(config) {
            var objVal = { a: "a", b: "b", c: [1,2,3], d: {e: "f"} };
            config.set("object", { a: "a", b: "b", c: [1,2,3], d: {e: "f"} });
            var objConfig = config.get("object");
            var obj = objConfig.toObject();
            assert.deepEqual( obj, objVal );
	}
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
            
            config.each( function(element, key, cfg) {
                each_keys.push(key);
                assert.equal( element, cfg.get(key) );
            });
            
            assert.deepEqual( keys, each_keys );
        }
    }
}).run();

//     'configuration keys and each': {
//         topic: function() {
//             var config = new Configuration();
//             config.set("a", { b: '1', c: '2'} );
//             config.set("e", [ "f", "g", {h: 'i'} ] );
//             return config;            
//         },
//         'has keys': function(config) { 
//             assert.deepEqual( config.keys().sort(), ['a','a:b','a:c', 'e', 'e:0', 'e:1', 'e:2', 'e:2:h' ] ) ;
//         },
//         'each works': function(config) {
//             var keys = config.keys();
//             var each_keys = [];
            
//             config.each( function(element, key, cfg) {
//                 each_keys.push(key);
//                 assert.equal( element, cfg.get(key) );
//             });
            
//             assert.deepEqual( keys.sort(), each_keys.sort() );
//         }
//     },
//     'Configuration events': {
//         "first change": {
//             topic: function() {
//                 var promise = new EventEmitter();
//                 var changes = [];
//                 var config = new Configuration({source: "Configuration Emitter"});
//                 config.on('change', function( change ) {
//                     changes.push( change );
//                     if(changes.length == 2)
//                         promise.emit('success', changes);
//                 });
//                 config.set("name_n", "value_v", "source_s");
//                 config.set("name_n", "value_xxx" );
//                 return promise;
//             },
//             "emits a 'change' when changed":      function(changes) { assert.lengthOf(changes, 2);
//                                                                       assert.isObject(changes[0]);
//                                                                       assert.isObject(changes[1]); },
//             "identifies name of changed value":   function(changes) { assert.equal( changes[0].name, "name_n" );
//                                                                       assert.equal( changes[1].name, "name_n" ); },
//             "identifies new value":               function(changes) { assert.equal( changes[0].value, "value_v" );  
//                                                                       assert.equal( changes[1].value, "value_xxx"); },
//             "identifies the source":              function(changes) { assert.equal( changes[0].source, "source_s" );
//                                                                       assert.equal( changes[1].source, "Configuration Emitter"); },
//             "identifies the old value":           function(changes) { assert.isUndefined( changes[0].old_value );
//                                                                       assert.equal( changes[1].old_value, changes[0].value); }
//         },
//         "second change": {
//             topic: function() {
//                 var promise = new EventEmitter();
//                 var changes = [];
//                 var config = new Configuration({source: "Configuration Emitter"});
//                 config.on('change', function(change ) {
//                     changes.push(change);
//                 });
//                 config.set("name_n", "value_v", "source_s");
//                 config.set("name_n", "value_v", "source_s");
//                 config.set("name_n", "value_v", "some other source");
//                 promise.emit( 'success', changes );
//                 return promise;
//             },
//             "should only emit one change":   function( changes ) { assert.lengthOf( changes, 1 ) }
//         },
//         "changes to structured configs": {
//             topic: function() {
//                 var changes = [];
//                 var config = new Configuration({source: "Emit"});
//                 config.on('change', function( change ) { changes.push(change); });
//                 config.set("path:to:somewhere:a", "a_value");  // change 0
//                 config.set("path:to:nowhere:x", "a_value");  // change 1
//                 config.set("path:to:nowhere:y", "a_value");  // change 2               
//                 config.set("path:to:somewhere:a", "b_value");  // change 3
//                 var lop1 = config.get("path:to:nowhere");
//                 var lop2 = config.get("path:to:somewhere");
                
//                 config.set("path:to:somewhere", "xxx" );     // change 4
//                 config.remove("path:to:nowhere");            // change 5 and 6
                
//                 lop2.set("a", "qqq"); // not a change
//                 lop1.set("x", "zzz"); // not a change
                                
//                 config.set("q", lop2); // change 7
//                 config.set("r", lop2); // change 8
//                 config.set("s", lop1); // change 9
                
//                 config.set("q:a", "qrqr" ); // changes 11 and 10
//                 return changes;
//             },
//             "change for path:to:somewhere:a": function( changes ) { 
//                 assert.deepEqual( changes[0], { name: "path:to:somewhere:a", value: "a_value", source: "Emit", old_value: undefined } );
//             },
//             "change for path:to:nowhere:x": function( changes ) { 
//                 assert.deepEqual( changes[1], { name: "path:to:nowhere:x", value: "a_value", source: "Emit", old_value: undefined } );
//             },
//             "change for path:to:nowhere:y": function( changes ) { 
//                 assert.deepEqual( changes[2], { name: "path:to:nowhere:y", value: "a_value", source: "Emit", old_value: undefined } );
//             },
//             "change for path:to:somewhere:a (second)": function( changes ) { 
//                 assert.deepEqual( changes[3], { name: "path:to:somewhere:a", value: "b_value", source: "Emit", old_value: "a_value" } );
//             },
//             "change for path:to:somewhere )": function( changes ) {
//                 assert.equal( changes[4].name, "path:to:somewhere" );
//                 assert.equal( changes[4].value, "xxx");
//                 assert.equal( changes[4].source, "Emit");
//                 assert.instanceOf( changes[4].old_value, Configuration );
//             },
//             //"change due to implicit removal of path:to:somewhere:a": function( changes ) {
//             //    assert.equal( changes[5].name, "path:to:somewhere:a" );
//             //    assert.isUndefined( changes[5].value );
//             //    assert.instanceOf( changes[5].old_value, Configuration );
//             //},
//             "change removal of path:to:nowhere": function( changes ) { 
//                 assert.isUndefined( changes[5].value );
//                 assert.equal( changes[5].name, "path:to:nowhere:x" );
//                 assert.isUndefined( changes[6].value );
//                 assert.equal( changes[6].name, "path:to:nowhere:y" );
//             },
//             "add lop2 back to tree twice": function(changes) {
//                 assert.equal( changes[7].name, "q" );
//                 assert.equal( changes[8].name, "r" );
//                 assert.isUndefined( changes[7].old_value );
//                 assert.isUndefined( changes[8].old_value );
//                 assert.equal( changes[7].value, changes[8].value );
//             },
//             "add lop1 back to tree": function(changes) {
//                 assert.equal( changes[9].name, "s" );
//                 assert.isUndefined( changes[9].old_value );
//             },
//             "change in lop2 now generates two changes in treee": function(changes) {
//                 assert.equal( changes[10].value, changes[11].value );
//                 assert.deepEqual( [ changes[10].name, changes[11].name].sort(), ["q:a", "r:a" ] );
//             },
//             "thats all folks": function(changes) { assert.lengthOf( changes, 12 ); }
//         },
//         "_touch_ structured configs": {
//             topic: function() {
//                 var changes = [];
//                 var config = new Configuration({source: "_touch_"});
//                 config.set("path:to:somewhere:a", "a_value");  
//                 config.set("path:to:nowhere:x", "a_value");    
//                 config.set("path:to:nowhere:y", "a_value");    
//                 config.set("path:to:somewhere:a", "b_value");  
//                 config.on('change', function( change ) { changes.push(change); });
//                 config._touch_();
//                 return { config: config, changes: changes };
//             },
//             'there is a change for every key':  function(topic) {
//                 var change_keys = _.map( topic.changes, function( change ) { return change.name; } );
//                 assert.lengthOf( topic.changes, topic.config.keys().length );
//                 assert.deepEqual( change_keys.sort(), topic.config.keys().sort() );
//             },
//             'every change value agrees with config': function(topic) {
//                 _.each( topic.changes, function(change) { assert.equal(change.value, topic.config.get(change.name) );} );
//             }
//         }
//     }
// }).export(module);

// exports.configuration.addBatch( {
//     'config container object': {
//             topic: new ConfigContainer({source: "config container basics"}),
//             'should be an object':          function(config) { assert.instanceOf(config,ConfigContainer); },
//             'should be a Container':        function(config) { assert.instanceOf(config,Configuration); },
//             'should be an EventEmitter':    function(config) { assert.instanceOf(config,EventEmitter); },
//             'should have a get method':     function(config) { assert.isFunction( config.get ); },
//             'should have a set method':     function(config) { assert.isFunction( config.set ); },
//             'should have a remove method':  function(config) { assert.isFunction( config.remove ); },
//             'should return undefined for a new value': 
//                 function(config) { assert.isUndefined( config.get('non existant value') ); },
//             'shoule return undefined for a new path':
//                 function(config) { assert.isUndefined( config.get('non:existant:path') ); },
//             'should populate new values when set': 
//                 function(config) {
//                     var name = "new name";
//                     var value = "my value";
//                     var value2 = "second";
//                     config.set(name, value);                
//                     assert.equal( config.get(name), value );
//                     config.set(name, value2);                
//                     assert.equal( config.get(name), value2 );
//                 },
//             'should break apart colon separated paths':
//                 function(config) {
//                     var path = config.getPath("a:b:c:d");
//                     assert.isArray( path );
//                     assert.equal(path.length, 4);
//                     assert.equal(path[0], "a");
//                     assert.equal(path[1], "b");
//                     assert.equal(path[2], "c");
//                     assert.equal(path[3], "d");
//                 },
//             'should populate new paths when set': 
//                 function(config) {
//                     var path = "a:long:path:name";
//                     var value = "aasdfWdRC";
//                     config.set(path, value);
//                     assert.equal( config.get(path), value );
//                 },
//             'should allow removal of settings':
//                 function(config) {
//                     config.set("doomed","xxx");
//                     config.set("youre:gonna:die","zzz");
//                     config.remove("doomed");
//                     config.remove("youre:gonna");
//                     assert.isUndefined( config.get("doomed") );
//                     assert.isUndefined( config.get("youre:gonna:die") );
//                 },
//             'should destructure values when set':
//                 function(config) {
//                     config.set("structured", { a: "a", b: "b", c: [1,2,3], d: {e: "f"} });
//                     assert.equal( config.get("structured:a") , "a" );
//                     assert.equal( config.get("structured:b") , "b" );                    
//                     assert.equal( config.get("structured:c:0") , 1 );
//                     assert.equal( config.get("structured:c:1") , 2 );
//                     assert.equal( config.get("structured:c:2") , 3 );
//                     assert.equal( config.get("structured:d:e") , "f" );
//                 },
//             'can be converted to a plain object':
//                 function(config) {
//                     var objVal = { a: "a", b: "b", c: [1,2,3], d: {e: "f"} };
//                     config.set("object", { a: "a", b: "b", c: [1,2,3], d: {e: "f"} });
//                     var objConfig = config.get("object");
//                     var obj = objConfig.toObject();
//                     assert.deepEqual( obj, objVal );
//                 }
//         },
//     'configuration keys and each': {
//         topic: function() {
//             var config = new Configuration();
//             config.set("a", { b: '1', c: '2'} );
//             config.set("e", [ "f", "g", {h: 'i'} ] );
//             return config;            
//         },
//         'has keys': function(config) { 
//             assert.deepEqual( config.keys().sort(), ['a','a:b','a:c', 'e', 'e:0', 'e:1', 'e:2', 'e:2:h' ] ) ;
//         },
//         'each works': function(config) {
//             var keys = config.keys();
//             var each_keys = [];
            
//             config.each( function(element, key, cfg) {
//                 each_keys.push(key);
//                 assert.equal( element, cfg.get(key) );
//             });
            
//             assert.deepEqual( keys.sort(), each_keys.sort() );
//         }
//     },
//     'overrides and defaults basics': {
//         "values without paths": {
//             topic: function() {
//                 var override = new Configuration({source: 'override'});
//                 var config = new Configuration({source: 'config'});
//                 var defaults = new Configuration({source: 'default'});
//                 var container = new ConfigContainer( {source: 'container', config: config} );
//                 container.addOverride( override );
//                 container.addDefault( defaults );
                
//                 override.set( "a" , "override" );
//                 override.set( "b", "override" );
//                 override.set("f", "override" );
//                 config.set( "a", "masked");
//                 config.set( "c", "normal");
//                 defaults.set("b", "masked");
//                 defaults.set("c", "masked");
//                 defaults.set("d","default");
//                 container.set("e", "container");
//                 container.set("f", "masked");
    
//                 return container;
//             },
//             'internal structure of container': function(container) {
//                 assert.lengthOf( container._contents_, 3 );
//             },
//             'overrides take precedence, defaults fill in gaps': function(container) {
//                 assert.equal( container.get("a"), "override" );
//                 assert.equal( container.get("b"), "override" );
//                 assert.equal( container.get("c"), "normal" );
//                 assert.equal( container.get("d"), "default" );
//                 assert.equal( container.get("e"), "container" );
//                 assert.equal( container.get("f"), "override" );
//             },
//             //'report': function(container) {
//             //    container.report();
//             //    assert.equal(1,1);
//             //}
//         },
//         "values with paths": {
//             topic: function() {
//                 var override = new Configuration({source: 'override'});
//                 var config = new Configuration({source: 'config'});
//                 var defaults = new Configuration({source: 'default'});
//                 var container = new ConfigContainer( { source: 'container', config: config} );
//                 container.addOverride( override );
//                 container.addDefault( defaults );
//                 container.set("a:b",1);
//                 override.set("a:a",2);
//                 defaults.set("a:c",3);
//                 return container;
//             },
//             'things work with paths, too': function(container) {
//                 assert.equal( container.get("a:a") , 2);
//                 assert.equal( container.get("a:b"), 1);
//                 assert.equal( container.get("a:c"), 3);
//             },
//             //'report': function(container) {
//             //    container.report();
//             //    assert.equal(1,1);
//             //}
//         },
//         "config container change events": {
//             topic: function() {
//                 var container_changes = [];
//                 var override_changes  = [];
//                 var config_changes    = [];
//                 var defaults_changes  = [];
                
//                 var override = new Configuration({ source: 'override'});
//                 var config = new Configuration({source: 'config'});
//                 var defaults = new Configuration({source: 'default'});
//                 var container = new ConfigContainer( {source: 'container', config: config} );
                
//                 override.on('change',  function(change) { override_changes.push( change );  } );
//                 config.on('change',    function(change) { config_changes.push( change );    } );
//                 defaults.on('change',  function(change) { defaults_changes.push( change );  } );
//                 container.on('change', function(change) { container_changes.push( change ); } );

//                 container.addOverride( override );
//                 container.addDefault( defaults );

//                 defaults.set("a", "default");
//                 container.set("a", "container");
//                 override.set("a", "override");
                
//                 defaults.set("b", "default");
//                 override.set("b", "override");
//                 container.set("b", "container");

//                 container.set("c", "container");
//                 defaults.set("c", "default");
//                 override.set("c", "override");

//                 container.set("d", "container");
//                 defaults.set("d", "default");
//                 override.set("d", "override");

//                 override.set("e", "override");
//                 defaults.set("e", "default");
//                 container.set("e", "container");

//                 override.set("f", "override");
//                 container.set("f", "container");
//                 defaults.set("f", "default");                
                
//                 return  { 
//                     container: container_changes,
//                     override: override_changes,
//                     config: config_changes,
//                     defaults: defaults_changes
//                 };
//             },
//             'change lengths': function( changes ) {
//                 assert.lengthOf( changes.defaults, 6 );
//                 assert.lengthOf( changes.config, 6);
//                 assert.lengthOf( changes.override, 6);
//                 assert.lengthOf( changes.container,11); 
//             }
//         },
//         "more config container change events": {
//             topic: function() {
//                 var changes = [];
                
//                 var override = new Configuration({source: 'override'});
//                 var defaults = new Configuration({source: 'default'});
//                 var container = new ConfigContainer({source: 'container'});
                
//                 container.on('change', function(change) { changes.push( change ); } );

//                 container.addOverride( override );
//                 container.addDefault( defaults );

//                 defaults.set("a",  1); // change 0
//                 container.set("a", 2); // change 1
//                 override.set("a",  3); // change 2
                
// 		container.set("a", 4); // no change
// 		defaults.set("a", 5);  // no change
// 		container.remove("a"); // no change
// 		override.remove("a");  // change 3

//                 return  changes;
//             },
//             'changes': function( changes ) {
// 		assert.deepEqual( changes, 
// 		 [ {name:"a", value: 1, old_value: undefined, source:"default" },
// 		   {name:"a", value: 2, old_value: 1, source:"container" },
// 		   {name:"a", value: 3, old_value: 2, source:"override" },
// 		   {name:"a", value: 5, old_value: 3, source:"override" }
// 		 ]); 
//             }
//         }                                        
//     }
// });

// exports.configuration.addBatch( {
//     'config file object': {
//         "json file": {
//             topic: function() {
//                 var promise = new EventEmitter();
//                 var config_json = require.resolve('./files/config.json');
//                 var config = new ConfigFile( {source: config_json, format: 'json'} );
//                 config.on('invalid', function() { promise.emit('failure', config); });
//                 config.on('loaded',  function() { promise.emit('success', config); });
//                 return promise;
//             },
//             'loads properly': function(config) {
//                 assert.instanceOf( config, Configuration);
//                 assert.instanceOf( config, ConfigFile );
//                 assert.deepEqual( config.toObject(), { "test1": "a", "test2": "b", "test3": {"c": "d", "e": ["f","g","h"] } , "test4": "i" } );
//             }        
//         },
//         "yaml file": {
//             topic: function() {
//                 var promise = new EventEmitter();
//                 var config_yaml = require.resolve('./files/config.yaml');
//                 var config = new ConfigFile( {source: config_yaml, format: 'yaml'} );
//                 config.on('invalid', function() { promise.emit('failure', config); });
//                 config.on('loaded',  function() { promise.emit('success', config); });
//                 return promise;
//             },
//             'loads properly': function(config) {
//                 assert.instanceOf( config, Configuration);
//                 assert.instanceOf( config, ConfigFile );
//                 var contents = { test: [ {one:1, two:2, three:3}, {four:2, five:5,six:6}, {a: 'b', c: 'asdfasd' } ],
//                                   aaa: { bbb: { ccc: 'a' } } };                                                  
//                 assert.deepEqual( config.toObject(), contents );
//             }        
//         },
//         "ini file": {
//             topic: function() {
//                 var promise = new EventEmitter();
//                 var config_ini = require.resolve('./files/config.ini');
//                 var config = new ConfigFile( { source: config_ini, format: 'ini'} );
//                 config.on('invalid', function() { promise.emit('failure', config); });
//                 config.on('loaded',  function() { promise.emit('success', config); });
//                 //config.emit('loaded');
//                 return promise;
//             },
//             'loads properly': function(config) {
//                 assert.instanceOf( config, Configuration);
//                 assert.instanceOf( config, ConfigFile );
//                 var contents = { top: 'level', one: {stuff: 'more stuff'}, two: {x: 'y'} };
//                 assert.deepEqual( config.toObject(), contents );
//             }        
//         } //,
//     }
// });


// exports.configuration.addBatch( {
//     'basic remapped configuration object': {
//             topic: function() {
// 		var config = new Configuration({source: "basic config object"});
// 		var mapper = function(old_name) {
// 		    return {a:'e:f', b:'e:g', b:'d'}[old_name];
// 		};
// 		var remap = new RemapConfig({mapper: mapper, original: config});
// 		return remap;
// 	    },
//             'should be an object':          function(config) { assert.instanceOf(config,Configuration); },
//             'should be a remapper':         function(config) { assert.instanceOf(config,RemapConfig); },
//             'should be an EventEmitter':    function(config) { assert.instanceOf(config,EventEmitter); },
//             'should have a get method':     function(config) { assert.isFunction( config.get ); },
//             'should have a set method':     function(config) { assert.isFunction( config.set ); },
//             'should have a remove method':  function(config) { assert.isFunction( config.remove ); },
//             'should return undefined for a new value': 
//                 function(config) { assert.isUndefined( config.get('non existant value') ); },
//             'should return undefined for a new path':
//                 function(config) { assert.isUndefined( config.get('non:existant:path') ); },
//         },
//     'configuration keys and each': {
//         topic: function() {
// 	    var config = new Configuration({source: "basic config object"});
// 	    var mapper = function(old_name) {
// 		return {a:'e:f', b:'e:g', c:'d'}[old_name];
// 	    };
// 	    var remap = new RemapConfig({mapper: mapper, original: config});
// 	    config.set("a", 1);
// 	    config.set("b", 2);
// 	    config.set("c", 3);

// 	    return remap;
//         },
//         'has keys': function(config) { 
//             assert.deepEqual( config.keys().sort(), ['d','e:f','e:g'  ] ) ;
//         },
//         'each works': function(config) {
//             var keys = config.keys();
//             var each_keys = [];
            
//             config.each( function(element, key, cfg) {
//                 each_keys.push(key);
//                 assert.equal( element, cfg.get(key) );
//             });
            
//             assert.deepEqual( keys.sort(), each_keys.sort() );
//         }
//     },
//     'mapped config read only': {
//         topic: function() {
// 	    var config = new Configuration({source: "basic config object"});
// 	    var mapper = function(old_name) {
// 		return {a:'e:f', b:'e:g', c:'d'}[old_name];
// 	    };
// 	    var remap = new RemapConfig({mapper: mapper, original: config});
// 	    config.set("a", 1);
// 	    config.set("b", 2);
// 	    config.set("c", 3);
// 	    remap.set("d", 0);
// 	    remap.set("e:f", 0);
// 	    remap.set(["e","g"],0);
// 	    return remap;
//         },
//         'writes were not effective': function(remap) { 
// 	    assert.equal( remap.get("d"), 3 );
// 	    assert.equal( remap.get("e:f"), 1);
// 	    assert.equal( remap.get("e:g"), 2);
//         },
//     },

//     'Configuration events': {
//         "set behavior on original": {
//             topic: function() {
// 		var config = new Configuration({source: "basic config object"});
// 		var mapper = function(old_name) {
// 		    return {a:'e:f', b:'e:g', c:'d'}[old_name];
// 		};
// 		var remap = new RemapConfig({mapper: mapper, original: config});
// 		var changes = [];
//                 remap.on('change', function( change ) {
//                     changes.push( change );
//                 });
// 		config.set("a", 1, "A");
// 		config.set("b", 2, "B");
// 		config.set("c", 3, "C");
// 		config.set("c", 3, "C");
// 		config.set("a", 4, "D");
// 		return changes;
//             },
//             "emits a 'change' when changed":      function(changes) { assert.lengthOf(changes, 4);
//                                                                       assert.isObject(changes[0]);
//                                                                       assert.isObject(changes[1]);
// 								      assert.isObject(changes[2]);
// 								      assert.isObject(changes[3]);
// 								    },
//             "identifies mapped name of change":   function(changes) { assert.equal( changes[0].name, "e:f" );
//                                                                       assert.equal( changes[1].name, "e:g" ); 
//                                                                       assert.equal( changes[2].name, "d" ); 
//                                                                       assert.equal( changes[3].name, "e:f" ); 
// 								    },
//             "identifies new value":               function(changes) { assert.equal( changes[0].value, "1" );  
//                                                                       assert.equal( changes[1].value, "2" ); 
//                                                                       assert.equal( changes[2].value, "3" ); 
//                                                                       assert.equal( changes[3].value, "4" ); 
// 								    },
//             "identifies the source":              function(changes) { assert.equal( changes[0].source, "A" );
//                                                                       assert.equal( changes[1].source, "B");
//                                                                       assert.equal( changes[2].source, "C"); 
//                                                                       assert.equal( changes[3].source, "D"); 
// 								    },
//             "identifies the old value":           function(changes) { assert.isUndefined( changes[0].old_value );
// 								      assert.isUndefined( changes[1].old_value );
// 								      assert.isUndefined( changes[2].old_value );
//                                                                       assert.equal( changes[3].old_value, changes[0].value);
// 								    }
//         },
//         "structured remap": {
//             topic: function() {
// 		var config = new Configuration({source: "basic config object"});
// 		var mapper = function(old_name) {
// 		    var m;
// 		    if( m = old_name.match(/^a((:.*)?)$/)) {
// 			return "b"+m[1];
// 		    } else if( m = old_name.match(/^b((:.*)?)$/)) {
// 			return "a"+m[1];
// 		    }
// 		    return undefined;
// 		};
// 		var remap = new RemapConfig({mapper: mapper, original: config});
// 		var changes = [];
//                 remap.on('change', function( change ) {
//                     changes.push( change );
//                 });
// 		config.set("a:b", 1, "A");
// 		config.set("b:a", 2, "B");
// 		return changes;
//             },
//             "emits a 'change' when changed":      function(changes) { assert.lengthOf(changes, 2);
//                                                                       assert.isObject(changes[0]);
//                                                                       assert.isObject(changes[1]);
// 								    },
//             "identifies mapped name of change":   function(changes) { assert.equal( changes[0].name, "b:b" );
//                                                                       assert.equal( changes[1].name, "a:a" ); 
// 								    },
//             "identifies new value":               function(changes) { assert.equal( changes[0].value, "1" );  
//                                                                       assert.equal( changes[1].value, "2" ); 
// 								    },
//             "identifies the source":              function(changes) { assert.equal( changes[0].source, "A" );
//                                                                       assert.equal( changes[1].source, "B");
// 								    }
//         },
//         "structured remap": {
//             topic: function() {
// 		var config = new Configuration({source: "basic config object"});
// 		var mapper = function(old_name) {
// 		    var m;
// 		    if( m = old_name.match(/^a((:.*)?)$/)) {
// 			return "b"+m[1];
// 		    } else if( m = old_name.match(/^b((:.*)?)$/)) {
// 			return "a"+m[1];
// 		    }
// 		    return undefined;
// 		};
// 		var remap = new RemapConfig({mapper: mapper, original: config});
// 		var changes = [];
//                 remap.on('change', function( change ) {
//                     changes.push( change );
//                 });
// 		config.set("a:b", 1, "A");
// 		config.set("b:a", 2, "B");
// 		return remap;
//             },
// 	    'keys': function(remap) {
// 		var keys = remap.keys().sort();
// 		assert.deepEqual( keys, [ "a", "a:a", "b", "b:b" ]);
// 	    },
// 	    'toObject': function(remap) {
// 		var obj = remap.toObject();
// 		assert.deepEqual( obj, { a: {a:2}, b: {b:1} } );
// 	    }
// 	}
//     }
// });


// exports.configuration.run();