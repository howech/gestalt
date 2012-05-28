var gestalt = require('../lib/gestalt');
var ConfigFile = gestalt.ConfigFile;

var config_yaml = require.resolve('./config.yaml');

var cf = new ConfigFile({ source: config_yaml, format: 'yaml' } );

cf.on('loaded', function() {
    console.log( cf.get('new:foo') );
    cf.report();
});