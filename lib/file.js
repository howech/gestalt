var fs = require('fs');

var data = fs.readFileSync('./lib/x.json'),
    myObj;

try {
    myObj = JSON.parse(data);
    console.dir(myObj);
    console.log("done");
}
catch (err) {
    console.log('There has been an error parsing your JSON.');
    console.log(err);
}

