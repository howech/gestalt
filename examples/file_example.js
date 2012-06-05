var gestalt = require('../lib/gestalt');
var ConfigFile = gestalt.ConfigFile;

var config_yaml = require.resolve('./config.yaml');

var cf = new ConfigFile({ source: config_yaml, format: 'yaml' } );
cf.on('invalid', function(err,source) {
    console.log("Error in %s", source);
    console.log(err);
});

cf.on('ready', function() {
    console.log( cf.get('new:foo') );
    cf.report();
});