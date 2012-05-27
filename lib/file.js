var fs = require('fs'),
    EventEmitter = require('events').EventEmitter,
    parsers = require('./format').parsers,
    config = require('./config'),
    util = require('util'),
    _ = require('underscore');  //jslint ignore
/*
 *
 * _source_   - the file to read configuation info from
 * _options_  - configuration options for this node
 *     parser - should be a function that takes raw stream data as input
 *              and returns a javascript property object
 * _values_   - the underlying values of the configuration
 *
 */

function readFile() {
    var self = this;
    fs.readFile(this._source_, function(err, data) {
        if (err) {
            self.emit('invalid', err, self._source_);
        } else {
            var object,
                parser = self._options_.parser || JSON.parse;
            // Convert thrown errors to 'invalid' events.
            try {
                object = parser(data);
            } catch (e) {
                self.emit('invalid', e, self._source_);
                return;
            }
	    // Iterate through the values in the existing
	    // data and remove any that are not defined in the new
	    // data
            _.each(self._values_, function(element, index, list) {
                if (_.isUndefined(object[index]) ) {
		                self.remove(index);
		        }
	        });

	    // Iterate through the values in the new data
	    // and set them in the config node
            _.each(object, function(element,index,list) {
                self.set(index, element);
            });

	    // Emit a 'loaded' event.
            self.emit('loaded');
        }
    });
};


function ConfigFile(source,options) {
    var self = this, format; 
    
    ConfigFile.super_.call(this,source,options);
    format = this._options_.format;

    if( format ) {
	this._options_.parser = this._options_.parser || parsers[ format ];
    }

    //console.log( "options: ", this._options_ );
    readFile.call(this);
    
    if( this._options_.watch && _.isFunction(fs.watch) ) {
        fs.watch( this._source_, {persistent: false}, function(event,f) {
	        if( event == 'change' ) {
		        self.readFile();
             }
            // TODO: deal with "rename"
	    });OB
    } else if( this._options_.watch && _.isFunction(fs.watchFile) ) {
	    fs.watchFile( this._source_, {persistent: false, interval: 100}, function(curr,prev) {
	        self.readFile();
	    });
    }
}
util.inherits(ConfigFile, config.Configuration);
ConfigFile.prototype.readFile = readFile;
exports.ConfigFile = ConfigFile;