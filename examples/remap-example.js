var gestalt       = require('../lib/gestalt'),
    Configuration = gestalt.Configuration,
    RemapConfig   = gestalt.RemapConfig; 


function mapper(old) {
    // map names that start with "f" to
    // new:<old_name>
    if( old.match(/^f/ )) {
	return "new:" + old + ':0';	
    } else {
	// ignore everything else
	return undefined;
    }
}

var c = new Configuration();
c.set("foo",1);
c.set("fab",2);
c.set("far:blah",3);
c.set("gak",4);

var r = new RemapConfig( { mapper: mapper, original: c } );

console.log( r.get('new:foo:0') );
// prints out "1"

console.log( r.toObject() );
