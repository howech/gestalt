var vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore'),
    util = require('util');

var gestalt         = require('../lib/gestalt'),
    Configuration   = gestalt.Configuration,
    ConfigArgs      = gestalt.ConfigArgs;

vows.describe( "Gestalt Configuration Arguments Object").addBatch( {
    'config file object': {
        "args": {
            topic: function() {
		return new ConfigArgs( {argv: ["program","--foo","bar"]});
            },
            'foo': function(config) {
                assert.equal( config.get("foo"), "bar" );
            }        
        }
    }
}).export(module);
