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
	    assert.notEqual( config.getValSource("e").source,   "default");  // should reference caller
	    assert.notEqual( config.getValSource("f:a").source, "default");  // should reference caller
	    assert.equal( config.getValSource("g").source,   "source");
	    assert.equal( config.getValSource("f:b").source, "source"); 
	    config.update("e",1,"new source");
	    assert.equal( config.getValSource("e").source,   "new source");
	    config.update("e",2,"new source");
	    assert.equal( config.getValSource("e").source,   "new source");
	    config.update("e",2);
	    assert.notEqual( config.getValSource("e").source,   "default");
	    assert.notEqual( config.getValSource("e").source,   "new source");
	    config.update("e",1);
	    assert.notEqual( config.getValSource("e").source,   "default");
	    assert.notEqual( config.getValSource("e").source,   "new source");
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
            
            config.each( function(element, key, source, cfg) {
                each_keys.push(key);
                assert.equal( element, cfg.get(key) );
            });
            
            assert.deepEqual( keys, each_keys );
        }
    },
    "change events" : {
	topic: function() {
	    var changes = [];
	    var config = new Configuration({source:"A"}).on('change', function( chg ) { changes.push(chg ) } );
	    
	    config.set("a",1);       // change 0
	    config.set("b",1);       // change 1
	    config.set("c:a", 1);    // change 2 - "c" change doesnt get notified.

	    config.set("a",1,"B");   // no change - source only change doesnt register
	    config.set("a",1);       // no change
	    
	    config.set("a",2,"B");   // change 3
	    config.set("b",2,"B");   // change 4
	    config.set("c:b",1);     // change 5
	    config.remove("a");      // change 6
	    config.remove("c");      // change 7,8 - c- change doesnt get notified

	    return changes;
	}, 
	"change 0": function(changes)   { assert.deepEqual( changes[0], { name: 'a', value: 1, old_value: undefined, source: "A" } ); },
	"change 1": function(changes)   { assert.deepEqual( changes[1], { name: 'b', value: 1, old_value: undefined, source: "A" } ); },
	"change 2": function(changes)   { assert.deepEqual( changes[2], { name: 'c:a', value: 1, old_value: undefined, source: "A" } ); },
	"change 3": function(changes)   { assert.deepEqual( changes[3], { name: 'a', value: 2, old_value: 1, source: "B" } ); },
	"change 4": function(changes)   { assert.deepEqual( changes[4], { name: 'b', value: 2, old_value: 1, source: "B" } ); },
	"change 5": function(changes)   { assert.deepEqual( changes[5], { name: 'c:b', value: 1, old_value: undefined, source: "A" } ); },
	"change 6": function(changes)   { assert.deepEqual( changes[6], { name: 'a', value: undefined, old_value: 2, source: "B" } ); },
	"change 7,8": function(changes)   { 
	    if( changes[7].name == "c:a" ) {
		assert.deepEqual( changes[7], { name: 'c:a', value: undefined, old_value: 1, source: "A" } );
		assert.deepEqual( changes[8], { name: 'c:b', value: undefined, old_value: 1, source: "A" } );
	    } else {
		assert.deepEqual( changes[8], { name: 'c:a', value: undefined, old_value: 1, source: "A" } );
		assert.deepEqual( changes[7], { name: 'c:b', value: undefined, old_value: 1, source: "A" } );
	    }
	},
	"9 changes": function(changes) { assert.equal( changes.length, 9 ); },
    },
    "changes to structured configs": {
        topic: function() {
            var changes = [];
            var config = new Configuration({source: "Emit"});
            config.on('change', function( change ) { changes.push(change); });
            config.set("path:to:somewhere:a", "a_value");  // change 0
            config.set("path:to:nowhere:x", "a_value");  // change 1
            config.set("path:to:nowhere:y", "a_value");  // change 2               
            config.set("path:to:somewhere:a", "b_value");  // change 3
            var lop1 = config.get("path:to:nowhere");
            var lop2 = config.get("path:to:somewhere");
            
            config.set("path:to:somewhere", "xxx" );     // change 4
            config.remove("path:to:nowhere");            // change 5 and 6
            
            lop2.set("a", "qqq"); // not a change
            lop1.set("x", "zzz"); // not a change
            
            config.set("q", lop2); // change 7
            config.set("r", lop2); // change 8
            config.set("s", lop1); // change 9
            
            config.set("q:a", "qrqr" ); // changes 11 and 10
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
            assert.equal( changes[5].name, "path:to:nowhere:x" );
            assert.isUndefined( changes[6].value );
            assert.equal( changes[6].name, "path:to:nowhere:y" );
        },
        "add lop2 back to tree twice": function(changes) {
            assert.equal( changes[7].name, "q" );
            assert.equal( changes[8].name, "r" );
            assert.isUndefined( changes[7].old_value );
            assert.isUndefined( changes[8].old_value );
            assert.equal( changes[7].value, changes[8].value );
        },
        "add lop1 back to tree": function(changes) {
            assert.equal( changes[9].name, "s" );
            assert.isUndefined( changes[9].old_value );
        },
        "change in lop2 now generates two changes in treee": function(changes) {
            assert.equal( changes[10].value, changes[11].value );
            assert.deepEqual( [ changes[10].name, changes[11].name].sort(), ["q:a", "r:a" ] );
        },
        "thats all folks": function(changes) { assert.lengthOf( changes, 12 ); }
    },
    "_touch_ structured configs": {
        topic: function() {
            var changes = [];
            var config = new Configuration({source: "_touch_"});
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
    },
    "destructure_assignments false": {
	topic: function() {
	    var config = new Configuration( {source:"X", destructure_assignments: false } );
	    var changes = [];

	    config.on('change', function(change) {changes.push( change ) } );
	    config.set("a", { b: "c", d: 5, q: {r:3,s:4} } );
	    config.set("b", [1,2,3,4,5] );

	    return { config: config, changes: changes };
	},
	"values come back as they were set": function( topic ) {
	    assert.deepEqual( topic.config.get("a"), { b: "c", d: 5, q: {r:3, s:4} } );
	    assert.deepEqual( topic.config.get("b"), [1,2,3,4,5] );
	    assert.isUndefined( topic.config.get("a:b") );
	    assert.isUndefined( topic.config.get("b:2") );
	},
	"changes behave as normal": function(topic) {
	    assert.deepEqual( topic.changes[0], { name: "a", value: { b: "c", d: 5, q: {r:3, s:4} }, old_value: undefined, source: "X" } );
	    assert.deepEqual( topic.changes[1], { name: "b", value: [1,2,3,4,5], old_value: undefined, source: "X" } );
	}
    },
    "destructure_arrays false": {
	topic: function() {
	    var config = new Configuration( {source:"X", destructure_arrays: false } );
	    var changes = [];

	    config.on('change', function(change) {changes.push( change ) } );
	    config.set("a", [1,2,3,4,5] );

	    return { config: config, changes: changes };
	},
	"values come back as they were set": function( topic ) {
	    assert.deepEqual( topic.config.get("a"), [1,2,3,4,5] );
	},
	"changes behave as normal": function(topic) {
	    assert.deepEqual( topic.changes[0], { name: "a", value: [1,2,3,4,5], old_value: undefined, source: "X" } );
	}
    },

    "Pattern Listeners": {
	topic: function() {
	    var config = new Configuration({source: 'Z'});
	    var changes = { main: [], string: [], regex: [], func: [] };
	    config.on('change', function(change) { changes.main.push(change); } );
	    var c1 = config.addPatternListener('a:b', function(change) { changes.string.push(change); } );
	    var c2 = config.addPatternListener(/^a/, function(change) { changes.regex.push(change); } );
	    var c3 = config.addPatternListener( function(change) { return change.name.length == 4; }, 
						function(change) { changes.func.push(change); } );
	    
	    config.set( "a:b" , 4);  // string+reges
	    config.set( "a:zz", 5);  // regex+func
	    config.set( "c", 6);     // none
	    
	    config.removePatternListener(c1);
	    config.set( "a:b", 6); // regex only 
	    return changes;
	},
	"main had 4 changes":  function(changes) { assert.equal( changes.main.length, 4 ); },
	"string had 1 change": function(changes) { assert.equal( changes.string.length, 1 ); },
	"regex had 3 changes": function(changes) { assert.equal( changes.regex.length, 3 ); },
	"func had 1 change":   function(changes) { assert.equal( changes.func.length, 1 ); },
	"string listener": function(changes) { 
	    _.each( changes.string, function( change ) { assert.equal( "a:b", change.name ) } );
	},
	"regex listener": function(changes) {
	    _.each( changes.regex, function( change ) { assert.ok( change.name.match(/^a/) ) } );
	},
	"func listener": function(changes) {
	    _.each( changes.func, function( change ) { assert.equal( change.name.length, 4 ) } );
	}
    }
}).export(module);


