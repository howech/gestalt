a = require('../lib/env'); 
c = new a.ConfigEnv();
console.log( c.get('foo') );
c.report();