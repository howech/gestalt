
var vows = require('vows'),
    assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');

var config = require('../lib/gestalt');
var Configuration = config.Configuration;
var ConfigContainer = config.ConfigContainer;
var util = require('util');

exports.configuration = vows.describe('gestalt configurtion object');
exports.configuration.addBatch( {
    'basic config object': {
            topic: new Configuration("config object basics"),
            'should be an object':          function(config) { assert.instanceOf(config,Configuration); },
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
            'should break apart colon separated paths':
                function(config) {
                    var path = config.getPath("a:b:c:d");
                    assert.isArray( path );
                    assert.equal(path.length, 4);
                    assert.equal(path[0], "a");
                    assert.equal(path[1], "b");
                    assert.equal(path[2], "c");
                    assert.equal(path[3], "d");
                },
            'should populate new paths when set': 
                function(config) {
                    var path = "a:long:path:name";
                    var value = "aasdfWdRC";
                    var subConfig;
                    config.set(path, value);                
                    assert.equal( config.get(path), value );
                    assert.equal( config.get( ["a","long","path","name"] ) , value );
                    subConfig = config.get("a:long:path");
                    assert.equal( subConfig.get("name"), value );
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
                },
            'can be converted to a plain object':
                function(config) {
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
            
            assert.deepEqual( keys.sort(), each_keys.sort() );
        }
    },
    'Configuration events': {
        "first change": {
            topic: function() {
                var promise = new EventEmitter();
                var changes = [];
                var config = new Configuration("Configuration Emitter");
                config.on('change', function( change ) {
                    changes.push( change );
                    if(changes.length == 2)
                        promise.emit('success', changes);
                });
                config.set("name_n", "value_v", "source_s");
                config.set("name_n", "value_xxx" );
                return promise;
            },
            "emits a 'change' when changed":      function(changes) { assert.lengthOf(changes, 2);
                                                                      assert.isObject(changes[0]);
                                                                      assert.isObject(changes[1]); },
            "identifies name of changed value":   function(changes) { assert.equal( changes[0].name, "name_n" );
                                                                      assert.equal( changes[1].name, "name_n" ); },
            "identifies new value":               function(changes) { assert.equal( changes[0].value, "value_v" );  
                                                                      assert.equal( changes[1].value, "value_xxx"); },
            "identifies the source":              function(changes) { assert.equal( changes[0].source, "source_s" );
                                                                      assert.equal( changes[1].source, "Configuration Emitter"); },
            "identifies the old value":           function(changes) { assert.isUndefined( changes[0].old_value );
                                                                      assert.equal( changes[1].old_value, changes[0].value); }
        },
        "second change": {
            topic: function() {
                var promise = new EventEmitter();
                var changes = [];
                var config = new Configuration("Configuration Emitter");
                config.on('change', function(change ) {
                    changes.push(change);
                });
                config.set("name_n", "value_v", "source_s");
                config.set("name_n", "value_v", "source_s");
                config.set("name_n", "value_v", "some other source");
                promise.emit( 'success', changes );
                return promise;
            },
            "should only emit one change":   function( changes ) { assert.lengthOf( changes, 1 ) }
        },
        "changes to structured configs": {
            topic: function() {
                var changes = [];
                var config = new Configuration("Emit");
                config.on('change', function( change ) { changes.push(change); });
                config.set("path:to:somewhere:a", "a_value");  // change 0
                config.set("path:to:nowhere:x", "a_value");  // change 1
                config.set("path:to:nowhere:y", "a_value");  // change 2               
                config.set("path:to:somewhere:a", "b_value");  // change 3
                var lop1 = config.get("path:to:nowhere");
                var lop2 = config.get("path:to:somewhere");
                
                config.set("path:to:somewhere", "xxx" );     // change 4
                config.remove("path:to:nowhere");            // change 5 
                
                lop2.set("a", "qqq"); // not a change
                lop1.set("x", "zzz"); // not a change
                                
                config.set("q", lop2); // change 6
                config.set("r", lop2); // change 7
                config.set("s", lop1); // change 8
                
                config.set("q:a", "qrqr" ); // changes 9 and 10
                return changes;
            },
            "change for path:to:somewhere:a": function( changes ) { 
                assert.deepEqual( changes[0], { name: "path:to:somewhere:a", value: "a_value", source: "Emit", old_value: undefined } );
            },
            "change for path:to:nowhere:x": function( changes ) { 
                assert.deepEqual( changes[1], { name: "path:to:nowhere:x", value: "a_value", source: "Emit", old_value: undefined } );
            },
            "change for path:to:nowhere:y": function( changes ) { 
                assert.deepEqual( changes[2], { name: "path:to:nowhere:y", value: "a_value", source: "Emit", old_value: undefined } );
            },
            "change for path:to:somewhere:a (second)": function( changes ) { 
                assert.deepEqual( changes[3], { name: "path:to:somewhere:a", value: "b_value", source: "Emit", old_value: "a_value" } );
            },
            "change for path:to:somewhere )": function( changes ) {
                assert.equal( changes[4].name, "path:to:somewhere" );
                assert.equal( changes[4].value, "xxx");
                assert.equal( changes[4].source, "Emit");
                assert.instanceOf( changes[4].old_value, Configuration );
            },
            //"change due to implicit removal of path:to:somewhere:a": function( changes ) {
            //    assert.equal( changes[5].name, "path:to:somewhere:a" );
            //    assert.isUndefined( changes[5].value );
            //    assert.instanceOf( changes[5].old_value, Configuration );
            //},
            "change removal of path:to:nowhere": function( changes ) { 
                assert.isUndefined( changes[5].value );
                assert.equal( changes[5].name, "path:to:nowhere" );
            },
            "add lop2 back to tree twice": function(changes) {
                assert.equal( changes[6].name, "q" );
                assert.equal( changes[7].name, "r" );
                assert.isUndefined( changes[6].old_value );
                assert.isUndefined( changes[7].old_value );
                assert.equal( changes[6].value, changes[7].value );
            },
            "add lop1 back to tree": function(changes) {
                assert.equal( changes[8].name, "s" );
                assert.isUndefined( changes[8].old_value );
            },
            "change in lop2 now generates two changes in treee": function(changes) {
                assert.equal( changes[9].value, changes[10].value );
                assert.deepEqual( [ changes[9].name, changes[10].name].sort(), ["q:a", "r:a" ] );
            },
            "thats all folks": function(changes) { assert.lengthOf( changes, 11 ); }
        },
        "_touch_ structured configs": {
            topic: function() {
                var changes = [];
                var config = new Configuration("_touch_");
                config.set("path:to:somewhere:a", "a_value");  
                config.set("path:to:nowhere:x", "a_value");    
                config.set("path:to:nowhere:y", "a_value");    
                config.set("path:to:somewhere:a", "b_value");  
                config.on('change', function( change ) { changes.push(change); });
                config._touch_();
                return { config: config, changes: changes };
            },
            'there is a change for every key':  function(topic) {
                var change_keys = _.map( topic.changes, function( change ) { return change.name; } );
                assert.lengthOf( topic.changes, topic.config.keys().length );
                assert.deepEqual( change_keys.sort(), topic.config.keys().sort() );
            },
            'every change value agrees with config': function(topic) {
                _.each( topic.changes, function(change) { assert.equal(change.value, topic.config.get(change.name) );} );
            }
        }
    }
});

exports.configuration.addBatch( {
    'config container object': {
            topic: new ConfigContainer("config container basics"),
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
            'should break apart colon separated paths':
                function(config) {
                    var path = config.getPath("a:b:c:d");
                    assert.isArray( path );
                    assert.equal(path.length, 4);
                    assert.equal(path[0], "a");
                    assert.equal(path[1], "b");
                    assert.equal(path[2], "c");
                    assert.equal(path[3], "d");
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
                },
            'can be converted to a plain object':
                function(config) {
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
            
            assert.deepEqual( keys.sort(), each_keys.sort() );
        }
    },
    'overrides and defaults basics': {
        "first change": {
            topic: function() {
                var override = new Configuration('override');
                var config = new Configuration('config');
                var defaults = new Configuration('default');
                var container = new ConfigContainer( 'container', {}, config );
                container.addOverride( override );
                container.addDefault( defaults );
                
                override.set( "a" , "override" );
                override.set( "b", "override" );
                override.set("f", "override" );
                config.set( "a", "masked");
                config.set( "c", "normal");
                defaults.set("b", "masked");
                defaults.set("c", "masked");
                defaults.set("d","defauilt");
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
                //assert.equal( container.get("c"), "normal" );
                assert.equal( container.get("d"), "default" );
                assert.equal( container.get("e"), "container" );
                assert.equal( container.get("f"), "override" );
            },
        }
    }
});



exports.configuration.run();