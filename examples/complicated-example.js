var gestalt = require('../lib/gestalt');
var ConfigEnv = gestalt.ConfigEnv;
var RemapConfig = gestalt.RemapConfig; 
var ConfigArgs = gestalt.ConfigArgs;
var ConfigContainer = gestalt.ConfigContainer;

function env_mapper(old) {
    if( old.match(/^f/ )) {
	return "new:" + old;	
    } else {
	return undefined;
    }
}

function args_mapper(old) {
    var obj = {
	foo: 'new:foo',
	bar: 'new:bar',
	baz: 'baz'
    };
    return obj[old];
}

var e = new ConfigEnv();
var a = new ConfigArgs();

var re = new RemapConfig( env_mapper, e );
var ra = new RemapConfig( args_mapper, a );

var config = new ConfigContainer("config",{});
config.addOverride( re );
config.addOverride( ra );

console.log( config.get('new:foo') );
config.report();
