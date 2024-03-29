exports.basic_username = 'admin';
exports.basic_password = 'password';
exports.db_username = '';
exports.db_password = '';
exports.db_name = 'fingeractionsdb';

exports.image_size = 16;

exports.app_port = 0;

if( process.env.VCAP_SERVICES ){
  var VCAP_SERVICES = JSON.parse( process.env.VCAP_SERVICES );
  if( VCAP_SERVICES && VCAP_SERVICES.cloudantNoSQLDB ){
    exports.db_username = VCAP_SERVICES.cloudantNoSQLDB[0].credentials.username;
    exports.db_password = VCAP_SERVICES.cloudantNoSQLDB[0].credentials.password;
  }
}
