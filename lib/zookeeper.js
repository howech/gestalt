
var Configuration = require('./config').Configuration,
    _ = require('underscore'),
    ZooKeeper = require('zookeeper'),
    util = require('util');

function ZookeeperConfig(source, options) {
    var self = this;
    ZookeeperConfig.super_.call(this, source, options);    

    var m = source.match(/^zk:\/\/(([^:\/]+:\d+)+)(.*)$/);
    this._connect_ = m[1];
    this._path_ = m[3];

    console.log( this._connect_ );
    console.log( this._path_ );

    var format = this._options_.format;
    if( format ) {
        this._options_.parser = this._options_.parser || parsers[ format ];
    }

    var zk = this._zk_ = new ZooKeeper({
        connect: this._connect_,
        timeout: this._options_.timeout,
	debug_level: this._options_.debug_level || ZooKeeper.ZOO_LOG_LEVEL_WARNING,
	host_order_deterministic: false
    });

    var watch_cb, data_cb;
    watch_cb = function(type, state, path) {
	if( type == ZooKeeper.ZOO_CHANGED_EVENT ) {
	    zk.aw_get( self._path_, watch_cb, data_cb );
	} else {
	    console.log( "Unkown type: " + type );
	}
    };

    data_cb = function(rc, error, stat, data) {
	if(rc) {
	    self.emit('invalid', error, self._source_);
	    return;
	} else {
	    var object;
	    var parser = self._options_.parser || JSON.parse;
	    try {
		object = parser(data);
	    } catch(e) {
		self.emit('invalid', e, self._source_ );
		return;
	    }
	    self.set('data', object );
	    
	    // Emit a 'loaded' event.
            self.emit('loaded');
	}
    };

    zk.connect( function(err) {
	if(err) {
            self.emit('invalid', err, self._soruce_);
	} else {
	    zk.aw_get( self._path_, watch_cb, data_cb );
	}
    });
}

util.inherits(ZookeeperConfig, Configuration);
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

