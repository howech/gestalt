var gestalt = require('../lib/gestalt');
var ZooKeeper = require('zookeeper');
var _ = require('underscore');

var config = new gestalt.ConfigContainer();
config.set("config:file", "./central.yaml");

var envMap = new gestalt.RemapConfig( { 
    mapper: {
	"CENTRAL_CONFIG":   "config:file",
	"CENTRAL_ZOOKEEPER":"zookeeper:options:connect",
	"CENTRAL_ELECTION": "zookeeper:election",
	"CENTRAL_NAME":     "zookeeper:names",
	"CENTRAL_CLUSTER":  "cluster:name"
    },
    original: new gestalt.ConfigEnv() 
});

var argsMap = new gestalt.RemapConfig( {					  
    mapper: {
	"config":    "config:file",
	"zookeeper": "zookeeper:options:connect",
	"election" : "zookeeper:election",
	"names":     "zookeeper:names",
	"cluster":   "cluster:name"
    },
    original: new gestalt.ConfigArgs( {
	optimist_options: {
	    z: { alias: 'zookeeper' },
	    c: { alias: 'config' },
	    e: { alias: 'election' },
	    n: { alias: 'names' },
	    C: { alias: 'cluster' }
	}
    })
});

var zookeeper = new gestalt.ConfigContainer(); // Placeholder for zookeeper config to come

// Build the main config object
config.addDefault( zookeeper );
config.addOverride( envMap );
config.addOverride( argsMap );

console.log( require.resolve( config.get('config:file')));
var file = new gestalt.ConfigFile( { source: require.resolve( config.get( 'config:file' ) ),
				     watch: true,
				     format: 'yaml'
				   } );


file.on('loaded', on_load_config_file );
file.on('invalid', function(err, source) {
    console.log(err,source);
});
config.addDefault( file );

function on_load_config_file() {
    var zk_connect = config.get("zookeeper:options:connect");
    var cluster_name = config.get("cluster:name");
    
    var cluster_url = zk_connect+"/"+cluster_name;
    var election_path = "/" + cluster_name + config.get("zookeeper:election");
    var names_path = "/" + cluster_name + config.get("zookeeper:names");
    var config_url = cluster_url + config.get("zookeeper:config");
    
    console.log(config_url);
    var zk_config = new gestalt.ZookeeperConfig({source: config_url, create_paths: true });
    
    zookeeper.addDefault( zk_config );
    
    zk_config.zookeeper( function(zk) { 
	zk_name_me(zk, names_path, config.get("names").toObject(),
		   function(name) {
		       console.log("I am",name);
		       config.set("cluster:me",name);
		   } 
		  ); 
    });
    
    config.patterListener( /^cluster;me$/, function(change) {
	if(change.value) {
	    var name = change.value;
	    zk_cast_ballot(zk,election_path,name);
	}
    });
}

function zk_choose_name(zk,dir,names,cb) {
    zk.a_get_children(dir,false,function(rc,err,children) {
	var n1 = _.without(names,children);
	if( n1.length == 0) {
	    console.log("unable to get a name");
	} else {
	    var name = n1[ Math.floor( Math.random() * n1.length ) ];
	    zk.a_create( dir+"/"+name, "", 1, function(rc,err,stat,path) {
		if(rc) {
		    zk_choose_name(zk,dir,names);
		} else {
		    cb( name );
		}
	    });
	}
    });
}    

function zk_name_me(zk,dir,names,cb) {
    zk.a_create( dir, '', 0, function(rc,err,path) {
	if(rc && rc != -110 ) {
	    console.log({rc:rc, err:err, path:path});
	} else {
	    zk_choose_name(zk,dir,names,cb);
	}
    });
} 

function zk_watch_leader(zk,dir,me,path) {
    var lw = function(type, state, p){
	if( type == ZooKeeper.ZOO_CHANGED_EVENT ) {
	    zk.aw_get( path, lw, function() {} );
	} else if( type == ZooKeeper.ZOO_DELETED_EVENT ) {	    
	    // Our sentinal disappeared - this could mean that 
	    // we are now the leader, or it could mean that we
	    // need to watch someone else.
	    zk_election(zk,dir,me);
	} else if( type == ZooKeeper.ZOO_SESSION_EVENT ) {
	    //console.log("Session problem!");
	    // zk will keep our callback around - no need to re-establish.
	} else {
	    console.log( "Unkown type: " + type );
	    //zk.aw_get( path, lw, function() {} );
	} 
    };
    zk.aw_get( path, lw, function() {} ); 
}

function zk_election(zk, dir, me) {
    zk.a_get_children(dir, false, function(rc,err,children) {
	children.sort();
	var last = null;
        _.each(children, function(child) {
	    if(child == me ) {
		if( last ) {
		    watch_leader( zk, dir, me, dir "/" + last );
		} else {
		    console.log("I am leader");
		}
	    } else {
		last = child;
	    }
	});
    });
}

    function zk_cast_ballot(zk,dir,name,cb) {
    console.log("creating temp node");
    zk.a_create(dir ,name, ZooKeeper.ZOO_SEQUENCE + ZooKeeper.ZOO_EPHEMERAL,
        function (rc, error, path)  {
            if (rc != 0) {
		console.log ("zk node create result: %d, error: '%s', path=%s", rc, error, path);
 	    } else {
 		var me = path.match(/[^\/]+$/)[0];
 		console.log("My name is: %s", me);
 		var dir = "/chh/temp";
 		zk_election(zk,dir,me,cb);
 	    }
	});
    });


//config.report();
