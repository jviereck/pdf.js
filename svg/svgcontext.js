/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// <canvas> contexts store most of the state we need natively.
// However, PDF needs a bit more state, which we store here.
var SvgGraphicsState = (function() {
  
  function SvgGraphicsState() {  }

  SvgGraphicsState.prototype = {
    x: 0,
    y: 0,
    
    lineX: 0,
    lineY: 0,

    // Character and word spacing
    charSpacing: 0,
    wordSpacing: 0,
    textHScale: 1,

    font: null,
    fontSize: 0,
    
    fill: null,
    fillColorSpace: null,
    stroke: null,
    strokeColorSpace: null,
    
    transMatrix: null,
    textMatrix: null,

    node: null,

    clone: function svgGraphicsState_clone() {
      return Object.create(this);
    },
    
    transform: function svgGraphicsState_transform(a, b, c, d, e, f) {
      // a0   b0  c0    a1  b1  c1    
      // d0   e0  f0    d1  e1  f1
      // 0    0   1     0   0   1

      var m = this.transMatrix;
      this.transMatrix = [
        m[0] * a + m[2] * b, 
        m[1] * a + m[3] * b, 
        m[0] * c + m[2] * d, 
        t[1] * c + t[3] * d,
        t[0] * e + t[2] * f + t[4], 
        t[1] * e + t[3] * f + t[5]
      ];
    },

    /**
     * This is like calling transform(1, 0, x, 0, 1, y);
     */
    transformMove: function svgGraphicsState_transformMoe(x, y) {
      var m = this.transMatrix;
      m[2] += m[0] * x + m[1] * y;
      m[5] += m[4] * x + m[5] * y;
    },
    
    transPoint: function svgGraphicsState_transPoint(x, y) {
      // a0   b0  c0    x
      // d0   e0  f0    y
      // 0    0   1     1

      var m = this.transMatrix;
      return [
        m[0] * x + m[1] * y + m[2],
        m[3] * x + m[4] * y + m[5]
      ];
    },

    append: function svgGraphicsState_append(node) {
      this.node.appendChild(node);
    }
  }
  return SvgGraphicsState;
})();

function SvgGraphics(holder) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('version', '1.2');
  svg.setAttribute('width', '1000px');
  svg.setAttribute('height', '2000px');

  this.append = function() {
    holder.appendChild(svg);
  }

  this.$private = {
    id: '',
    width: 100,
    height: 50,
    svg: svg
  };

  this.$path = '';
  this.$clipCounter = 0;
  
  var state = this.state = new SvgGraphicsState();
  state.transMatrix = [1, 0, 0, 0, 1, 0];
  state.fill = state.stroke = 'black';

  this.stateStack = [ state ];

  // The <def> section is used to take up things like clipPath etc.
  var def = this.def = document.createElementNS('http://www.w3.org/2000/svg',
                                                'def');
  svg.appendChild(def);

  // Add one main <g> element for the scaling.
  var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', 'scale(' + 1.5 + ',' + 1.5 + ')');
  svg.appendChild(g)
  this.state.node = g;
}

var kExecutionTime = 50;
var kExecutionTimeCheck = 500;
var IDENTITY_MATRIX = [1, 0, 0, 0, 1, 0];

SvgGraphics.prototype = {

  executeIRQueue: function(codeIR, executionStartIdx, continueCallback) {
    var argsArray = codeIR.argsArray;
    var fnArray =   codeIR.fnArray;
    var i = executionStartIdx || 0;
    var argsArrayLen = argsArray.length;
    
    var executionEndIdx;
    var startTime = Date.now();

    do {
      executionEndIdx = Math.min(argsArrayLen, i + kExecutionTimeCheck);
      
      for (i; i < executionEndIdx; i++) {
        if (fnArray[i] !== "dependency") {
          this[fnArray[i]].apply(this, argsArray[i]);
        } else {
          var deps = argsArray[i];
          for (var n = 0; n < deps.length; n++) {
            var depObjId = deps[n];
            var promise = Objects.getPromise(depObjId);

            // If the promise isn't resolved yet, add the continueCallback
            // to the promise and bail out.
            if (!promise.isResolved) {
              promise.then(continueCallback);
              return i;
            }
          }
        }
      }

      // If the entire IRQueue was executed, stop as were done.
      if (i == argsArrayLen) {
        return i;
      } 
      // If the execution took longer then a certain amount of time, shedule
      // to continue exeution after a short delay.
      // However, this is only possible if a 'continueCallback' is passed in.
      else if (continueCallback && 
              (Date.now() - startTime) > kExecutionTime) {
        setTimeout(continueCallback, 0);
        return i;
      }          

      // If the IRQueue isn't executed completly yet OR the execution time
      // was short enough, do another execution round.
    } while (true);
  },
  beginDrawing: function(mediaBox) {
    this.height = mediaBox.height;
    console.log(mediaBox);
  },
  endDrawing: function() {
    this.append();
  },
 
  // Paths.
  setCurrentPoint: function(x, y) {
    var state = this.state;
    state.x = x;
    state.y = y;
  },

  moveTo: function(x, y) {
    this.$path += 'M ' + x + ' ' + y + ' ';
    this.setCurrentPoint(x, y);
  },

  lineTo: function(x, y) {
    this.$path += 'L ' + x + ' ' + y + ' ';
    this.setCurrentPoint(x, y);
  },
 
  bezierCurveTo: function(x1, y1, x2, y2, x3, y3) {
    this.$path += 'C ' + x1 + ' ' + y1 + ' ' +
      x2 + ' ' + y2 + ' ' + x3 + ' ' + y3 + ' ';
    this.setCurrentPoint(x3, y3);
  },

  curveTo: function(x1, y1, x2, y2, x3, y3) {
    this.bezierCurveTo(x1, y1, x2, y2, x3, y3);
  },
  curveTo2: function(x2, y2, x3, y3) {
    var state = this.state;
    this.ctx.bezierCurveTo(state.x, state.y, x2, y2, x3, y3);
  },
  curveTo3: function(x1, y1, x3, y3) {
    this.curveTo(x1, y1, x3, y3, x3, y3);
  },

  closePath: function() {
    this.$path += 'Z ';
  },

  rectangle: function(x, y, width, height) {
    // TODO: There is also a <svg:rect> - maybe use that one?

    // Mapping the 're'/rectangle command to other path commands as
    // described on page 227 pdf spec.<D-r>
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.closePath();
  },

  buildPath: function() {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', this.$path);

    return path;
  },

  stroke: function() {
    var state = this.state;

    var path = this.buildPath();
    path.setAttribute('stroke', state.stroke);
    path.setAttribute('fill',   'none');
    state.append(path);
  },

  fill: function() {
    var state = this.state;

    var path = this.buildPath();
    path.setAttribute('stroke', 'none');
    path.setAttribute('fill',   state.fill);
    state.append(path);
  },

  clip: function() {
    var clip = document.createElementNS('http://www.w3.org/2000/svg', 
                                        'clipPath');
    var id = 'c' + this.$clipCounter++;
    clip.setAttribute('id', id);

    // Add the current path that is used for clipping.
    clip.appendChild(this.buildPath());

    // The clipPath object is added to the <def> section of the svg.
    this.def.appendChild(clip);

    // Create a new group node that uses the created clipPath to clip
    // its content.
    this.appendGNode("clip-path", "url(#" + id + ")");
  },
  
  transform: function(a, b, c, d, e, f) {
    // TODO: We can try to be smart and compute some of the trans matrixes
    // using JS to avoid lots of extra <g> notes for translation. For now
    // just go the easy way.
    var state = this.state;
    this.appendGNode('transform', 'matrix(' + a + ',' + b + ',' + c + ',' +
                                              d + ',' + e + ',' + f + ')');
  },
  
  transformM: function(m) {
    this.transform.apply(this, m);
  },

  save: function() {
    var state = this.state;
    this.stateStack.push(state);
    this.state = state.clone();
  },

  restore: function() {
    this.state = this.stateStack.pop();
  },

  paintFormXObjectBegin: function(matrix, bbox) {
    this.save();

    if (matrix && IsArray(matrix) && 6 == matrix.length)
      this.transform.apply(this, matrix);

    if (bbox && IsArray(bbox) && 4 == bbox.length) {
      this.rectangle.apply(this, bbox);
      this.clip();
      this.endPath();
    }
  },

  endPath: function() {
    // TODO: The CanvasGraphics implementation does some more stuff
    // here. Is that required for the SVG implementation as well?
    this.$path = '';
  },

  paintFormXObjectEnd: function() {
    this.restore();
  },

  setDash: function() {
    // TODO: Implement me!
  },

  setLineCap: function() {
    // TODO: Implement me!
  },

  setLineJoin: function() {
    // TODO: Implement me!
  },

  appendGNode: function(key, value) {
    var state = this.state;
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute(key, value);
    state.append(g);
    state.node = g;
    // A 'setFont' should get added directly on the new g node. Therefore,
    // reset the fontInsertNode.
    state.fontInsertNode = null;
  },

  setLineWidth: function(width) {
    this.appendGNode('stroke-width', width);
  },
  
  setFont: function(fontRef, size) {
    var state = this.state;

    var fontRefName = fontRef.name;
    var fontObj = Objects.get(fontRefName);
    
    if (!fontObj) {
      throw "Can't find font for " + fontRefName;
    }
    
    var name = fontObj.loadedName;
    if (!name) {
      // TODO: fontDescriptor is not available, fallback to default font
      name = 'sans-serif';
    }

    var name = fontObj.loadedName || 'sans-serif';
    state.font = fontObj;
    state.fontName = name;
    state.fontSize = size;
    state.fontUsed = false;

  },
  
  beginText: function() {
    var state = this.state;
    state.x = state.lineX = 0;
    state.y = state.lineY = 0;
    state.textMatrix = IDENTITY_MATRIX;
  },

  moveText: function(x, y) {
    var state = this.state;
    state.x = state.lineX += x;
    state.y = state.lineY += y;
  },

  setTextMatrix: function(a, b, c, d, e, f) {
    this.state.textMatrix = [a, b, c, d, e, f];
  },

  showText: function(text) {
    this.showSpacedText([text]);
  },

  showSpacedText: function(arr) {
    // If the current font isn't supported, we can't display the text and
    // bail out.
    var state = this.state;
    var font = state.font;
    if (!font.supported) {
      return;
    }

    // If the font isn't used yet, it needs to get added to the svg object
    // before any text using it is added.
    if (!state.fontUsed) {
      state.fontUsed = true;

      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('font-family', state.fontName);
      g.setAttribute('font-size',   state.fontSize + 'px');
      
      // If there is a certain node the font should get added to, use that node
      // as the parent one. Otherwise, use just the current node.
      if (state.fontInsertNode) {
        state.fontInsertNode.appendChild(g);
      } else {
        state.fontInsertNode = state.node;
        state.append(g);
      }
      // The new g node is the parent node for the following ones.
      state.node = g;
    }

    var fontSize = state.fontSize;

    var composite   = font.composite;
    var encoding    = font.encoding;
    var charSpacing = state.charSpacing;
    var wordSpacing = state.wordSpacing;
    var textHScale  = state.textHScale;

    var p = state.transPoint(state.x, state.y);
   
    var svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    svgText.setAttribute('y', this.height-p[1] + 'px');
    svgText.setAttribute('fill', 'black');

    var xStart = 0;//state.x;

    for (var i = 0; i < arr.length; ++i) {
      var e = arr[i];
      if (IsNum(e)) {
        state.x -= moveX = e * 0.001 * fontSize * textHScale;
      } else if (IsString(e)) {
        var originalText = e;
        var text = font.charsToUnicode(e);
        
        // ctx.scale(1 / textHScale, 1);

        var width = 0;
        for (var n = 0; n < text.length; n++) {
          if (composite) {
            var position = n * 2 + 1;
            var charcode = (originalText.charCodeAt(position - 1) << 8) +
                            originalText.charCodeAt(position);
          } else {
            var charcode = originalText.charCodeAt(n);
          }

          var charWidth = font.encoding[charcode].width * fontSize * 0.001;
          charWidth += charSpacing;
          if (charcode == 32)
            charWidth += wordSpacing;

          //ctx.fillText(text.charAt(i), 0, 0);
          //ctx.translate(charWidth, 0);
          // var tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          // tspan.setAttribute('x', (state.x - xStart) +   'px');
          // tspan.textContent = text.charAt(n);
          // svgText.appendChild(tspan);

          // state.x += charWidth;
          
            width += charWidth;
        }

        var tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', (state.x - xStart) +   'px');
        tspan.textContent = text;
        svgText.appendChild(tspan);
        
        state.x += width;
      } else {
        malformed('TJ array element ' + e + " isn't string or num");
      }
    }
    if (font.textMatrix || state.textMatrix !== IDENTITY_MATRIX) {
      this.save();
      if (state.textMatrix !== IDENTITY_MATRIX) {
        this.transformM(state.textMatrix);
      }
      if (font.textMatrix) {
        this.transformM(font.textMatrix);
      }
      state.append(svgText);
      this.restore();
    } else {
      state.append(svgText);
    }
  },
  endText: function() {
  },
    
  // Color
  setStrokeColorSpace: function(raw) {
    this.state.strokeColorSpace =
          ColorSpace.fromIR(raw);
  },
  setFillColorSpace: function(raw) {
    this.state.fillColorSpace =
          ColorSpace.fromIR(raw);
  },
  setStrokeColor: function(/*...*/) {
    var cs = this.state.strokeColorSpace;
    var color = cs.getRgb(arguments);
    this.setStrokeRGBColor.apply(this, color);
  },
  setFillColor: function(/*...*/) {
    var cs = this.state.fillColorSpace;
    var color = cs.getRgb(arguments);
    this.setFillRGBColor.apply(this, color);
  },
  setStrokeRGBColor: function(r, g, b) {
    var color = Util.makeCssRgb(r, g, b);
    this.state.stroke = color;
  },
  setFillRGBColor: function(r, g, b) {
    var color = Util.makeCssRgb(r, g, b);
    this.state.fill = color;
  },
  setStrokeCMYKColor: function(c, m, y, k) {
    var color = Util.makeCssCmyk(c, m, y, k);
    this.state.stroke = color;
  },
  setFillCMYKColor: function(c, m, y, k) {
    var color = Util.makeCssCmyk(c, m, y, k);
    this.state.fill = color;
  },

  setRenderingIntent: function(intent) {
    // TODO: Implement me!
  },

  setFlatness: function(flatness) {

  },

  paintImageXObject: function() {

  }

}

function SvgCanvas(holder) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('version', '1.2');
  svg.setAttribute('width', '100px');
  svg.setAttribute('height', '50px');

  this.append = function() {
    holder.appendChild(svg);
  }

  this.$private = {
    id: '',
    width: 100,
    height: 50,
    svg: svg
  };
}

SvgCanvas.prototype = {
  get id() {
    return this.$private.id;
  },
  set id(value) {
    this.$private.id = value;
    this.$private.svg.setAttribute('id', value);
  },
  get width() {
    return this.$private.width;
  },
  set width(value) {
    this.$private.width = value;
    this.$private.svg.setAttribute('width', value + 'px');
  },
  get height() {
    return this.$private.height;
  },
  set height(value) {
    this.$private.height = value;
    this.$private.svg.setAttribute('height', value + 'px');
  },
  getContext: function(type) {
    if (!this.context)
      this.context = new SvgCanvasContext(this);
    return this.context;
  }
};

function SvgCanvasContext(canvas) {
  this.canvas = canvas;

  this.$private = {
    svg: canvas.$private.svg,
    current: canvas.$private.svg,
    savedStates: [],
    transform: [1, 0, 0, 1, 0, 0],
    inverseTransform: [1, 0, 0, 1, 0, 0],
    path: '',
    font: { family: 'sans-serif', size: '10px' }
  };
  this.$private.executeTransform = function(a, b, c, d, e, f) {
    var k = 1 / (a * d - b * c);
    var a1 = d * k, b1 = -b * k, c1 = -c * k, d1 = a * k,
      e1 = (c * f - e * d) * k, f1 = (e * b - a * f) * k;
    var t = this.transform;
    this.transform = [t[0] * a + t[2] * b, t[1] * a + t[3] * b, t[0] * c + t[2] * d, t[1] * c + t[3] * d,
      t[0] * e + t[2] * f + t[4], t[1] * e + t[3] * f + t[5]];
    t = this.inverseTransform;
    this.inverseTransform = [a1 * t[0] + c1 * t[1], b1 * t[0] + d1 * t[1], a1 * t[2] + c1 * t[3],
      b1 * t[2] + d1 * t[3], a1 * t[4] + c1 * t[5] + e1, b1 * t[4] + d1 * t[5] + f1];
  };

  this.lineWidth = 0;
  this.strokeStyle = '';
  this.fillStyle = '';
  this.mozFillRule = 'evenodd';
  this.lineCap = 0;
  this.lineJoin = 0;
  this.miterLimit = 0;
  this.mozDash = 0;
  this.mozDashOffset = 0;
}

SvgCanvasContext.prototype = {
  save: function() {
    var state = {
      transform: this.$private.transform,
      inverseTransform: this.$private.inverseTransform,
      current: this.$private.current,
      lineWidth: this.lineWidth,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      font: this.$private.font,
      mozFillRule: this.mozFillRule,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      miterLimit: this.miterLimit,
      mozDash: this.mozDash,
      mozDashOffset: this.mozDashOffset
    };
    this.$private.savedStates.push(state);
  },
  restore: function() {
    var state = this.$private.savedStates.pop();
    this.$private.transform = state.transform;
    this.$private.inverseTransform = state.inverseTransform;
    this.$private.current = state.current;
    this.lineWidth = state.lineWidth;
    this.strokeStyle = state.strokeStyle;
    this.fillStyle = state.fillStyle;
    this.$private.font = state.font;
    this.mozFillRule = state.mozFillRule;
    this.lineCap = state.lineCap;
    this.lineJoin = state.lineJoin;
    this.miterLimit = state.miterLimit;
    this.mozDash = state.mozDash;
    this.mozDashOffset = state.mozDashOffset;
  },
  get mozCurrentTransform() {
    return this.$private.transform;
  },
  get mozCurrentTransformInverse() {
    return this.$private.inverseTransform;
  },
  get font() {
    return this.$private.font.size + ' ' + this.$private.font.family;
  },
  set font(value) {
    var size = /\s([0-9]+.?px)/.exec(value);
    if (!size) {
      size = /\s([0-9]+.+px)/.exec(value);
    }
    var family = /\".+\"/.exec(value)[0];
    // if(m)
      this.$private.font = { family: family, size: size[1] };
  },
  scale: function(sx, sy) {
    this.$private.executeTransform(sx, 0, 0, sy, 0, 0);
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'scale(' + sx + ',' + sy + ')');
    this.$private.current.appendChild(g);
    this.$private.current = g;
  },
  translate: function(dx, dy) {
    this.$private.executeTransform(1, 0, 0, 1, dx, dy);
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'translate(' + dx + ',' + dy + ')');
    this.$private.current.appendChild(g);
    this.$private.current = g;
  },
  transform: function(a, b, c, d, e, f) {
    this.$private.executeTransform(a, b, c, d, e, f);
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'matrix(' + a + ',' + b + ',' + c + ',' + d + ',' + e + ',' + f + ')');
    this.$private.current.appendChild(g);
    this.$private.current = g;
  },
  setTransform: function(a, b, c, d, e, f) {
    this.transform.apply(this, this.$private.inverseTransform);
    this.transform(a, b, c, d, e, f);
  },
  beginPath: function() {
    this.$private.path = '';
  },
  closePath: function() {
    this.$private.path += 'Z ';
  },
  moveTo: function(x, y) {
    this.$private.path += 'M ' + x + ' ' + y + ' ';
  },
  lineTo: function(x, y) {
    this.$private.path += 'L ' + x + ' ' + y + ' ';
  },
  bezierCurveTo: function(x1, y1, x2, y2, x3, y3) {
    this.$private.path += 'C ' + x1 + ' ' + y1 + ' ' +
      x2 + ' ' + y2 + ' ' + x3 + ' ' + y3 + ' ';
  },
  stroke: function() {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', this.$private.path);
    path.setAttribute('stroke', this.strokeStyle);
    path.setAttribute('fill', 'none');
    this.$private.current.appendChild(path);
  },
  fill: function() {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', this.$private.path);
    path.setAttribute('stroke', 'none');
    path.setAttribute('fill', this.fillStyle);
    this.$private.current.appendChild(path);
  },
  fillText: function(s, x, y) {
    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '' + x);
    text.setAttribute('y', '' + y);
    text.setAttribute('font-family', this.$private.font.family);
    text.setAttribute('font-size', this.$private.font.size);
    text.textContent = s;
    this.$private.current.appendChild(text);
  },
  rect: function(x, y, width, height) {
    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '' + x);
    rect.setAttribute('y', '' + y);
    rect.setAttribute('width', '' + width);
    rect.setAttribute('height', '' + height);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', this.strokeStyle);
    this.$private.current.appendChild(rect);
  },
  fillRect: function(x, y, width, height) {
    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '' + x);
    rect.setAttribute('y', '' + y);
    rect.setAttribute('width', '' + width);
    rect.setAttribute('height', '' + height);
    rect.setAttribute('fill', this.fillStyle);
    rect.setAttribute('stroke', 'none');
    this.$private.current.appendChild(rect);
  },
  drawImage: function(img, sx, sy, sw, sh, dx, dy, dw, dh) {
   // TODO also img, dx, dy
  },
  createLinearGradient: function(x1, y1, x2, y2) {
    return ''; // TODO
  },
  createRadialGradient: function(x1, y1, r1, x2, y2, r2) {
    return ''; // TODO
  },
  createPattern: function(canvas, flags) {
    return ''; // TODO
  },
  clip: function() {
    // TODO
  }
};
