var gestalt = require('../lib/gestalt');
var ConfigFile = gestalt.ConfigFile;

var config_yaml = require.resolve('./config.yaml');

var cf = new ConfigFile({ source: config_yaml } );

cf.on('state', function(state_change ) {
    if( state_change.state == 'invalid' ) {
	console.log("Error loading", state_change.data);
    } else if ( state_change.state == 'ready' ) {
	cf.report()
    }
});

