var deviceid = null;
var devicetype = "FingerWriteClient";
var eventtype = null;
var client;
var pubTopic = 'iot-2/evt/status/fmt/json';
var clientData = {};
clientData.d = {};

var waiting = false;
var waitms = 1000;
$(function(){
  getDeviceId();

  var canvas = document.getElementById( 'mycanvas' );
  if( !canvas || !canvas.getContext ){
    return false;
  }
  var ctx = canvas.getContext( '2d' );

  var mouse = {
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    color: 'black',
    isDrawing: false
  };
  var borderWidth = 1;
  canvas.addEventListener( "mousemove", function( e ){
    var rect = e.target.getBoundingClientRect();
    mouse.x = e.clientX - rect.left - borderWidth;
    mouse.y = e.clientY - rect.top - borderWidth;
    waiting = false;

    if( mouse.isDrawing ){
      ctx.beginPath();
      ctx.lineWidth = 5;
      ctx.moveTo( mouse.startX, mouse.startY );
      ctx.lineTo( mouse.x, mouse.y );
      ctx.strokeStyle = mouse.color;
      ctx.stroke();
      mouse.startX = mouse.x;
      mouse.startY = mouse.y;
    }
  });
  canvas.addEventListener( "mousedown", function( e ){
    mouse.isDrawing = true;
    mouse.startX = mouse.x;
    mouse.startY = mouse.y;

    waiting = false;
  });
  canvas.addEventListener( "mouseup", function( e ){
    mouse.isDrawing = false;
    waiting = true;
    setTimeout( 'waited()', waitms );
  });

  canvas.addEventListener( "touchmove", function( e ){
    var t = e.changedTouches[0];
    var rect = t.target.getBoundingClientRect();
    mouse.x = t.pageX - rect.left - borderWidth;
    mouse.y = t.pageY - rect.top - borderWidth;
    waiting = false;

    if( mouse.isDrawing ){
      ctx.beginPath();
      ctx.lineWidth = 5;
      ctx.moveTo( mouse.startX, mouse.startY );
      ctx.lineTo( mouse.x, mouse.y );
      ctx.strokeStyle = mouse.color;
      ctx.stroke();
      mouse.startX = mouse.x;
      mouse.startY = mouse.y;
    }
  });
  canvas.addEventListener( "touchstart", function( e ){
    var t = e.changedTouches[0];
    var rect = t.target.getBoundingClientRect();
    mouse.isDrawing = true;
    mouse.startX = t.pageX - rect.left - borderWidth;
    mouse.startY = t.pageY - rect.top - borderWidth;
    waiting = false;
  });
  canvas.addEventListener( "touchend", function( e ){
    mouse.isDrawing = false;
    waiting = true;
    setTimeout( 'waited()', waitms );
  });

  //. スクロール禁止
  $(window).on( 'touchmove.noScroll', function( e ){
    e.preventDefault();
  });


  var clientID = 'd:quickstart:' + devicetype + ':' + deviceid;
  client = new Messaging.Client( 'quickstart.messaging.internetofthings.ibmcloud.com', 443, clientID );
  client.onConnectionLost = onConnectionLost;
  client.connect( { onSuccess: onConnect, onFailure: onConnectFailure, useSSL: true } );

  resetCanvas();
});

function resetCanvas(){
  var canvas = document.getElementById( 'mycanvas' );
  if( !canvas || !canvas.getContext ){
    return false;
  }
  var ctx = canvas.getContext( '2d' );

  ctx.beginPath();
  ctx.fillStyle = "rgb( 255, 255, 255 )";
  ctx.fillRect( 0, 0, 300, 300 );
  ctx.stroke();

  waiting = false;
}

function searchChar(){
  var canvas = document.getElementById( 'mycanvas' );
  if( !canvas || !canvas.getContext ){
    return false;
  }
  var ctx = canvas.getContext( '2d' );

  //. 画像データ
  var png = canvas.toDataURL( 'image/png' );
  png = png.replace( /^.*,/, '' );

  //. バイナリ変換
  var bin = atob( png );
  var buffer = new Uint8Array( bin.length );
  for( var i = 0; i < bin.length; i ++ ){
    buffer[i] = bin.charCodeAt( i );
  }
  var blob = new Blob( [buffer.buffer], {
    type: 'image/png'
  });

  var formData = new FormData();
  formData.append( 'image', blob );

  var letter = null;
  if( document.getElementById( "letter" ) != null ){
    letter = $('#letter').val();
    if( letter ){
      formData.append( 'letter', letter );
    }
  }

  $.ajax({
    type: 'POST',
    url: './ocr',
    data: formData,
    contentType: false,
    processData: false,
    success: function( data, dataType ){
      console.log( data );
      if( letter ){
        debugText( data );
      }else{
        var json = JSON.parse( data );
        if( json.similar_images ){
          var similar_images = json.similar_images;
          if( similar_images && similar_images.length > 0 ){
            var similar_image = similar_images[0];
            if( similar_image && similar_image.metadata && similar_image.metadata.letter ){
              $('#result').append( similar_image.metadata.letter );

              publishMessage( similar_image.metadata.letter );
            }
          }
        }
      }
    },
    error: function( jqXHR, textStatus, errorThrown ){
      console.log( textStatus + ": " + errorThrown );
    }
  });
}

function debugText( txt ){
  $('#debug').html( txt );
}

function waited(){
  if( waiting ){
    waiting = false;
    //searchChar();
  }
}


function publishMessage( letter ){
  if( deviceid != null ){
    var d = {};
    d['letter'] = letter;

    clientData.d = d;
    clientData.publish();
  }
}

function onConnect(){
  console.log( "Connected." );
}

function onConnectFailure( error ){
  console.log( "Connect Failed." );
  console.log( error.errorCode );
  console.log( error.errorMessage );
}

function onConnectionLost( response ){
  console.log( "Connect Lost." );
  if( response.errorCode !== 0 ){
    console.log( " :" + response.errorMessage );
  }
  client.connect( { onSuccess: onConnect, onFailure: onConnectFailure } );
}

clientData.toJson = function(){
  return JSON.stringify( this );
}

clientData.publish = function(){
  var message = new Messaging.Message( clientData.toJson() );
  message.destinationName = pubTopic;
  client.send( message );
}


function getDeviceId(){
  var did = null;
  cookies = document.cookie.split( '; ' );
  for( i = 0; i < cookies.length; i ++ ){
    str = cookies[i].split( '=' );
    if( unescape( str[0] ) == 'deviceid' ){
      did = unescape( unescape( str[1] ) );
    }
  }

  if( did != null ){
    deviceid = did;
  }else{
    deviceid = generateDeviceId();
  }

  $('#deviceid').html( deviceid );
  document.title = deviceid;
}

function generateDeviceId(){
  var did = '';
  var hx = '0123456789abcdef';
  for( i = 0; i < 12; i ++ ){
    var n = Math.floor( Math.random() * 16 );
    if( n == 16 ){ n = 15; }
    c = hx.charAt( n );
    did += c;
  }

  var str = "deviceid=" + did;
  document.cookie = str;

  return did;
}

