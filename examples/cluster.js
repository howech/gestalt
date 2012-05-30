var gestalt = require('../lib/gestalt');
var ZooKeeper = require('zookeeper');


var config = new gestalt.ConfigContainer();
config.set("config:file", "./central.yaml");

var envMap = new gestalt.RemapConfig( { 
    mapper: {
	"CENTRAL_CONFIG":   "config:file",
	"CENTRAL_ZOOKEEPER":"zookeeper:options:connection",
	"CENTRAL_ELECTION": "zookeeper:election",
	"CENTRAL_NAME":     "zookeeper:names",
	"CENTRAL_CLUSTER":  "cluster:name"
    },
    original: new gestalt.ConfigEnv() 
});

var argsMap = new gestalt.RemapConfig( {					  
    mapper: {
	"config":    "config:file",
	"zookeeper": "zookeeper:options:connection",
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

    var cluster_url = "zk://"+zk_connect+"/"+cluster_name;
    var election_url = cluster_url + config.get("zookeeper:election");
    var names_url = cluster_url + config.get("zookeeper:name");
    var config_url = cluster_url + config.get("zookeeper:config");

    var zk_config = new gestalt.ZookeeperConfig({source: config_url, create_paths: true });

}

function name(zk, dir) {
    zk.a_get_children(
function election(zk, dir, me) {
    zk.a_get_children(dir, false, function(rc,err,children) {
	children.sort();
	var last = null;
        _.each(children, function(child) {
	    if(child == me ) {
		if( last ) {
		    watch_leader( zk, dir, me, "/chh/temp/" + last );
		} else {
		    become_leader(zk,me);
		}
	    } else {
		last = child;
	    }
	});
    });
}

zkc.zookeeper( function(zk) {
    console.log("creating temp node");
    zk.a_create("/chh/temp/node","stuff", ZooKeeper.ZOO_SEQUENCE + ZooKeeper.ZOO_EPHEMERAL ,function (rc, error, path)  {
        if (rc != 0) {
            console.log ("zk node create result: %d, error: '%s', path=%s", rc, error, path);
	} else {
	    // console.log("================== %s", path );
	    var me = path.match(/[^\/]+$/)[0];
	    console.log("My name is: %s", me);
	    var dir = "/chh/temp";
	    election(zk,dir,me);
	}
    });
});


//config.report();
