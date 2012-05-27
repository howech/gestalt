a = require('../lib/args'); 
c = new a.ConfigArgs();
console.log( c.get('foo') );
c.report();