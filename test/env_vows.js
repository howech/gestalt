var vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore'),
    util = require('util');

var gestalt         = require('../lib/gestalt'),
    Configuration   = gestalt.Configuration,
    ConfigEnv      = gestalt.ConfigEnv;

vows.describe( "Gestalt Configuration Environment Object").addBatch( {
    'config env object': {
        "env": {
            topic: function() {
		return new ConfigEnv( {env: {foo:"bar"} });
            },
            'foo': function(config) {
                assert.equal( config.get("foo"), "bar" );
            }        
        }
    }
}).export(module);
