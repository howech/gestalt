var vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore'),
    util = require('util');

var gestalt         = require('../lib/gestalt'),
    Configuration   = gestalt.Configuration,
    ConfigArgs      = gestalt.ConfigArgs;

vows.describe( "Gestalt Configuration Arguments Object").addBatch( {
    'config arguments object': {
        "args": {
            topic: function() {
		return new ConfigArgs( {argv: ["--foo","bar"]});
            },
            'foo': function(config) {
                assert.equal( config.get("foo"), "bar" );
            }        
        }
    },
   'artificial failure': {
       "FAIL": { 
	   topic: 2,
	   'FAIL': function(config) {
	       assert.equal(config, 3);
	   }
       }
   }
}).export(module);
