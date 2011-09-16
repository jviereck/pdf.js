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
    var size = /\s([0-9].+?px)/.exec(value)[0];
    var family = /\".+\"/.exec(value)[0];
    // if(m)
      this.$private.font = { family: family, size: size };
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
