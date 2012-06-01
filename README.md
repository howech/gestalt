# gestalt

Gestalt is a library for managing configuration information for
node.js applications. The main premise of gestalt is that the
underlying configuration for an application may change while the
application is still running. Gestalt gives you a framework detecting
and reacting to these changes without having to completely restart
your application.

There are a couple of motivations for gestalt. Configuration of a
large software system is often complicated - there are of course many
tools out there for gathering configuration information from a bunch
of different sources. nconf for node is a good one, and gestalt is to
some extent based upon it. There are a couple of things that many of
these tools do not do. First, configuration files (and other sources)
can change, and it would be nice to be able to react to these changes
on-the-fly. Second, when you have a sufficiently complicated system of
default and override configuration sources, it can become difficult to
figure out exactly where a particular setting came from. Gestalt
solves both of these problems. It has a per-value event change
tracking system so that you can track changes to individual settings
to your configuration. It also rigorously keeps track of where the 
values for particular settings came from.

## Basics

The basic object is a Configuration:

```javascript

var gestalt = require('gestalt');
var options = {source: 'Source'};
var config = new gestalt.Configuration( options );

// config.set( name, value, source )
config.set("x", 'stuff');   // source defaults to the config source
config.set("y", 6, 'HERE'); // but source can be set per-value

var x = config.get("x");  // returns 'stuff'
var y = config.get("y");  // returns 6

```

Configuration names are hierarchical - use a ':' to delimit namespaces. 
The namespaces become nested Configuration objects.

```javascript

config.set("owner:name", 'Joe');
config.set("owner:phone", '5551234');

var ownerConfig = config.get('owner'); // another Configuration object
var owner = ownerConfig.toObject();    // convert to a plain javascript object:
                                       // { name: 'Joe', phone: '5551234' }
 
```

Values can be primative values (numbers, strings, booleans,
etc.). Assignments of structured objects get destructured into nested
Configuration objects.

```javascript

config.set("neighbor", {name: 'Fred', phone: '5559876'} );
var fred_phone = config.get( 'neighbor:phone' );

```

In many cases (not quite all...this is not yet supported for
RemapConfig objects...) it is possible to turn a configuration object
back into a regular object. In fact, if a configuration object looks
like an array (all integer keys...)  toObject will in fact return an
array.

## Events

Configuration objects are EventEmitters. When a value of a
configuration object changes, it emits a 'change' event.

```javascript

config.on('change', function( change) {
    console.log("name: %s, value: %s, old_value: %s, source: %s ",
        change.name, change.value, change.old_value, change.source);
});

config.set("owner:phone", "5554444", "phone book");
// listener prints
// name: owner:phone, value: 5554444, old_value: 5551234, source: phone book

```

You can also listen to events on the nested configuration objects. Note
that configuration names in the events are reported relative to the configuration
object you are listening to. 

## Containers

The ConfigContainer class gives you a way to set up a system of
defaults and overrides of configuration information that comes from
different sources. For instance, if you allow configuration parameters
to be set at the command line, in environment variables, or from a
configuration file, this class can help you out.

```javascript

var override = new gestalt.Configuration({source: "Override"});
var def = new gestalt.Configuration({source: "Default"});
var container = new gestalt.ConfigContainer({source: "Container"});

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

```

## Remap Configs

Configuration files are often structured, while environment variables
and command line arguments are usually not structured. However, it is
often the case that a program will use an environment variable or a
command line argument to override a setting in a structured
document. RemapConfig objects give you a formal way to show exactly
what part of the structure a given command line argument will override.

The constructor for RemapConfig expects to see a couple of options in
the options argument. First, it needs a reference to the original
configuration object that is being remapped. Second, it needs a function
that will map names from the original object into the new object space.

```javascript

var gestalt       = require('../lib/gestalt'),
    Configuration = gestalt.Configuration,
    RemapConfig   = gestalt.RemapConfig; 


function mapper(old) {
    // map names that start with "f" to
    // new:<old_name>
    if( old.match(/^f/ )) {
	return "new:" + old;	
    } else {
	// ignore everything else
	return undefined;
    }
}

var c = new Configuration();
c.set("foo",1);
c.set("gak",4);

var r = new RemapConfig( { mapper: mapper, original: c } );

console.log( r.get('new:foo') );
// prints out "1"

```

Not surprisingly, there are a couple of restrictions on this type of
configuration object. First, it is read only. Second, the remapper
function can show that it ignores part of the object space by
returning undefined for some values. For the rest of the values, it
must make sure to return unique new names for different old names.
Third, the toObject function does not try to detect array-like
objects.

Remapped objects do pass on events, and can be used as overrides or
defaults in a config container. 

## API

### Configuration

A Configuration object is a container of name value pairs. The names 
can include colon separated hierarchical namespaces. 

#### constructor Configuration( options )

Creates a configuration object. Options include

##### source

The default source for changes to this object. If no source is given 
for a set operation on the Configuration, the default is used instead.
Note that only the initial value of this option is important. If it 
is changed with the options() method, it will not change the default
source for an object.

##### destructure_assignments

By default, this option is on. When turned on, if you try to assign
an object or an array to a name in the configuration, it will destructure
the object into nested namespace structures.

#### get(name)

Returns the value assigned to `name`, or undefined if not
present. Namespaces are separated by colons. If name is an array, it
is treated the same as if it were a single string joined together by
colons.

#### getValSource(name)

The same as get, only instead of the assigned value, it returns an object
that contains a value and a source field. The value is the same as 
the value one would expect from get. The source field contains the 
source of the value.

#### set(name, value, source)

Sets the value of name. If no source is given, the default source for
the Configuration is used. If the configuration object does not have a
default source, then the source becomes a reference to the line number
and file of the function calling set.

#### update(name, value, source)

For standard Configuration objects, update works the same as set. For
ConfigContainers, update and set have different behaviors.

#### has(name)

Returns true if there is a value defined for the given name.


#### keys()

Returns an array containing all of the keys that have assigned values
in the configuration.

#### each( function( value, name, configuration ) ) 

Iterates through the keys and values of the configuration, calling
the supplied function once for each setting.

#### remove(name)

Deletes the name from the configuration.

#### report

Generates a detailed report of all of the names.

#### toObject

Builds a javascript object representing the current state of the
Configuration. Namespaces are converted to nested objects. If a
namespace has the appearance of an array in that its internal names
are sequential numbers starting with 0, it will be converted into an
array instead of a regular object.

#### options( options )

Returns the options object for the Configuration. If passed an object,
it will use it to override the existing options. Note that changing
the options of a Configuration does not change the options of existing
nested namespace configurations, but it will affect any namespaces
created after the change.
