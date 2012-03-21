var fs = require('fs');
var EventEmitter = require('events').EventEmitter;

var config = require('./config'),
    util = require('util'),
sys = util, //require('sys'),
    _ = require('underscore');

function parseYaml(data) {
    return require('yaml').eval(data.toString());
}


var readFile = function() {
    var self = this;
    fs.readFile( this._source_, function(err, data) {
        if(err) {
            self.emit('invalid', err, self._source_);
        } else {
            var object;
            var parser = self._options_.parser || JSON.parse;
            try {
                object = parser( data );
            } catch(e) {
                self.emit('invalid', e, self._source_);
                return;
            }
            _.each( self._values_, function(element, index, list) {
		        if (_.isUndefined( object[index] ) ) {
		                self.remove( index );
		        }
	        });
            _.each( object, function(element,index,list) {
                self.set(index, element);
            });
        }
    });
};


function ConfigFile(source,options) {
    ConfigFile.super_.call(this,source,options);

    if( this._options_.format == 'yaml' ) {
	this._options_.parser = this._options_.parser || parseYaml;
    }

    console.log( "options: ", this._options_ );
    this.readFile();
    var self = this;

    if( this._options_.watch && _.isFunction(fs.watch) ) {
	fs.watch( this._source_, {persistent: false}, function(event,f) {
	    if( event == 'change' ) {
		self.readFile();
            }
            // TODO: deal with "rename"
	});
    } else if( this._options_.watch && _.isFunction(fs.watchFile) ) {
	fs.watchFile( this._source_, {persistent: false}, function(curr,prev) {
	    self.readFile();
	});
    }

}

sys.inherits(ConfigFile, config.Configuration);

ConfigFile.prototype.readFile = readFile;

exports.ConfigFile = ConfigFile;