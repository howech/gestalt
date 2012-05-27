var parsers = require('./format').parsers,
    config = require('./config'),
    util = require('util'),
    _ = require('underscore');  //jslint ignore

function ConfigEnv(options) {
    var self = this, format; 
    var source = "ENV";

    options = _.extend( {'format': 'raw','options': {}}, options);

    ConfigEnv.super_.call(this,source,options);
    format = this._options_.format;

    if( format ) {
	this._options_.parser = this._options_.parser || parsers[ format ];
    }

    var env = process.env;

    _.each(env, function(val,key) {
        self.set(key,val,"ENV:"+key);
    });    
}
util.inherits(ConfigEnv, config.Configuration);
exports.ConfigEnv = ConfigEnv;