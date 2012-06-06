var parsers = require('./format').parsers,
    config = require('./config'),
    util = require('util'),
    _ = require('underscore');  

function ConfigArgs(options) {
    var self = this, format; 

    // Set some default options
    options = _.extend( {'format': 'raw',
			 'optimist_options': {},
			 'source': 'ARGV' 
			}, options);

    ConfigArgs.super_.call(this,options);
    format = this._options_.format;

    if( format ) {
	this._options_.parser = this._options_.parser || parsers[ format ];
    }

    var source = this._options_.source;
    // setting argv in the options can override using optimist to get command line options
    var args = this._options_.argv;
    var argv;
    if( args ) {
	this._optimist_ = require('optimist')(args)
	    .usage(this._options_.optimist_usage, this._options_.optimist_options );
    } else {
	this._optimist_ = require('optimist')
	    .usage(this._options_.optimist_usage, this._options_.optimist_options );
    }

    argv = this._optimist_.argv;

    _.each(argv, function(val,key) {
        self.set(key,val, source +":"+key);
    });    
}

util.inherits(ConfigArgs, config.Configuration);
var p = ConfigArgs.prototype;
p.help = function() {
    return this._optimist_.help();    
}
exports.ConfigArgs = ConfigArgs;