var vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore'),
util = require('util'),
fs = require('fs');
var gestalt         = require('../lib/gestalt'),
    Configuration   = gestalt.Configuration,
    ConfigContainer = gestalt.ConfigContainer,
    ConfigFile      = gestalt.ConfigFile,
    RemapConfig     = gestalt.RemapConfig;


vows.describe( "Gestalt Configuration File Object").addBatch( {
    'config file object': {
        "json file": {
            topic: function() {
                var promise = new EventEmitter();
                var config_json = require.resolve('./files/config.json');
                var config = new ConfigFile( {source: config_json, format: 'json'} );
                config.on('state', function(state_change) {
                    if( state_change.state == 'invalid' ) {
                        promise.emit('failure', config);
                    } else if ( state_change.state == 'ready' ) {
                        promise.emit('success', config);
                    }
                });
                return promise;
            },
            'loads properly': function(config) {
                assert.instanceOf( config, Configuration);
                assert.instanceOf( config, ConfigFile );
                assert.deepEqual( config.toObject(), { "test1": "a", "test2": "b", "test3": {"c": "d", "e": ["f","g","h"] } , "test4": "i" } );
            }        
        },
        "json file, auto": {
            topic: function() {
                var promise = new EventEmitter();
                var config_json = require.resolve('./files/config.json');
                var config = new ConfigFile( {source: config_json } );
                config.on('state', function(state_change) {
                    if( state_change.state == 'invalid' ) {
                        promise.emit('failure', config);
                    } else if ( state_change.state == 'ready' ) {
                        promise.emit('success', config);
                    }
                });
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
                config.on('state', function(state_change) {
                    if( state_change.state == 'invalid' ) {
                        promise.emit('failure', config);
                    } else if ( state_change.state == 'ready' ) {
                        promise.emit('success', config);
                    }
                });
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
        "yaml file, auto": {
            topic: function() {
                var promise = new EventEmitter();
                var config_yaml = require.resolve('./files/config.yaml');
                var config = new ConfigFile( {source: config_yaml } );
                config.on('state', function(state_change) {
                    if( state_change.state == 'invalid' ) {
                        promise.emit('failure', config);
                    } else if ( state_change.state == 'ready' ) {
                        promise.emit('success', config);
                    }
                });
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
                config.on('state', function(state_change) {
                    if( state_change.state == 'invalid' ) {
                        promise.emit('failure', config);
                    } else if ( state_change.state == 'ready' ) {
                        promise.emit('success', config);
                    }
                });

                //config.emit('loaded');
                return promise;
            },
            'loads properly': function(config) {
                assert.instanceOf( config, Configuration);
                assert.instanceOf( config, ConfigFile );
                var contents = { top: 'level', one: {stuff: 'more stuff'}, two: {x: 'y'} };
                assert.deepEqual( config.toObject(), contents );
            }        
        },
        "ini file, auto": {
            topic: function() {
                var promise = new EventEmitter();
                var config_ini = require.resolve('./files/config.ini');
                var config = new ConfigFile( { source: config_ini } );
                config.on('state', function(state_change) {
                    if( state_change.state == 'invalid' ) {
                        promise.emit('failure', config);
                    } else if ( state_change.state == 'ready' ) {
                        promise.emit('success', config);
                    }
                });

                //config.emit('loaded');
                return promise;
            },
            'loads properly': function(config) {
                assert.instanceOf( config, Configuration);
                assert.instanceOf( config, ConfigFile );
                var contents = { top: 'level', one: {stuff: 'more stuff'}, two: {x: 'y'} };
                assert.deepEqual( config.toObject(), contents );
            }        
        },
        "json file, custom parser": {
            topic: function() {
                var promise = new EventEmitter();
                var config_json = require.resolve('./files/config.json');
                var config = new ConfigFile( {source: config_json, parser: function(data) {
                    var value = JSON.parse(data);
                    value.extra = "extra";
                    delete value.test1;
                    return value;
                } } );
                config.on('state', function(state_change) {
                    if( state_change.state == 'invalid' ) {
                        promise.emit('failure', config);
                    } else if ( state_change.state == 'ready' ) {
                        promise.emit('success', config);
                    }
                });
                return promise;
            },
            'loads properly': function(config) {
                assert.instanceOf( config, Configuration);
                assert.instanceOf( config, ConfigFile );
                assert.deepEqual( config.toObject(), { "extra":"extra", "test2": "b", "test3": {"c": "d", "e": ["f","g","h"] } , "test4": "i" } );
            }        
        },

    },
    "JSON File Watch": {
        topic: function() {
	    // In this scenario, we are going to 
	    // 1) write a file containing some json data.
	    // 2) set up a config file watching it.
	    // 3) Overwrite the file with different data.
	    // 4) Delete the file
	    // 5) wait for fallout

	    // We will check that the changes emitted are correct
	    // We will check that the state changes are correct

            var promise = new EventEmitter();

            var object1 = {a:1, b:2, c: [1,2,3], d: {e: 55, f: 66 } };
            var object2 = {a:2, b:1, c: [3,2,1], d: {g: 55, h: 66 } };
            var filename = "./test_watch_file.json";
            var writeStream = fs.createWriteStream(filename);
	    var changes = [];
	    var del = false;
	    var results = { changes: [], states: [], invalids: 0 };

	    var result_function = function(change, state) {
		if(change) {
		    results.changes.push(change);
		} 
		if(state) {
		    results.states.push(state);
		    if( state.state == 'invalid') {
			results.invalids++
		    }
		}

	    }

            writeStream.end( JSON.stringify( object1 ) );

            writeStream.on('close', function() {
                var config = new ConfigFile( {source: filename, format: 'json', watch: true} );
		var ready = false
                config.on('state', function(state) {
                    if( state.state == 'ready' && ! ready) {
			ready = true;
                        var ws2 = fs.createWriteStream(filename);
                        ws2.on('close', function() {
			    setTimeout( function() {
				fs.unlink(filename, function() { 
				    setTimeout( function() {
					promise.emit('success', results );
				    }, 100 );
				});
			    }, 100 );
                        });
                        ws2.end( JSON.stringify(object2) );
                        
                        config.on('change', function(change) { 
			    result_function( change );
                        });

                    } 
		    result_function(null, state );
                });       
            });

            return promise;
        },
        "test changes" : function(results) {
	    var change_obj = {};
	    _.each( results.changes, function(change) {
		change_obj[ change.name + "_" + change.value ] = change;
	    });
	    expected_results = {
		"a_2": {
		    "name": "a",
		    "value": 2,
		    "source": "./test_watch_file.json",
		    "old_value": 1
		},
		"b_1": {
		    "name": "b",
		    "value": 1,
		    "source": "./test_watch_file.json",
		    "old_value": 2
		},
		"c:0_3": {
		    "name": "c:0",
		    "value": 3,
		    "source": "./test_watch_file.json",
		    "old_value": 1
		},
		"c:2_1": {
		    "name": "c:2",
		    "value": 1,
		    "source": "./test_watch_file.json",
		    "old_value": 3
		},
		"d:e_undefined": {
		    "name": "d:e",
		    "source": "./test_watch_file.json",
		    "old_value": 55,
		    "value": undefined
		},
		"d:f_undefined": {
		    "name": "d:f",
		    "source": "./test_watch_file.json",
		    "old_value": 66,
		    "value": undefined
		},
		"d:g_55": {
		    "name": "d:g",
		    "value": 55,
		    "source": "./test_watch_file.json",
		    "old_value": undefined
		},
		"d:h_66": {
		    "name": "d:h",
		    "value": 66,
		    "source": "./test_watch_file.json",
		    "old_value": undefined
		}
	    };

	    _.each( expected_results, function(r,name) {
		assert.deepEqual( change_obj[name], r );
	    });
	},
	"test states": function(results) {
	    var expected_state = "not ready";
	    assert.equal( results.states.length, 7 );
	    _.each( results.states, function( state ) {
		assert.equal( state.old_state, expected_state );
		expected_state = state.state;
	    });
	    assert.equal( expected_state, "invalid" );

        }
    }
}).export(module);
