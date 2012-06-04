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


exports.configuration.addBatch( {
    'config file object': {
        "json file": {
            topic: function() {
                var promise = new EventEmitter();
                var config_json = require.resolve('./files/config.json');
                var config = new ConfigFile( {source: config_json, format: 'json'} );
                config.on('invalid', function() { promise.emit('failure', config); });
                config.on('loaded',  function() { promise.emit('success', config); });
                return promise;
            },
            'loads properly': function(config) {
                assert.instanceOf( config, Configuration);
                assert.instanceOf( config, ConfigFile );
                assert.deepEqual( config.toObject(), { "test1": "a", "test2": "b", "test3": {"c": "d", "e": ["f","g","h"] } , "test4": "i" } );
            }        
        },
        "yaml file": {
            topic: function() {
                var promise = new EventEmitter();
                var config_yaml = require.resolve('./files/config.yaml');
                var config = new ConfigFile( {source: config_yaml, format: 'yaml'} );
                config.on('invalid', function() { promise.emit('failure', config); });
                config.on('loaded',  function() { promise.emit('success', config); });
                return promise;
            },
            'loads properly': function(config) {
                assert.instanceOf( config, Configuration);
                assert.instanceOf( config, ConfigFile );
                var contents = { test: [ {one:1, two:2, three:3}, {four:2, five:5,six:6}, {a: 'b', c: 'asdfasd' } ],
                                  aaa: { bbb: { ccc: 'a' } } };                                                  
                assert.deepEqual( config.toObject(), contents );
            }        
        },
        "ini file": {
            topic: function() {
                var promise = new EventEmitter();
                var config_ini = require.resolve('./files/config.ini');
                var config = new ConfigFile( { source: config_ini, format: 'ini'} );
                config.on('invalid', function() { promise.emit('failure', config); });
                config.on('loaded',  function() { promise.emit('success', config); });
                //config.emit('loaded');
                return promise;
            },
            'loads properly': function(config) {
                assert.instanceOf( config, Configuration);
                assert.instanceOf( config, ConfigFile );
                var contents = { top: 'level', one: {stuff: 'more stuff'}, two: {x: 'y'} };
                assert.deepEqual( config.toObject(), contents );
            }        
        } //,
    }
});


exports.configuration.run();