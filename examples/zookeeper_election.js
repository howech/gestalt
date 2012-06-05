var gestalt = require('../lib/gestalt');
var ZookeeperConfig = gestalt.ZookeeperConfig;
var ZooKeeper = require('zookeeper');
var _ = require('underscore');
var name = null;

var zkc = new ZookeeperConfig({ source: 'zk://localhost:2181/chh/xxx', format: 'raw'});

zkc.on('change', function(obj) {
// if( obj.name == "children:leader:data" ) {
//	console.log("change: %j", obj );
//    }
});

zkc.patternListen( /^children:leader:data$/, function( change ) {
    console.log("change %j",change);
});

zkc.on('ready', function(a,b) {
    console.log("ready");
});

zkc.on('invalid', function(a,b) {
    //console.log("invalid: %s %s",a,b);
});

function become_leader(zk,me) {
    console.log(">>>>>>>>>>>>>>>>>>>>> I AM THE LEADER <<<<<<<<<<<<<<<<<<<<<<<<<<<");
    zk.a_create("/chh/xxx/leader", me, ZooKeeper.ZOO_EPHEMERAL ,function (rc, error, path)  {
    });
}

function watch_leader(zk,dir,me,path) {
    var lw = function(type, state, p){
	if( type == ZooKeeper.ZOO_CHANGED_EVENT ) {
	    zk.aw_get( path, lw, function() {} );
	} else if( type == ZooKeeper.ZOO_DELETED_EVENT ) {	    
	    // Our sentinal disappeared - this could mean that 
	    // we are now the leader, or it could mean that we
	    // need to watch someone else.
	    election(zk,dir,me);
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

var setup_exit = function() {
    f = function() { process.exit(); }
    process.removeAllListeners('SIGINT');
    process.on('SIGINT', f );
    setTimeout( function() { process.removeListener('SIGINT', f); setup_report();}, 300);
};

var setup_report = function() {
    process.on('SIGINT', function () {
        zkc.report("  ");
        setup_exit();
    });
};

setup_report();

setTimeout( function() {console.log("10 seconds...");} , 10000);

