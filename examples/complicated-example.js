var gestalt = require('../lib/gestalt');
var ConfigEnv = gestalt.ConfigEnv;
var RemapConfig = gestalt.RemapConfig; 
var ConfigArgs = gestalt.ConfigArgs;
var ConfigContainer = gestalt.ConfigContainer;
var ConfigFile = gestalt.ConfigFile;

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
var yaml_file = require.resolve('./config.yaml');
var f = new ConfigFile(yaml_file, {format: 'yaml'});
var re = new RemapConfig( env_mapper, e );
var ra = new RemapConfig( args_mapper, a );

var config = new ConfigContainer("config",{});
config.addOverride( re );
config.addOverride( ra );

setTimeout( function() {
    config.addDefault( f );
    console.log( config.get('new:foo') );
    config.set('new:foo','ZZZZ');
    console.log( config.get('new:foo') );
    config.report();
},1000);