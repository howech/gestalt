
var vows = require('vows'),
    assert = require('assert');
var EventEmitter = require('events').EventEmitter;

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
                    //assert.equal( config.get(path), value );
                    //assert.equal( config.get( ["a","long","path","name"] ) , value );
                    config.set(path, value);                
                    assert.instanceOf( config.get("a"), Configuration );
                    assert.isFunction( config.get("a")._listeners_.long );
                    assert.instanceOf( config.get("a:long"), Configuration );
                    assert.isFunction( config.get("a:long")._listeners_.path );
                    subConfig = config.get("a:long:path");
                    assert.instanceOf( subConfig, Configuration );
                    assert.isFunction( subConfig.get);
                    //assert.equal( subConfig.get("name"), value );
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
                },        
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
            "thats all folks": function(changes) { assert.lengthOf( changes, 6 ); }
        }
    }
});

exports.configuration.run();