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
binaryGet('../test/pdfs/tracemonkey.pdf', function(data){
  CanvasGraphics = SvgGraphics;

  //
  // Instantiate PDFDoc with PDF data
  //
  var pdf = new WorkerPDFDoc(data);
      page = pdf.getPage(1);
  var scale = 1.5;

  //
  // Prepare canvas using PDF page dimensions
  //
  
  var container = document.getElementById("container");
  

  //
  // Render PDF page into canvas context
  //
  page.startRendering(container, function() {
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
  //canvas.append();
});
