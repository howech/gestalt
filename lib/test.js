var config = require('./gestalt');

//var ConfigFile = require('./file').ConfigFile;

var c1 = new config.ConfigFile("./lib/x.json", {watch: true} );
var c2 = new config.ConfigFile("./test/config.yaml", {format: 'yaml', watch: true} );

c1.on('change', function(name,value,source) {
    console.log("%s %s %s", name, value, source);
})

c1.on('invalid', function(name,value,source) {
    console.log("%s %s %s", name, value, source);
})


c2.on('change', function(name,value,source) {
    console.log("c2 changed!!! %j %j %s", name, value, source);
})

c2.on('invalid', function(name,value,source) {
    console.log("INVALID %s %s %s", name, value, source);
})

setInterval( function() { 
//    console.log(c1.get("test1"));
//    console.log(c1.get("test3:b"));
}, 10000);
