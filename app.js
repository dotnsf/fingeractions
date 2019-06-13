//. app.js

var express = require( 'express' ),
    basicAuth = require( 'basic-auth-connect' ),
    Canvas = require( 'canvas' ),
    cfenv = require( 'cfenv' ),
    easyimg = require( 'easyimage' ),
    multer = require( 'multer' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    ejs = require( 'ejs' ),
    cloudantlib = require( '@cloudant/cloudant' ),
    app = express();
var settings = require( './settings' );
var Image = Canvas.Image;

var db = null;
var cloudant = null;
if( settings.db_username && settings.db_password ){
  cloudant = cloudantlib( { account: settings.db_username, password: settings.db_password } );
  if( cloudant ){
    cloudant.db.get( settings.db_name, function( err, body ){
      if( err ){
        if( err.statusCode == 404 ){
          cloudant.db.create( settings.db_name, function( err, body ){
            if( err ){
              db = null;
            }else{
              db = cloudant.db.use( settings.db_name );

              //. query index
              var query_index_tag = {
                _id: "_design/tag-index",
                language: "query",
                indexes: {
                  "tag-index": {
                    index: {
                      fields: [ { name: "tag", type: "string" } ]
                    },
                    type: "text"
                  }
                }
              };
              db.insert( query_index_tag, function( err, body ){} );
            }
          });
        }else{
          db = cloudant.db.use( settings.db_name );

          //. query index
          var query_index_tag = {
            _id: "_design/tag-index",
            language: "query",
            indexes: {
              "tag-index": {
                index: {
                  fields: [ { name: "tag", type: "string" } ]
                },
                type: "text"
              }
            }
          };
          db.insert( query_index_tag, function( err, body ){} );
        }
      }else{
        db = cloudant.db.use( settings.db_name );

        //. query index
        var query_index_tag = {
          _id: "_design/tag-index",
          language: "query",
          indexes: {
            "tag-index": {
              index: {
                fields: [ { name: "tag", type: "string" } ]
              },
              type: "text"
            }
          }
        };
        db.insert( query_index_tag, function( err, body ){} );
      }
    });
  }
}

var appEnv = cfenv.getAppEnv();

app.use( multer( { dest: './tmp/' } ).single( 'image' ) );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.Router() );
app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

app.all( '/admin*', basicAuth( function( user, pass ){
  return( user === settings.basic_username && pass === settings.basic_password );
}));
app.all( '/training*', basicAuth( function( user, pass ){
  return( user === settings.basic_username && pass === settings.basic_password );
}));

app.post( '/tag', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var imgpath = req.file.path;
  var imgtype = req.file.mimetype;
  //var imgsize = req.file.size;
  var ext = imgtype.split( "/" )[1];
  //var imgfilename = req.file.filename;
  var tag = req.body.tag;
  if( tag ){
    var dst_imgpath = imgpath + '.png';
    var options = {
      src: imgpath,
      dst: dst_imgpath,
      ignoreAspectRatio: true,
      background: 'white',
      width: settings.image_size,
      height: settings.image_size
    };
    easyimg.resize( options ).then(
      function( file ){
        getPixels( dst_imgpath ).then( function( pixels ){
          doc = {
            tag: tag,
            timestamp: ( new Date() ).getTime(),
            pixels: pixels
          };
          var bin = fs.readFileSync( imgpath );
          var bin64 = new Buffer( bin ).toString( 'base64' );
          var _bin = fs.readFileSync( dst_imgpath );
          var _bin64 = new Buffer( _bin ).toString( 'base64' );
          doc['_attachments'] = {
            image: {
              content_type: imgtype,
              data: bin64
            },
            mini: {
              content_type: imgtype,
              data: _bin64
            }
          };

          db.insert( doc, function( err, body ){
            fs.unlink( imgpath, function( e ){} );
            fs.unlink( dst_imgpath, function( e ){} );
            if( err ){
              console.log( err );
              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              res.write( JSON.stringify( { status: true, pixels: pixels }, 2, null ) );
              res.end();
            }
          });
        }, function( err ){
          fs.unlink( imgpath, function( e ){} );
          fs.unlink( dst_imgpath, function( e ){} );

          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
          res.end();
        });
      }, function( err ){
        fs.unlink( imgpath, function( e ){} );

        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }
    );
  }else{
    fs.unlink( imgpath, function( e ){} );

    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: "tag need to have some value." }, 2, null ) );
    res.end();
  }
});

app.post( '/search', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var imgpath = req.file.path;
  var imgtype = req.file.mimetype;
  //var imgsize = req.file.size;
  var ext = imgtype.split( "/" )[1];
  //var imgfilename = req.file.filename;
  var limit = 10; //req.body.limit;

  if( db ){
    var dst_imgpath = imgpath + '.png';
    var options = {
      src: imgpath,
      dst: dst_imgpath,
      ignoreAspectRatio: true,
      background: 'white',
      width: settings.image_size,
      height: settings.image_size
    };
    easyimg.resize( options ).then(
      function( file ){
        getPixels( dst_imgpath ).then( function( pixels ){
          db.list( { include_docs: true }, function( err, body ){
            if( err ){
              fs.unlink( imgpath, function( e ){} );
              fs.unlink( dst_imgpath, function( e ){} );

              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              fs.unlink( imgpath, function( e ){} );
              fs.unlink( dst_imgpath, function( e ){} );
              
              var docs = [];
              var tags = [];
              body.rows.forEach( function( _doc ){
                var doc = JSON.parse( JSON.stringify( _doc.doc ) );
                if( doc._id.indexOf( '_' ) !== 0 ){
                  if( tags.indexOf( doc.tag ) == -1 ){
                    tags.push( doc.tag );
                  }

                  var point = 0;
                  for( var y = 0; y < pixels.length; y ++ ){
                    for( var x = 0; x < pixels[y].length; x ++ ){
                      if( pixels[y][x] == doc.pixels[y][x] ){
                        point ++;
                      }
                    }
                  }

                  doc.point = point;
                  docs.push( doc );
                }
              });

              docs.sort( compareByPointRev );
              //console.log( docs );

              var _docs = docs.slice( 0, limit );

              //. confidences の計算
              var confidences = {};
              tags.forEach( function( tag ){
                confidences[tag] = 0;
              });
              var total = 0;
              _docs.forEach( function( _doc ){
                confidences[_doc.tag] += _doc.point;
                total += _doc.point;
              });
              for( key in confidences ){
                confidences[key] /= total;
              }

              res.write( JSON.stringify( { status: true, pixels: pixels, docs: _docs, confidences: confidences }, 2, null ) );
              res.end();
            }
          });
        }, function( err ){
          fs.unlink( imgpath, function( e ){} );
          fs.unlink( dst_imgpath, function( e ){} );

          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
          res.end();
        });
      }, function( err ){
        fs.unlink( imgpath, function( e ){} );

        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }
    );
  }else{
    fs.unlink( imgpath, function( e ){} );

    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: "db is not initialized." }, 2, null ) );
    res.end();
  }
});

app.get( '/training', function( req, res ){
  res.render( 'training', {} );
});

app.get( '/', function( req, res ){
  res.render( 'action', {} );
});

app.get( '/admin', function( req, res ){
  if( db ){
    db.list( { include_docs: true }, function( err, body ){
      if( err ){
        res.render( 'list', { images: [], tags: [], message: err } );
      }else{
        var images = [];
        var tags = [];
        body.rows.forEach( function( _doc ){
          var doc = JSON.parse( JSON.stringify( _doc.doc ) );
          if( doc._id.indexOf( '_' ) !== 0 ){
            /*
            doc = {
              tag: tag,
              timestamp: ( new Date() ).getTime(),
              pixels: pixels
            };
            */
            if( tags.indexOf( doc.tag ) > -1 ){
              tags.push( doc.tag );
            }
            images.push( { _id: doc._id, tag: doc.tag, timestamp: doc.timestamp, pixels: doc.pixels } );
          }
        });

        tags.sort();
        res.render( 'list', { images: images, tags: tags } );
      }
    });
  }else{
    res.render( 'list', { images: [], tags: [], message: 'db is not initialized.' } );
  }
});

app.get( '/image/:id', function( req, res ){
  if( db ){
    var image_id = req.params.id;
    var att = ( req.query.mini ? "mini" : "image" );
    db.attachment.get( image_id, att, function( err1, body1 ){
      res.contentType( 'image/png' );
      res.end( body1, 'binary' );
    });
  }else{
    res.contentType( 'application/json' );

    res.status( 400 );
    res.write( JSON.stringify( { message: "db is not initialized." }, 2, null ) );
    res.end();
  }
});

app.delete( '/image/:id', function( req, res ){
  res.contentType( 'application/json' );

  if( db ){
    var image_id = req.params.id;
    db.get( image_id, null, function( err1, body1, header1 ){
      if( err1 ){
        err1.image_id = 'error-1';
        res.status( 400 );
        res.write( JSON.stringify( err1 ) );
        res.end();
      }else{
        var rev = body1._rev;
        db.destroy( image_id, rev, function( err2, body2, header2 ){
          if( err2 ){
            err2.image_id = 'error-2';
            res.status( 400 );
            res.write( JSON.stringify( err2 ) );
            res.end();
          }else{
            body2.image_id = image_id;
            res.write( JSON.stringify( body2 ) );
            res.end();
          }
        });
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { image_id: 'error-0', message: "db is not initialized." }, 2, null ) );
    res.end();
  }
});

app.delete( '/images', function( req, res ){
  res.contentType( 'application/json' );

  if( db ){
    db.list( {}, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        var docs = [];
        body.rows.forEach( function( _doc ){
          if( _doc.id.indexOf( '_' ) !== 0 ){
            docs.push( { _id: _doc.id, _rev: _doc.value.rev, _deleted: true } );
          }
        });

        if( docs.length > 0 ){
          db.bulk( { docs: docs }, function( err ){
            if( err ){
              res.status( 400 );
              res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
              res.end();
            }else{
              res.write( JSON.stringify( { status: true, num: docs.length }, 2, null ) );
              res.end();
            }
          });
        }else{
          res.write( JSON.stringify( { status: true, num: 0 }, 2, null ) );
          res.end();
        }
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: "db is not initialized." }, 2, null ) );
    res.end();
  }
});

function getPixels( filepath ){
  return new Promise( function( resolve, reject ){
    fs.readFile( filepath, function( err, data ){
      if( err ){
        reject( err );
      }else{
        var pixels = [];
        var img = new Image();
        img.src = data;
        var canvas = new Canvas( settings.image_size, settings.image_size );
        var ctx = canvas.getContext( '2d' );
        ctx.drawImage( img, 0, 0, img.width, img.height );

        var imagedata = ctx.getImageData( 0, 0, img.width, img.height );

        var avg = 0.0;
        for( var y = 0; y < imagedata.height; y ++ ){
          for( var x = 0; x < imagedata.width; x ++ ){
            var idx = ( y * imagedata.width + x ) * 4;
            var R = imagedata.data[idx];
            var G = imagedata.data[idx+1];
            var B = imagedata.data[idx+2];
            //var A = imagedata.data[idx+3];
            avg += ( R + G + B );
          }
        }
        avg /= imagedata.height * imagedata.width;

        for( var y = 0; y < imagedata.height; y ++ ){
          var line = [];
          for( var x = 0; x < imagedata.width; x ++ ){
            var idx = ( y * imagedata.width + x ) * 4;
            var R = imagedata.data[idx];
            var G = imagedata.data[idx+1];
            var B = imagedata.data[idx+2];
            //var A = imagedata.data[idx+3];
            var z = ( R + G + B );
            var pixel = ( avg > z ? 0 : 1 );  //. 白が１

            line.push( pixel );
          }
          pixels.push( line );
        }
        resolve( pixels );
      }
    });
  });
}

function countScore( pixels1, pixels2, grayscale ){
  return new Promise( function( resolve, reject ){
    var score = 0;
    if( grayscale ){
      for( var i = 0; i < pixels1.length; i ++ ){
        var v1 = Math.floor( ( pixels1[i][0] + pixels1[i][1] + pixels1[i][2] ) / 3 );
        pixels1[i][0] = pixels1[i][1] = pixels1[i][2] = v1;
        var v2 = Math.floor( ( pixels2[i][0] + pixels2[i][1] + pixels2[i][2] ) / 3 );
        pixels2[i][0] = pixels2[i][1] = pixels2[i][2] = v2;
      }
    }
    for( var i = 0; i < pixels1.length; i ++ ){
      for( var j = 0; j < pixels1[i].length; j ++ ){
        var s = ( pixels1[i][j] - pixels2[i][j] ) * ( pixels1[i][j] - pixels2[i][j] );
        score += s;
      }
    }

    resolve( score );
  });
}

function compareByPointRev( a, b ){
  var r = 0;
  if( a.point < b.point ){ r = 1; }
  else if( a.point > b.point ){ r = -1; }

  return r;
}


app.listen( appEnv.port );
console.log( "server stating on " + appEnv.port + " ..." );
