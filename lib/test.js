var config = require('./gestalt');

var Configuration = config.Configuration;
var ConfigContainer = config.ConfigContainer;

var c1 = new Configuration("test1");
var c2 = new Configuration("test2");
var c3 = new ConfigContainer("test3");

//c1.on('change', function(path,value,source) {
//    console.log("in c1 %s became %s from %s", path, value, source);
//});

//c2.on('change', function(path,value,source) {
//    console.log("in c2 %s became %s from %s", path, value, source);
//});

c3.on('change', function(path,value,source) {
    console.log("in c3 %s became %s from %s", path, value, source);
});


c1.set("a","1");
c1.set("b","2");

c2.set("a","0");
c2.set("c","4");
c2.set("d","4");

c3.set("c","3");

c3.addOverride(c1);
c3.addDefault(c2);

c3._touch_();


