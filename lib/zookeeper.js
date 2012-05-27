
var Configuration = require('./config').Configuration,
    _ = require('underscore'),
    ZooKeeper = null, 
    parsers = require('./format').parsers,
    util = require('util');

function ZookeeperConfig(source, options ) {

    if( !ZooKeeper ) {
	ZooKeeper = require('zookeeper');
    }

    var self = this;
    this._zk_pending_ = [];

    ZookeeperConfig.super_.call(this, source, options);    
    
    var m = source.match(/^zk:\/\/(([^:\/]+:\d+)+)(.*)$/);
    this._connect_ = m[1];
    this._path_ = m[3];

    //console.log( this._connect_ );
    //console.log( this._path_ );

    var format = this._options_.format;
    if( format ) {
        this._options_.parser = this._options_.parser || parsers[ format ];
    }

    var zk;
    if( this._options_.zookeeper ) {
	// use provided connection to zookeeper if it exists
	zk = this._options_.zookeeper;
    } else {
	// create a new connections
	zk = new ZooKeeper({
            connect: this._connect_,
            timeout: this._options_.timeout,
	    debug_level: this._options_.debug_level || ZooKeeper.ZOO_LOG_LEVEL_WARNING,
	    host_order_deterministic: false
        });
	this._options_.zookeeper = zk;
    }
    var watch_cb, data_cb, child_watch_cb, child_cb;

    watch_cb = function(type, state, path) {
	    //  ZOO_DELETED_EVENT: 2,

	if( type == ZooKeeper.ZOO_CHANGED_EVENT ) {
	    zk.aw_get( self._path_, watch_cb, data_cb );
	} else if( type == ZooKeeper.ZOO_DELETED_EVENT ) {
	    self.emit('deleted', "zk node deleted", self._source_ );
	} else if( type == ZooKeeper.ZOO_SESSION_EVENT ) {
	    self.emit('invalid', "lost zk connection", self._source_ );
	} else {
	    console.log( "Unkown type: " + type );
	}
    };

    data_cb = function(rc, error, stat, data) {
	//console.log(stat)
	if(rc) {
	    self.emit('invalid', error, self._source_);
	    return;
	} else {
	    //console.log( "got data ", data.toString() );
	    var object;
	    var parser = self._options_.parser || JSON.parse;
	    try {
		object = parser(data);
	    } catch(e) {
		self.emit('invalid', e, self._source_ );
		return;
	    }
	    self.set('data', object, self._source_ + "&version=" + stat.version );
	    
	    // Emit a 'loaded' event.
            self.emit('loaded');
	}
    };

    child_cb = function(rc, error, children ) {
	if(rc) {
	    self.emit('invalid', error, self._source_);
	    return;
	} else {
	    //console.log( "got children ", children );
	    var chnode = self.get("children");
	    if(chnode) {
		_.each( chnode._values_, function(val, child ) { val._doomed_ = true; });
		_.each( children, function(child) { if( chnode._values_[child]) { delete chnode._values_[child]._doomed_ } } );
		var doomed = [];
		_.each( chnode._values_, function(val, child ) {if( val._doomed_ ) { doomed.push(child);} });
		//console.log("doomed ",doomed);
		_.each( doomed, function(child ) {chnode.remove(child);});
	    }
	    _.each( children, function(child) {
		var source = self._source_ + "/" + child;
		var options = self._options_;
		path = "children:"+child;
		if( ! self.has( path ) ) {
		    //console.log("adding child ", path);
		    self.set( path, new ZookeeperConfig(source,options));
		} 
	    });
	}
    };

    child_watch_cb = function( type, state, path ) {
	if( type === ZooKeeper.ZOO_CHILD_EVENT ) {
	    zk.aw_get_children( self._path_, child_watch_cb, child_cb );	    
	} else if( type === ZooKeeper.ZOO_DELETED_EVENT ) {
	    // The data watch listener hadles this.
	} else if( type == ZooKeeper.ZOO_SESSION_EVENT ) {
	    // The data watch listener hadles this.
	} else {
	    //  ZOO_CREATED_EVENT: 1,
	    //  ZOO_CHANGED_EVENT: 3,
	    //  ZOO_CHILD_EVENT: 4,
	    //  ZOO_SESSION_EVENT: -1,
	    //  ZOO_NOTWATCHING_EVENT: -2,
	    console.log("child_watch_cb: Got unhandled event: %s %s", type, path);
	}
    };

    var zk_stuff = function(err) {

	if(err) {
            self.emit('invalid', err, self._soruce_);
	} else {
	    zk.aw_get( self._path_, watch_cb, data_cb );
	    zk.aw_get_children( self._path_, child_watch_cb, child_cb );
	}

	while( self._zk_pending_.length > 0 ) {
	    var cb = this._zk_pending_.shift();
	    cb(zk);
	}

    };

    //console.log( "zk client: %s", zk.client_id );
    if( zk.client_id != 0) {
	zk_stuff();
    } else {
	zk.connect( zk_stuff );	
    }
}

util.inherits(ZookeeperConfig, Configuration);

var zookeeper = function(cb) {
    var self = this;
    var zk = this._options_.zookeeper;
    if( zk && zk.client_id ) {
	cb(zk);
    } else {
	this._zk_pending_.push(cb);
    }
};

ZookeeperConfig.prototype.zookeeper = zookeeper;

exports.ZookeeperConfig = ZookeeperConfig;

//var zk = new ZooKeeper({
//  connect: "localhost:2181"
// ,timeout: 200000
// ,debug_level: ZooKeeper.ZOO_LOG_LEVEL_WARNING
// ,host_order_deterministic: false
//});

// zk.connect(function (err) {
//     if(err) throw err;
//     console.log ("zk session established, id=%s", zk.client_id);
//     zk.a_create ("/node.js1", "some value", ZooKeeper.ZOO_SEQUENCE | ZooKeeper.ZOO_EPHEMERAL, function (rc, error, path)  {
//         if (rc != 0) {
//             console.log ("zk node create result: %d, error: '%s', path=%s", rc, error, path);
//         } else {
//             console.log ("created zk node %s", path);
//             process.nextTick(function () {
//                 zk.close ();
//             });
//         }
//     });
// });

