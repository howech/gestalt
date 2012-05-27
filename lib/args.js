var parsers = require('./format').parsers,
    config = require('./config'),
    util = require('util'),
    _ = require('underscore');  //jslint ignore




function ConfigArgs(options) {
    var self = this, format; 
    var source = "ARGV";

    options = options || {};
    options.format = options.format || 'raw';
    options.options = options.options || {};

    ConfigArgs.super_.call(this,source,options);
    format = this._options_.format;

    if( format ) {
	this._options_.parser = this._options_.parser || parsers[ format ];
    }

    var argv = require('optimist').options( this._options_.options ).argv;

    _.each(argv, function(val,key) {
        self.set(key,val);
    });    
}
sys.inherits(ConfigArgs, config.Configuration);
exports.ConfigArgs = ConfigArgs;