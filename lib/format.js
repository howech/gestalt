var _=require('underscore');

function parseYaml(data) {
    return require('js-yaml').load(data.toString());
}

function parseIni( data ) {
    var iniparser = require('iniparser');
    var config = iniparser.parseString(data.toString());
    return config;
}

function nullParse(data) {
    return data;
}

function raw(data) {
    return data.toString();
}

function rawFile(data) {
    return { contents: data.toString() }
}


// this one works for many standard, unstructures unix config files:
function config(data) {
    var object = {};
    var lines = data.toString().replace(/#.*\n/g, '\n').replace(/(\n)+/g,'\n').split(/\n/);
    _.each( lines, function( string ) {
	var match = string.match(/\s*(\w+)\s*=\s*(.*?)\s*$/);
	if(match) {
	    object[ match[1] ] = match[2];
	}
    });

    return object;
}
	

var parsers = {
    'json': JSON.parse,
    'yaml': parseYaml,
    'ini':  parseIni,
    'null': nullParse,
    'raw':  raw,
    'config': config
}

exports.parsers = parsers;
