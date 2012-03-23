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

var parsers = {
    'json': JSON.parse,
    'yaml': parseYaml,
    'ini':  parseIni,
    'null': nullParse
}

exports.parsers = parsers;
