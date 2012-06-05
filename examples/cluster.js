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
	    z: { alias:    'zookeeper',
		 describe: 'Zookeeper connect string (zk://host1:2181,host2:2182)'
	       },
	    c: { alias:    'config',
		 describe: 'Configuration file'
	       },
	    C: { alias:    'cluster',
		 describe: 'Name of the cluster to join.'
	       },
	    e: { alias:    'election',
		 describe: 'Zookeeper node under the cluster node to use for negotiation of the cluster leader.'
	       },
	    n: { alias: 'names',
		 describe: 'Zookeeper node under the cluster node to use for negotiation of node names.'
	       }
	}
    })
});

var zookeeper = new gestalt.Configuration(); // Placeholder for zookeeper config to come

// Build the main config object
config.addDefault( zookeeper );
config.addOverride( envMap );
config.addOverride( argsMap );

config.patternListen(/^cluster:name$/, function(change) {
    if(change.value) {
	join_cluster();
    }
});    

config.patternListen(/^zk:children:leader:data$/, function(change) {
    if( change.value ) {
	console.log( change.value, "is now leader.");
    } else {
	console.log("There is no leader.");
    }
});

function election_path() {
    return "/" + config.get("cluster:name" ) + config.get("zookeeper:election" );
}

function config_path() {
    return "/" + config.get("cluster:name" ) + config.get("zookeeper:config" );
}

function names_path() {
    return "/" + config.get("cluster:name" ) + config.get("zookeeper:names" );
}


// Our name in the cluster is stored at cluster:me
config.patternListen(/^cluster:me$/, function(change) {
    if(change.value) {
	var name = change.value;
	console.log( "I am", name );
	var zk_config = config.get("zk");
	// having a name set should indicate that
	// we have a valid zk_config
	if( !zk_config ) {
	    throw new Error("Expected a zk_config");
	}

	zk_config.zookeeper( function(zk) {
	    zk_cast_ballot(zk,election_path(), name, function() {
		// become leader
		console.log("I am leader");		
		zk.a_create( config_path() + "/leader", config.get("cluster:me"), 1, function(rc,err,path) {
		    if(rc) {
			throw new Error("Error becoming leader" + err);
		    }
		});
	    });
	});	
    }
});



//console.log( require.resolve( config.get('config:file')));
var file = new gestalt.ConfigFile( { source: require.resolve( config.get( 'config:file' ) ),
				     watch: true,
				     format: 'yaml'
				   } );


file.on('ready', on_load_config_file );
file.on('invalid', function(err, source) {
    console.log(err,source);
});
config.addDefault( file );


function on_load_config_file() {
    join_cluster();
}


// This is the cluster that we are currently
// a member of or trying to become a member of.
var current_cluster;

function join_cluster() {
    // This method currently gets triggered
    // a few time. We must ensure that there is in fact a cluster name
    // and some names to choose from before we really start to join.
    var cluster_name = config.get("cluster:name");
    if( ! cluster_name ) {
	//console.log("missing cluster name.");
	// Maybe we will get one later...
	return;
    }

    var names = config.get("names");
    if( !names ) {
	//console.log("no names to choose from");
	return;
    }

    // If we are already trying to join this cluster, dont
    // start over.
    if( cluster_name == current_cluster ) {
	return;
    }

    // Make it official - we are trying to join a new cluster.
    current_cluster = cluster_name;
    console.log("\nJoining cluster: %s", cluster_name);

    var zk_config = config.get("zk");
    if( zk_config ) {
	// Clean up old zk_config object
	zk_config.zookeeper( function(zk) { zk.close(); });
    }
    var zk_connect = config.get("zookeeper:options:connect");


    var config_url = zk_connect + config_path();

    // set up zk_config object
    zk_config = new gestalt.ZookeeperConfig({
	source: config_url, 
	create_paths: true,
	format: 'raw'
    }).on('invalid', function(err) { 
	console.log(err) ;
    });
    
    zookeeper.set( "zk", zk_config );
 
    // Negotiate a name

    zk_config.zookeeper( function(zk) { 
	zk_name_me(zk, names_path(), names.toObject(), function(name) {
	    config.set("cluster:me",name);
	}); 
    });
}


// Zookeeper Stuff
//
// Negotiate a unique name
function zk_choose_name(zk,dir,names,cb) {
    zk.a_get_children(dir,false,function(rc,err,children) {
	var n1 = _.without(names,children);
	if( n1.length == 0) {
	    throw new Error("unable to get a name");
	} else {
	    var name = n1[ Math.floor( Math.random() * n1.length ) ];
	    zk.a_create( dir+"/"+name, "", 1, function(rc,err,stat,path) {
		if(rc) {
		    zk_choose_name(zk,dir,names,cb);
		} else {
		    cb( name );
		}
	    });
	}
    });
}    

// Start negotiations for a name
function zk_name_me(zk,dir,names,cb) {
    zk_ensure_path(zk, dir, function(err) {
	if(err) {
	    throw err;
	}
	zk_choose_name(zk,dir,names,cb);
    });
} 

// Watch the guy in front of us in line for the throne
function zk_watch_leader(zk,dir,me,path,cb) {
    var lw = function(type, state, p){
	if( type == ZooKeeper.ZOO_CHANGED_EVENT ) {
	    zk.aw_get( path, lw, function() {} );
	} else if( type == ZooKeeper.ZOO_DELETED_EVENT ) {	    
	    // Our sentinal disappeared - this could mean that 
	    // we are now the leader, or it could mean that we
	    // need to watch someone else.
	    zk_election(zk,dir,me,cb);
	} else if( type == ZooKeeper.ZOO_SESSION_EVENT ) {
	    //console.log("Session problem!");
	    // zk will keep our callback around - no need to re-establish.
	} else {
	    console.log( "Unkown type: " + type );
	    throw new Error("Unknown change type");
	} 
    };
    zk.aw_get( path, lw, function() {} ); 
}

// Try to become leader, or determine who is in line before us.
function zk_election(zk, dir, me, become_leader) {
    if(!become_leader) {
	throw new Error("zk_election must have a callback");
    }
    zk.a_get_children(dir, false, function(rc,err,children) {
	children.sort();
	var last = null;
        _.find(children, function(child) {
	    if(child == me ) {
		if( last ) {
		    zk_watch_leader( zk, dir, me, dir + "/" + last, become_leader  );
		} else {
		    // become leader
		    become_leader();
		}
		return true;
	    } else {
		last = child;
		return false;
	    }
	});
    });
}

// Start negotating for leadership
function zk_cast_ballot(zk,dir,name,become_leader) {
    zk_ensure_path(zk, dir, function(err) {
	if(err) {
	    throw err;
	}
	zk.a_create(dir + "/n",name, ZooKeeper.ZOO_SEQUENCE + ZooKeeper.ZOO_EPHEMERAL,function (rc, error, path)  {
	    if (rc != 0) {
		throw new Error("Unable to create ballot node");
 	    } else {
 		var me = path.match(/[^\/]+$/)[0];
 		zk_election(zk,dir,me,become_leader);
 	    }
	});
    });
}

function zk_ensure_path(zk, path, cb ) {
    var segments = path.split('/');
    segments.shift();
    p = "";
    var next = function(rc,err,pth) {
	if( rc && rc != ZooKeeper.ZNODEEXISTS ) {
	    cb( new Error("Unable to create node: " + path ) );
	} else {
	    if( segments.length > 0 ) {
		p = p + "/" + segments.shift();
		zk.a_create( p, '', 0, next );
	    } else {
		cb();
	    }
	}
    };
    next();
}
// CTRL-C twice quickly to exit
//        once to dump a status report

var setup_exit = function() {
    f = function() { process.exit(); }
    process.removeAllListeners('SIGINT');
    process.on('SIGINT', f );
    setTimeout( function() { 
	process.removeListener('SIGINT', f); 
	setup_report();
        config.report();
    }, 300);
};

var setup_report = function() {
    process.on('SIGINT', function () {
        setup_exit();
    });
};

setup_report();

