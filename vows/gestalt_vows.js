
var vows = require('vows'),
    assert = require('assert');

var config = require('../lib/gestalt');
var Configuration = config.Configuration;
var ConfigContainer = config.ConfigContainer;

var x = vows.describe('gestalt').addBatch('Configuration Object', {
    'A Configuration': {
            topic: function() { return new Configuration("A Configuration Test");},
            'should have get and set methods': function(config) {
                assert.isFunction( config.get );
                assert.isFunction( config.set );
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
            }
    }
           
}).run();
