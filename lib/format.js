function parseYaml(data) {
    return require('yaml').eval(data.toString());
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

var parsers = {
    'json': JSON.parse,
    'yaml': parseYaml,
    'ini':  parseIni,
    'null': nullParse,
    'raw': raw
}

exports.parsers = parsers;
