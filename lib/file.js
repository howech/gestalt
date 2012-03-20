var fs = require('fs');
var EventEmitter = require('events').EventEmitter;

var config = require('./gestalt'),
    util = require('util'),
sys = util, //require('sys'),
    _ = require('underscore');


var readFile = function() {
    var self = this;
    fs.readFile( this._source_, function(err, data) {
    if(err) {
        self.emit('invalid', err, self._source_);
    } else {
        try {
            var json = JSON.parse( data );
	    _.each( self._values_, function(element, index, list) {
		if (_.isUndefined( json[index] ) ) {
		    self.remove( index );
		}
	    });
            _.each( json, function(element,index,list) {
                self.set(index, element);
            });
        } catch(e) {
            self.emit('invalid', e, self._source_);
        }
    }
    });
};


function ConfigFile(source) {
    this._source_ = source;
    this._values_ = {};
    config.Configuration(this);
    console.log(this._source_);
    this.readFile = readFile;
    this.readFile();
    var self = this;
    fs.watch( this._source_, {persistent: false}, function(event,f) {
        console.log("%s %s",event,f);
	if( event == 'change' ) {
            self.readFile();
        }
        // TODO: deal with "rename"
    });
}

sys.inherits(ConfigFile, config.Configuration, EventEmitter);

ConfigFile.readFile = readFile;

exports.ConfigFile = ConfigFile;