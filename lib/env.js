var parsers = require('./format').parsers,
    config = require('./config'),
    util = require('util'),
    _ = require('underscore');  //jslint ignore

function ConfigEnv(options) {
    var self = this, format; 

    options = _.extend( {'format': 'raw',
			 'source': 'ENV',
			 'env': process.env
			}, options);

    ConfigEnv.super_.call(this,options);
    format = this._options_.format;

    if( format ) {
	this._options_.parser = this._options_.parser || parsers[ format ];
    }

    var source = this._options_.source;

    // setting 'env' in the options gives us a way to test this reliably.
    var env = this._options_.env;

    _.each(env, function(val,key) {
        self.set(key,val,"ENV:"+key);
    });    

}
util.inherits(ConfigEnv, config.Configuration);
exports.ConfigEnv = ConfigEnv;