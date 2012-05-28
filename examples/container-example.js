var gestalt = require('../lib/gestalt');

var override = new gestalt.Configuration("Override");
var def = new gestalt.Configuration("Default");
var container = new gestalt.ConfigContainer("Container");

container.addOverride( override );
container.addDefault(def);

container.on( 'change',function(change) { 
    console.log("%j", change ); 
});

def.set("a",1);
// logs {"name":"a", "value":1, "source":"Default" }

container.set("a",2);
// logs {"name":"a", "value":2, "old_value": 1, "source":"Container" }

override.set("a",3);
// logs {"name":"a", "value":3, "old_value": 2, "source":"Override" }

container.set("a",4);
// logs nothing - overall value does not change

def.set("a",5);
// also logs nothing

container.remove("a");
// logs nothing

override.remove("a");
// logs {"name":"a", "value":5, "old_value":3, "source":"Default" }