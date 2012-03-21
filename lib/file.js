var fs = require('fs');
var EventEmitter = require('events').EventEmitter;

var config = require('./config'),
    util = require('util'),
sys = util, //require('sys'),
    _ = require('underscore');


var readFile = function() {
    var self = this;
    fs.readFile( this._source_, function(err, data) {
        if(err) {
            self.emit('invalid', err, self._source_);
        } else {
            var object;
            var parser = this._options_.parser || JSON.parse;
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
    this._source_ = source;
    this._options_ = options;
    this._values_ = {};
    config.Configuration(this);
    console.log(this._source_);
    this.readFile = readFile;
    this.readFile();
    var self = this;
    fs.watchFile( this._source_, {persistent: false}, function(event,f) {
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