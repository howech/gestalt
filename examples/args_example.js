var gestalt = require('../lib/gestalt');
var ConfigArgs = gestalt.ConfigArgs;

var c = new ConfigArgs();
console.log( c.get('foo') );

c.report();