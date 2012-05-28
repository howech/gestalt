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

~~~

   var gestalt = require('gestalt');
   var options = {};
   var config = new gestalt.Configuration("Source", options );

   // config.set( name, value, source )
   config.set("x", 'stuff');   // source defaults to the config source
   config.set("y", 6, 'HERE'); // but source can be set per-value

   var x = config.get("x");  // returns 'stuff'
   var y = config.get("y");  // returns 6

~~~

Configuration names are hierarchical - use a ':' to delimit namespaces. 
The namespaces become nested Configuration objects.

~~~

   config.set("owner:name", 'Joe');
   config.set("owner:phone", '5551234');

   var ownerConfig = config.get('owner'); // another Configuration object
   var owner = ownerConfig.toObject();    // convert to a plain javascript object:
                                          // { name: 'Joe', phone: '5551234' }
 
~~~

Values can be primative values (numbers, strings, booleans,
etc.). Assignments of structured objects get destructured into nested
Configuration objects.

~~~

   config.set("neighbor", {name: 'Fred', phone: '5559876'} );
   var fred_phone = config.get( 'neighbor:phone' );

~~~

In many cases (not quite all...this is not yet supported for
RemapConfig objects...) it is possible to turn a configuration object
back into a regular object. In fact, if a configuration object looks
like an array (all integer keys...)  toObject will in fact return an
array.

## Events

Configuration objects are EventEmitters. When a value of a
configuration object changes, it emits a 'change' event.

~~~

   config.on('change', function( change) {
     console.log("name: %s, value: %s, old_value: %s, source: %s ",
        change.name, change.value, change.old_value, change.source);
   });

   config.set("owner:phone", "5554444", "phone book");
   // listener prints
   // name: owner:phone, value: 5554444, old_value: 5551234, source: phone book

~~~

You can also listen to events on the nested configuration objects. Note
that configuration names in the events are reported relative to the configuration
object you are listening to. 

## Containers

The ConfigContainer class gives you a way to set up a system of
defaults and overrides of configuration information that comes from
different sources. For instance, if you allow configuration parameters
to be set at the command line, in environment variables, or from a
configuration file, this class can help you out.

