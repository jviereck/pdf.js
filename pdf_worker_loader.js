/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

importScripts('../pdf.js');
importScripts('../fonts.js');
importScripts('../crypto.js');
importScripts('../glyphlist.js');
importScripts('../metrics.js');

// Listen for messages from the main thread.
var pdfDoc = null;

this.onmessage = function(event) {
  var task = event.data.task;
  var data = event.data.data;

	switch (task) {
		case 'pdf':
			pdfDoc = new PDFDoc(data, null, true);
		break;

		case 'page':
      var self = this;
			var pageNumber = parseInt(data) + 1;

      console.log('--- worker get page ---', pageNumber);

			var page = pdfDoc.getPage(pageNumber);
			page.compile(function(fonts, images) {
        var code = page.code;

        for (var i = 0; i < code.length; i++) {
          console.log(code.fnArray[i], code.argsArray[i]);
        }

        self.postMessage({
          task: 'page',
          pageNumber: pageNumber,
          code: page.code,
          images: images,
          fonts: fonts
        });
      });
    break;

		default:
			error('unkown task ' + task);
    break;
	}
}

// Pritty dump console implementation that forwards to the main thread.
var consoleTimer = {};
var console = {
  log: function log() {
    var args = Array.prototype.slice.call(arguments);
    postMessage({
      task: 'console_log',
      data: args
    });
  },

  error: function error() {
    var args = Array.prototype.slice.call(arguments);
    postMessage({
      task: 'console_error',
      data: args
    });
  },

  time: function time(name) {
    consoleTimer[name] = Date.now();
  },

  timeEnd: function timeEnd(name) {
    var time = consoleTimer[name];
    if (time == null) {
      throw 'Unkown timer name ' + name;
    }
    this.log('Timer:', name, Date.now() - time);
  }
};
