var config = require('./gestalt');

//var ConfigFile = require('./file').ConfigFile;

var c1 = new config.Configuration("./lib/x.json", {watch: true} );

c1.on('change', function(name,value,source) {
    console.log("%s %s %s", name, value, source);
})

c1.on('invalid', function(name,value,source) {
    console.log("%s %s %s", name, value, source);
})

c1.set("a","b");

setInterval( function() { 
    console.log(c1.get("test1"));
    console.log(c1.get("test3:b"));
}, 10000);
