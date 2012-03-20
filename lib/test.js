var config = require('./gestalt');

var ConfigFile = require('./file').ConfigFile;

var c1 = new ConfigFile("./lib/x.json");

c1.on('change', function(name,value,source) {
    console.log("%s %s %s", name, value, source);
})

c1.on('invalid', function(name,value,source) {
    console.log("%s %s %s", name, value, source);
})

console.log("x");
setInterval( function() { 
    console.log(c1.get("test1"));
}, 10000);
