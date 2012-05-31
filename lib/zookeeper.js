
var Configuration = require('./config').Configuration,
    _ = require('underscore'),
    ZooKeeper = null, 
    parsers = require('./format').parsers,
    util = require('util');

function ZookeeperConfig(options) {
    // Delay requirement of ZooKeeper to the time when we create a config that needs it
    if( !ZooKeeper ) {
	ZooKeeper = require('zookeeper');
    }

    var self = this;
    this._zk_pending_ = [];

    ZookeeperConfig.super_.call(this, options);    
    
    var source = this._source_;
    //console.log(source);
    var m = source.match(/^zk:\/\/(([^:\/]+:\d+,?)+)(.*)$/);
    this._connect_ = m[1];
    this._path_ = m[3];

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
	var zk_opts = _.extend( {connect: this._connect_ }, this._options_.zookeeper_options );
	zk = new ZooKeeper( zk_opts );
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
	    if( state != ZooKeeper.ZOO_CONNECTED_STATE ) {
		self.emit('invalid', "lost zk connection", self._source_ );
	    } else {
		self.emit('invalid', "found zk connection", self._source_ );
	    }
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
		var options = _.clone(self._options_);
		options.source = source;
		path = "children:"+child;
		if( ! self.has( path ) ) {
		    //console.log("adding child ", path);
		    self.set( path, new ZookeeperConfig(options));
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

    var zk_setup_watches = function(err) {	
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

    var zk_create_paths = function(paths, cb) {
	var path = paths.shift();
	if(path) {
	    zk.a_create( path, '', 0, function(rc,err,path) {
		if(rc == ZooKeeper.ZNODEEXISTS || rc==0) {
		    zk_create_paths( paths, cb );
		} else {
		    console.log("error creating paths: ", err);
		    cb( "Error creating paths" );
		}
	    });
	} else {
	    cb();
	}
    };
    
    var zk_setup = function(err) {
	if(err) {
            self.emit('invalid', err, self._soruce_);
	}
	if(self._options_.create_paths) {
	    var segments = self._path_.split("/");
	    segments.shift(); // remove leading empty string
	    var paths = [];
	    var path = "";
	    _.each(segments, function(segment) {
		path = path + "/" + segment;
		paths.push( path );
	    });
	    
	    zk_create_paths( paths, zk_setup_watches );
	} else {
	    zk_setup_watches();
	}
    }

    //console.log( "zk client: %s", zk.client_id );
    if( zk.state == ZooKeeper.ZOO_CONNECTED_STATE) {
	zk_setup();
    } else {
	zk.connect( zk_setup );	
    }
}

util.inherits(ZookeeperConfig, Configuration);

// Register something to be done with a zookeeper connection
// If the connection is open, this runs immediately, otherwise
// it gets pushed onto the queue of things awaiting a zk
// connections.
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


