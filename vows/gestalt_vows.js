
var vows = require('vows'),
    assert = require('assert');
var EventEmitter = require('events').EventEmitter;

var config = require('../lib/gestalt');
var Configuration = config.Configuration;
var ConfigContainer = config.ConfigContainer;

vows.describe('gestalt').addBatch(
    {'Configuration Object': {
            topic: new Configuration("A Configuration Test"),
            'should have get and set methods': function(target) {
                assert.isObject(target);
                assert.equal(target._source_, 'A Configuration Test');
                assert.isFunction( target.get );
                assert.isFunction( target.set );
            },
            'should return undefined for an undefined value': function( config ) {
                assert.isUndefined( config.get('non existant value') );
                assert.isUndefined( config.get('non:existant:path') );
            },
            'should populate new values when set': function(config) {
                var name = "new name";
                var path = "new:path:name";
                
                assert.isUndefined( config.get(name) );
                assert.isUndefined( config.get(path) );
                
                var val1 = "my value";
                var val2 = "my other value";
                
                config.set(name, val1);
                config.set(path, val2 );
                
                assert.equal( config.get(name), val1 );
                assert.equal( config.get(path), val2 );
            
                config.set(name, val2);
                config.set(path, val1 );
                
                assert.equal( config.get(name), val2 );
                assert.equal( config.get(path), val1 );
        },
    'Configuration Object Emitter': {
        "first change": {
            topic: function() {
                var promise = new EventEmitter;
                var config = new Configuration("Configuration Emitter");
                config.on('change', function(name, value, source ) {
                    promise.emit('success', {name: name, value:value, source:source })
                });
                config.set("name_n", "value_v", "source_s");
                return promise;
            },
            "emits a 'change' when changed": function( obj ) {
                assert.equal(obj.name, "name_n");
                assert.equal(obj.value, "value_v");
                assert.equal(obj.source, "source_s");
                }
            }
        },
        "second change": {
            topic: function() {
                var promise = new EventEmitter;
                var config = new Configuration("Configuration Emitter");
                var done = false;
                config.set("name_n", "value_v", "source_s");
                config.on('change', function(name, value, source ) {
                    promise.emit('success', {name: name, value:value, source:source })
                    done = true;
                });
                config.on('done', function() {
                    if(!done);
                    promise.emit('success', null);
                });
                config.set("name_n", "value_v", "source_s");
                config.emit('done');
                return promise;
            },
            "doesnt emit a 'change' when changed to the same value": function( obj ) {
                assert.isNull(obj);
            }

        },
        "path change": {
            topic: function() {
                var promise = new EventEmitter;
                var config = new Configuration("Configuration Emitter");
                config.on('change', function(name, value, source ) {
                    promise.emit('success', {name: name, value:value, source:source })
                });
                config.set("path:to:somewhere", "a_value", "source_s");
                return promise;
            },
            "emits a 'change' when changed": function( obj ) {
                assert.equal(obj.name, "path:to:somewhere");
                assert.equal(obj.value, "a_value");
                assert.equal(obj.source, "source_s");
            }
        }
    }           
}).run();
