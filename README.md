# gestalt

Gestalt is a library for managing configuration information for
node.js applications. The main premise of gestalt is that the
underlying configuration for an application may change while the
application is still running. Gestalt provides a framework detecting
and reacting to these changes without having to completely restart
your application.

There are a couple of motivations for gestalt: Configuration of a
large software system is often complicated - there are of course many
tools out there for gathering configuration information from a bunch
of different sources. nconf for node is a good one, and gestalt is to
some extent based upon it. Gestalt is also influenced by configliere
for ruby and the configuration node structure of chef. However, there
are a couple of things that many of these tools do not do well. First,
configuration files (and other sources) can change, and it would be
nice to be able to react to these changes on-the-fly. Second, for a
sufficiently complicated system of default and override configuration
sources, it can become difficult to figure out exactly where a
particular setting came from. 

Gestalt solves both of these problems. It has a per-value event change
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
etc.). By default, assignments of structured objects get destructured into nested
Configuration objects.

```javascript

config.set("neighbor", {name: 'Fred', phone: '5559876'} );
var fred_phone = config.get( 'neighbor:phone' );

```

( The default destructuring of assignments can be disabled. See 
the destructure_assignments and destructure_arrays options, below. )

It is possible to turn a configuration object back into a regular
object. Also, if a configuration object looks like an array (all
integer keys...)  toObject will in fact return an array.

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

The nested configuration objects are also event emitters. Note that
the configuration names in the events are reported relative to the
configuration object being listening to.

Configuration objects also have a ready/invalid/other state. When
everything about the configuration is loaded the way it expects that
it should be, it enters a 'ready' state.  If something has gone wrong
in a way that might require some attention, it enters an 'invalid'
state. Other states are possible - most configuration objects start in
a 'not ready' state, but particular implementations might add some other
special states. 

State propagates from children to parents and from contained objects
to containers.  The parent/container will become invalid if any of its
children/contents become 'invalid'. Also, a parent/container will only become
'ready' if all of its children/contents are 'ready'. If no sub-configuration
is invalid, but not all of them are ready, parents and containers become
'not ready'. 

On state transitions (and whenever further 'invalid' states are
encountered) configuration objects will emit a 'state' message. The
payload object is of the form:

```javascript
{ state: 'ready',
  old_state: 'not ready',
  data: 'arbitrary data that might help explain the transition'
}
```

To reiterate, there are three main states a Configuration object can
be in:

- 'ready' This means that there were no problems getting to the
   configuration data. You can read data from it, and set up
   listeners. Note that a configuration can only be in a ready
   state if all of its dependencies are also ready.

- 'invalid' Something has gone wrong. We may not be able to get in
  contact with the data source, or there may have been a problem
  parsing the data. In any case, the data contained in the
  configuration object may be corrupt, out of date, or wrong. When a
  configuration object goes into an 'invalid' state, the program should
  stop consuming configuration data from the object and seek a way to remedy
  the invalid state. If any of an objects depencencies is in an invalid
  state, the object will also be invalid.

- 'not ready', (and others). The configuration object is not ready for reads.
  It will send out another 'state' event when it is ready or when something
  actually goes wrong. 'not ready' states are not an error state, but while
  a configuration is in a 'not ready' state, you may not be able to rely on
  the contents to be accurate, up to date, or even present.


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

The mapper can be a function as above, or it can be a simple
java object with old values as keys and new values as corresponding
values. Keys not present in the object will be mapped out of the
RemapConfig.

Not surprisingly, there are a couple of restrictions on this type of
configuration object. First, it is read only. Second, the mapper
function can show that it ignores part of the object space by
returning undefined for some values. For the rest of the values, it
must make sure to return unique new names for different old names.

Remapped objects do pass on events, and can be used as overrides or
defaults in a config container. 

## API

### Configuration 

A Configuration object is a container of name value pairs. The names 
can include colon separated hierarchical namespaces. 

- constructor Configuration( options )

 Creates a configuration object. Options include

 - source

  The default source for changes to this object. If no source is given
  for a set operation on the Configuration, the default is used
  instead.  Note that only the initial value of this option is
  important. If it is changed with the options() method, it will not
  change the default source for an object.

 - destructure_assignments

  By default, this option is on. When turned on, if you try to assign
  an object or an array to a name in the configuration, it will
  destructure the object into nested namespace structures.

 - desctructure_arrays

  This option is similar to destructure_assignments, only it only controls
  whether or not to destructure array objects. It is true by default - when changed
  to false, arrays will be valid configuration values.

  Note, if you turn off destructure_arrays or destructure_assignments, the configuration
  object will not react to internal changes in the structured values. In particular;

```javascript

  config.set("a",[1,2,3]); // emits a change
  congig.get("a")[0] = 7   // !!! does not emit a change !!!

```

 - initial_state

  State to transition to after initialization. Defaults to 'ready' for
  many configuration objects. Defaults to 'not ready' for files,
  zookeeper, and other objects that load asynchonously. Note that the
  configuration object is created in a 'not ready' state, and the
  transizion to its initial_state actually happens in the next tick after
  creation.

#### Methods

- get(name)

 Returns the value assigned to 'name', or undefined if not
 present. Namespaces are separated by colons. If name is an array, it
 is treated the same as if it were a single string joined together by
 colons.

- getValSource(name)

 The same as get, only instead of the assigned value, it returns an
 object that contains a value and a source field. The value is the
 same as the value one would expect from get. The source field
 contains the source of the value.

- set(name, value, source)

 Sets the value of name. If no source is given, the default source for
 the Configuration is used. If the configuration object does not have
 a default source, then the source becomes a reference to the line
 number and file of the function calling set.

- update(name, value, source)

 For standard Configuration objects, update works the same as set,
 except that if no source is provided in the update call, the
 configuration's default source is not used. For ConfigContainers,
 update and set have different behaviors.

- has(name)

 Returns true if there is a value defined for the given name.

- keys()

 Returns an array containing all of the keys that have assigned values
 in the configuration.

- each( function( value, name, configuration ) ) 

 Iterates through the keys and values of the configuration, calling
 the supplied function once for each setting.

- remove(name)

 Deletes the name from the configuration.

- report( )

 Generates a detailed report (on console.log) of all of the names.

- toObject()

 Builds a javascript object representing the current state of the
 Configuration. Namespaces are converted to nested objects. If a
 namespace has the appearance of an array in that its internal names
 are sequential numbers starting with 0, it will be converted into an
 array instead of a regular object. The resultant object will not
 generate any events and will not have source attribution.

- options( options )

 Returns the options object for the Configuration. If passed an
 object, it will use it to override the existing options. Note that
 changing the options of a Configuration does not change the options
 of existing nested namespace configurations, but it will affect any
 namespaces created after the change.

- addPatternListener(pattern, callback ) 

 Calls the callback whenever there is a change to the configuration
 that matches the pattern. Pattern could be a string, or a regex, in
 which cases match means that the name of the changed value either
 equals the string or matches the regex respectively. Pattern could
 also be a function which return a truthy value if the change matches
 its criteria.

- removePatternListener( callback )

Removes a previously added listener callback.

- state( state, data )

If no arguments are given, it returns the current state of the object.
If a state it given, it transitions the configuration to that
state. If the object's state has actually changed (or if we get
another 'invalid' when it was already in an invalid state) it will
emit a 'state' event, passing the data argument on in the state change
payload along with the new and old states.

#### Events

- change 

 Change events are emitted whenever the Configuration object detects
 that something has changed in the data. The handlers to these events
 are passed an object describing the change:

 ```javascript
  change = { name: "a:b:c",        // name of the value that changed
             value: 5,             // the new value
             old_value: undefined, // old value
             source: "X"};         // the source of the change or the last value (for deletions)
 ```

- state

When the object's state changes between 'invalid', 'ready' and 'not
ready', it will emit 'state' events of the form:

```javascript
 
  state = { state: 'ready',          // new state value
            old_state: 'invalid',    // state we are transitioning to
            data: 'good now'         // data passed in by the config.state() method.
          };
```

### ConfigContainer

gestalt's mechanism to deal with the notion of default and override
behavior is implemented in the ConfigContainer object.  ConfigContainers
contain a list or priority ordered configuration objects. Calling 'get(name)'
on the ConfigContainer will return the value assigned to the highest priority
configuration that has a value set for that name. 

- constructor ConfigContainer( options )

 Takes the same options as a Configuration object, but will also accept

 -config
  
  A configuration object to act as the 'normal' object. See 'set' and
  'update' below.  If no config option is given, a new object will be
  created as the 'normal' object;

#### Methods

All of the public methods of the Configuration object should work on a
ConfigContainer, however the semantics of a few of them are a little
different.

- get(name)

 Returns the value associated with the name of the highest priority
 object containing a defined value for the name. Actually, the real
 contract is that the results of get will agree with the latest change
 event for the object, which is effectively the highest priority
 contained object's values, with the following caveat: unlike regular
 Configuration objects, it is not well defined what will happen if you
 get an intermediate Configuration value.

```javascript
var container = new gestalt.ConfigContainer();
container.set("a:b:c",7);
container.get("a:b:c") // returns 7
container.get("a:b") // unspecified
```

- set(name, value, source)

 Calls 'set' on the 'normal' priority configuration object.

- update(name, value, source)

 Calls 'update' on the highest prior configuration that has a value
 already set for 'name'. If none have defined 'name', then call 'update'
 on the 'normal' priority object.

- keys()

 Returns the union of all of the keys in all of the contained configuration
 objects.

- has(name)

 Returns true if the name is in the result of calling keys()

- each()

 Works the same as Configuration's each method, but the values are as
 determined by the highest priority configuration object that has a
 value for the given key.

- addOverride( config )

 Adds a configuration object to the priority list of configurations
 as the highest priority object.

- addDefault( config )

 Adds a configuration object to the priority list as the lowest
 priority config object.

### RemapConfig

The RemapConfig object provides a way to change the names of a
configuration without changing the values. This useful for changing
the names that come from environment variables or command line
variables into names that match up with the configuration hierarchy
established in a configuraiton file - making it possible to use
the override and default behaviors from a ConfigContainer object.

- constructor RemapConfig( options )

 Takes the same options as a Configuration object, but will also accept

 -config (mandatory)

 The configuration object to remap.

 -mapper (mandatory)

 Specifies how to remap configuration names. This can either be a
 function of the form:

```javascript

remap = function(old_value) {
    var new_value = "a:b:c:" + old_value;
    return new_value;
}

```

 or it can be a flat javascript object with old names as keys and new
 names as values.

 Names that get mapped to 'undefined' by a remap function, or that are
 not present in the remap object, will simply not be included in the
 resultant object.

### Methods

All of the Configuration public methods are supported, with the following
additions and modifications:


 - original()

 Returns a reference to the unmapped configuration object.

 - set()

 Does nothing - remap objects are read only at this time.
 
 - update()

 Does nothing - remap objects are read only at this time.

 - remove()

 Does nothing - remap objects are read only at this time.

### ConfigArgs

This is a standard Configuration object that pulls its name and value
pairs from parsing the command line arguments with the optimist
library. In addition to the standard configuration options, it will also
accept the following:

 - argv

 Use the array instead of the arguments in process.argv

 - optimist_usage

 String to pass on to optimist as a usage string. ( Uses optimist's
 "usage" method. )

 - optimist_options

 Object to pass on to optimist as a configuration options. ( Uses
 optimist's "usage" method. )


### ConfigEnv

This is a standard Configuration object that pulls its name and value
pairs from parsing the environmental variables. In addition to the
standard configuration options, it will also accept the following:


 - env

Use this set of name value pairs instead of process.env.

### ConfigFile

This is a standard Configuration object that draws its names and values
from a configuration file. In addition to the standard options, ConfigFiles
accept the following:

 - format

Tells what format the file is in. Current options are 'json', 'yaml'
and 'ini'. By default, the format will be 'auto', which will try to guess
the format of the file based on its file extension. If you specify 'raw'
as a format, the contents of the file will be added as a string to the
'contents' name of the configuration object.

 - parser

Normally, the format of the file determines what to use as a parser. This option
can be used to override exactly how to turn the contents of a file into
configuration. It should be a function that can accept the data from a file read
and convert it into a raw javascript object. 

 - source

Tells what file to read - gets passed to fs.readFile.

 - watch

Boolean. If set to true, the constructed ConfigFile object will set up
a watch for changes to the underlying file. If it changes on disk,
ConfigFile will reload the file and update any changed values.

### ZookeeperConfig

ZooKeeper (http://zookeeper.apache.org/) is "a centralized service for
maintaining configuration information, naming, providing distributed
synchronization, and providing group services". The ZookeeperConfig
object assists in integrating zookeeper services into an overall configuration
package. 

ZookeeperConfig does not really assist with writing information to zookeeper,
only to reacting to information as it changes on the zookeeper servers. 

Much like the ConfigFile object, the ZookeeperConfig object is just a standard
Configuration object with a couple of extra options and methods.

This configuration object relies on the 'zookeeper' npm package. This dependency 
is not listed in the gestalt package dependencies, and is only required when
a ZookeeperConfig object is first instantiated.

Zookeeper has a slightly different idea about hierarchy from other
configuration systems: in general every node can have both a value and
children. ZookeeperConfig manages this by adding two sub-configuration
objects to a configuration representing a a zookeeper node - one
called 'data' and the other called 'children'. 'data' will contain
whatever comes back from parsing the data in the zookeeper
node. 'children' contains names corresponding to the relative names of the 
zookeeper nodes children and values of more ZookeeperConfig objects
corresponding to the zookeeper child nodes.

- constructor ZookeeperConfig( options )

The options are the same as for Configuration with the following additions:

- source 

The source should be a string of the form 'zk://host1:port1,host2:port2/path/to/config'.

- format

What format is the data stored in on zookeeper nodes. 'raw' means that
the data for a given node will be placed in a javascript string object and
stored under the name "data" for that node. Other options are 'json', 'ini',
and 'yaml'. 

- parser

The same as for ConfigFile - you can provide your own parser.

- zookeeper

Use this option to hand off an existing zookeeper connection

- zookeeper_options

If the ZookeeperConfig object is to create its own zookeeper
connection, these options will be passed to the constructor for
ZooKeeper (from the npm package).

- create_paths

Boolean. If true, once connected to zookeeper, ZookeeperConfig will
create the path of the zookeeper node it is trying to listen to, if 
it is not already there.

- include_stat

Boolean. If true, zookeeper nodes will include a 'stat' name in addition
to 'data' and 'children'. The stat object will contain the stats reported
by the node's data callback.

#### Methods

- zookeeper( function(zk) )

The callback will be called when a zookeeper connection becomes
available, or immediately if it is already available. This method can
be used to make zookeeper calls on the same connection that is being
used by the ZookeeperConfig object.


