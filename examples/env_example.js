var gestalt = require('../lib/gestalt'); 
var c = new gestalt.ConfigEnv();
console.log( c.get('foo') );
c.report();