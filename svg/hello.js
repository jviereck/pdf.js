//
// Ajax GET request for binary files
// (like jQuery's $.get(), but supports the binary type ArrayBuffer)
//
var binaryGet = function(url, callback){
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.mozResponseType = xhr.responseType = 'arraybuffer';
  xhr.expected = (document.URL.indexOf('file:') === 0) ? 0 : 200;
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === xhr.expected) {
      var data = (xhr.mozResponseArrayBuffer || xhr.mozResponse ||
                  xhr.responseArrayBuffer || xhr.response);

      callback(data);
    }
  };
  xhr.send(null);
}

//
// This is where the fun happens
//
var page;
var ir;

var useCanvas = document.location.hash;
binaryGet('compressed.tracemonkey-pldi-09.pdf', function(data){
  var pdf = new WorkerPDFDoc(data);
  var page = pdf.getPage(1);
  var scale = 1.5;

  var canvas = document.getElementById("the-canvas");
  if (useCanvas) {
    //
    // Prepare canvas using PDF page dimensions
    //
    var context = canvas.getContext("2d");
    canvas.height = page.height * scale;
    canvas.width = page.width * scale;

    //
    // Render PDF page into canvas context
    //
    page.startRendering(context, function() {
      setTimeout(function() {
        console.log("Rendering canvas", Date.now() - startTime);
        ir = page.page.IRQueue;
        var argsArray = ir.argsArray;
        var fnArray = ir.fnArray;

	return;

        var objs = {};
        for (var i = 0; i < fnArray.length; i++) {
          objs[fnArray[i]] = true;
          console.log(fnArray[i], argsArray[i].join(", "));
        }
        console.log(Object.keys(objs));


      }, 10);
    });
  } else {
    canvas.style.display = "none";

    window.RESOLVE_FONTS = true;

    // Thanks Brendan for let us do this in JS!
    CanvasGraphics = SvgGraphics;
    var container = document.getElementById("container");

    //
    // Render PDF page into canvas context
    //
    page.startRendering(container, function() {
      setTimeout(function() {
        console.log("Rendering svg", Date.now() - startTime);
      }, 10);

        ir = page.page.IRQueue;
        var argsArray = ir.argsArray;
        var fnArray = ir.fnArray;


        var objs = {};
        for (var i = 0; i < fnArray.length; i++) {
          objs[fnArray[i]] = true;
          console.log(fnArray[i], argsArray[i].join(", "));
        }
        console.log(Object.keys(objs));

    });
  }
});
