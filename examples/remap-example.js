var ConfigEnv = require('../lib/env').ConfigEnv;
var RemapConfig = require('../lib/remap').RemapConfig; 

function mapper(old) {
    if( old.match(/^f/ )) {
	return "new:" + old;	
    } else {
	return undefined;
    }
}

var c = new ConfigEnv();
var r = new RemapConfig( { mapper: mapper, original: c } );

console.log( r.get('new:foo') );
console.log( r.keys() );
r.report();