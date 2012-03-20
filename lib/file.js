var fs = require('fs');
var EventEmitter = require('events').EventEmitter;

var config = require('./gestalt'),
    util = require('util'),
    sys = require('sys'),
    _ = require('underscore');

var readFile = function() {
    var self = this;
    fs.readFile( this._source_, function(err, data) {
    if(err) {
        self.emit('invalid', err, this._source_);
    } else {
        try {
            var json = JSON.parse( data );
            _.each( json, function(element,index,list) {
                self.set(index, element);
            }, this);
        } catch(e) {
            this.emit('invalid', e, this._source_);
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
    fs.watchFile( this._source_, {persistent: false}, function(event) {
        if( event == 'change' ) {
            self.readFile();
        }
        // TODO: deal with "rename"
    });
}

sys.inherits(ConfigFile, config.Configuration, EventEmitter);

ConfigFile.readFile = function() {
    fs.readFile( this._source_, function(err, data) {
    if(err) {
        this.emit('invalid', err, this._source_);
    } else {
        try {
            var self = this;
            var json = JSON.parse( data );
            _.each( json, function(element,index,list) {
                self.set(index, element);
            }, this);
        } catch(e) {
            this.emit('invalid', e, this._source_);
        }
    }
    });
};

exports.ConfigFile = ConfigFile;