var gestalt = require('../lib/gestalt');

var c = new gestalt.Configuration();

var c1 = c.addPatternListener("a:b:c", function(change) { console.log("String Listener", change )} );
var c2 = c.addPatternListener(/a:.*:c/, function(change) { console.log("Regex Listener", change )} );

c.set("a:b:c",1);
c.set("a:b:c",2);
c.set("a:e:c",1);
c.set("a:e:c",2);

c.removePatternListener(c1);
c.removePatternListener(c2);

c.set("a:b:c",1);

c.report();