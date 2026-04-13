// SHADERS
var VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform float u_Size;
void main() {
  gl_Position = a_Position;
  gl_PointSize = u_Size;
}`;

var FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}`;

// GLOBALS
let canvas, gl, a_Position, u_FragColor, u_Size;

const SQUARE = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedType = SQUARE;
let g_selectedColor = [1, 1, 1, 1];
let g_selectedSize = 10;
let g_selectedSegments = 10;

let g_shapesList = [];
let g_isDragging = false;
let g_lastX = null;
let g_lastY = null;

// ---------- SHAPES ----------

class Square {
  constructor() {
    this.position = [0, 0];
    this.color = [1, 1, 1, 1];
    this.size = 10;
  }

  render() {
    let d = this.size / canvas.width;
    let x = this.position[0];
    let y = this.position[1];

    let v1 = [x - d, y + d, x - d, y - d, x + d, y + d];
    let v2 = [x + d, y + d, x - d, y - d, x + d, y - d];

    drawTriangle(v1, this.color);
    drawTriangle(v2, this.color);
  }
}

class Triangle {
  constructor() {
    this.position = [0, 0];
    this.color = [1, 1, 1, 1];
    this.size = 10;
  }

  render() {
    let d = this.size / canvas.width;

    let v = [
      this.position[0], this.position[1] + d,
      this.position[0] - d, this.position[1] - d,
      this.position[0] + d, this.position[1] - d
    ];

    drawTriangle(v, this.color);
  }
}

class Circle {
  constructor() {
    this.position = [0, 0];
    this.color = [1, 1, 1, 1];
    this.size = 10;
    this.segments = 10;
  }

  render() {
    let d = this.size / canvas.width;

    for (let i = 0; i < this.segments; i++) {
      let a1 = (i / this.segments) * 2 * Math.PI;
      let a2 = ((i + 1) / this.segments) * 2 * Math.PI;

      let v = [
        this.position[0], this.position[1],
        this.position[0] + Math.cos(a1) * d, this.position[1] + Math.sin(a1) * d,
        this.position[0] + Math.cos(a2) * d, this.position[1] + Math.sin(a2) * d
      ];

      drawTriangle(v, this.color);
    }
  }
}

// ---------- MAIN ----------

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addUI();

  gl.clearColor(0, 0, 0, 1);
  renderAllShapes();
}

// ---------- SETUP ----------

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  canvas.onmousedown = function (e) {
    g_isDragging = true;
    let [x, y] = convert(e);
    addShape(x, y);
    g_lastX = x;
    g_lastY = y;
    renderAllShapes();
  };

  canvas.onmousemove = function (e) {
    if (!g_isDragging) return;

    let [x, y] = convert(e);
    fillDragGaps(g_lastX, g_lastY, x, y);
    g_lastX = x;
    g_lastY = y;
    renderAllShapes();
  };

  canvas.onmouseup = function () {
    g_isDragging = false;
    g_lastX = null;
    g_lastY = null;
  };

  canvas.onmouseleave = function () {
    g_isDragging = false;
    g_lastX = null;
    g_lastY = null;
  };
}

function connectVariablesToGLSL() {
  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  u_Size = gl.getUniformLocation(gl.program, "u_Size");
}

// ---------- UI ----------

function addUI() {
  document.getElementById("squareButton").onclick = () => g_selectedType = SQUARE;
  document.getElementById("triangleButton").onclick = () => g_selectedType = TRIANGLE;
  document.getElementById("circleButton").onclick = () => g_selectedType = CIRCLE;

  document.getElementById("clearButton").onclick = () => {
    g_shapesList = [];
    renderAllShapes();
  };

  document.getElementById("drawPictureButton").onclick = drawPicture;

  document.getElementById("redSlide").oninput = (e) => g_selectedColor[0] = e.target.value / 100;
  document.getElementById("greenSlide").oninput = (e) => g_selectedColor[1] = e.target.value / 100;
  document.getElementById("blueSlide").oninput = (e) => g_selectedColor[2] = e.target.value / 100;

  document.getElementById("sizeSlide").oninput = (e) => g_selectedSize = Number(e.target.value);
  document.getElementById("segmentSlide").oninput = (e) => g_selectedSegments = Number(e.target.value);
}

// ---------- DRAW ----------

function addShape(x, y) {
  let s;

  if (g_selectedType == SQUARE) {
    s = new Square();
  } else if (g_selectedType == TRIANGLE) {
    s = new Triangle();
  } else {
    s = new Circle();
    s.segments = g_selectedSegments;
  }

  s.position = [x, y];
  s.color = [...g_selectedColor];
  s.size = g_selectedSize;

  g_shapesList.push(s);
}

function fillDragGaps(x0, y0, x1, y1) {
  let dx = x1 - x0;
  let dy = y1 - y0;
  let dist = Math.sqrt(dx * dx + dy * dy);

  // smaller spacing = smoother drag fill
  let spacing = Math.max(0.015, g_selectedSize / 500);

  let steps = Math.max(1, Math.ceil(dist / spacing));

  for (let i = 1; i <= steps; i++) {
    let t = i / steps;
    let x = x0 + dx * t;
    let y = y0 + dy * t;
    addShape(x, y);
  }
}

// ---------- RENDER ----------

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (let s of g_shapesList) {
    s.render();
  }

  let stats = document.getElementById("stats");
  if (stats) {
    stats.innerText = "Shapes: " + g_shapesList.length;
  }
}

// ---------- HELPERS ----------

function convert(ev) {
  let r = ev.target.getBoundingClientRect();
  let x = ((ev.clientX - r.left) - canvas.width / 2) / (canvas.width / 2);
  let y = (canvas.height / 2 - (ev.clientY - r.top)) / (canvas.height / 2);
  return [x, y];
}

function drawTriangle(v, color) {
  let buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniform4fv(u_FragColor, color);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function pushTri(v, color) {
  g_shapesList.push({
    render: () => drawTriangle(v, color)
  });
}

// ---------- CAT DRAWING ----------

function drawPicture() {
  g_shapesList = [];

  const GRAY = [0.70, 0.70, 0.70, 1];
  const DARK = [0.12, 0.12, 0.12, 1];
  const PINK = [1.00, 0.65, 0.78, 1];
  const RED = [0.88, 0.12, 0.12, 1];
  const LIGHT = [0.92, 0.92, 0.92, 1];

  // ---------- HEAD ----------
  pushTri([-0.48, 0.30, -0.30, 0.52, -0.05, 0.42], GRAY);
  pushTri([-0.48, 0.30, -0.40, 0.00, -0.05, 0.42], GRAY);
  pushTri([-0.40, 0.00, -0.05, 0.42, 0.00, -0.02], GRAY);

  pushTri([0.48, 0.30, 0.30, 0.52, 0.05, 0.42], GRAY);
  pushTri([0.48, 0.30, 0.40, 0.00, 0.05, 0.42], GRAY);
  pushTri([0.40, 0.00, 0.05, 0.42, 0.00, -0.02], GRAY);

  pushTri([-0.05, 0.42, 0.05, 0.42, 0.00, -0.02], LIGHT);

  // ---------- EARS ----------
  pushTri([-0.33, 0.54, -0.23, 0.82, -0.10, 0.48], GRAY);
  pushTri([0.33, 0.54, 0.23, 0.82, 0.10, 0.48], GRAY);

  // inner ears
  pushTri([-0.28, 0.56, -0.23, 0.74, -0.16, 0.54], PINK);
  pushTri([0.28, 0.56, 0.23, 0.74, 0.16, 0.54], PINK);

  // ---------- D EYES ----------
  // left D
  pushTri([-0.23, 0.26, -0.18, 0.26, -0.23, 0.15], DARK);
  pushTri([-0.23, 0.15, -0.18, 0.26, -0.18, 0.15], DARK);
  pushTri([-0.18, 0.26, -0.11, 0.22, -0.18, 0.15], DARK);

  // inner left eye cut
  pushTri([-0.20, 0.23, -0.17, 0.23, -0.20, 0.17], LIGHT);
  pushTri([-0.20, 0.17, -0.17, 0.23, -0.17, 0.17], LIGHT);

  // right D
  pushTri([0.15, 0.26, 0.20, 0.26, 0.15, 0.15], DARK);
  pushTri([0.15, 0.15, 0.20, 0.26, 0.20, 0.15], DARK);
  pushTri([0.20, 0.26, 0.27, 0.22, 0.20, 0.15], DARK);

  // inner right eye cut
  pushTri([0.18, 0.23, 0.21, 0.23, 0.18, 0.17], LIGHT);
  pushTri([0.18, 0.17, 0.21, 0.23, 0.21, 0.17], LIGHT);

  // ---------- NOSE ----------
  pushTri([-0.05, 0.10, 0.05, 0.10, 0.00, 0.00], PINK);

  // ---------- MOUTH ----------
  pushTri([-0.10, -0.02, -0.02, 0.02, -0.04, -0.05], DARK);
  pushTri([0.10, -0.02, 0.02, 0.02, 0.04, -0.05], DARK);

  // ---------- NECK / COLLAR ----------
  pushTri([-0.34, -0.08, 0.34, -0.08, -0.34, -0.18], LIGHT);
  pushTri([0.34, -0.08, 0.34, -0.18, -0.34, -0.18], LIGHT);

  // ---------- BOW TIE ----------
  pushTri([-0.14, -0.13, -0.02, -0.22, -0.02, -0.06], RED);
  pushTri([0.14, -0.13, 0.02, -0.22, 0.02, -0.06], RED);
  pushTri([-0.02, -0.06, 0.02, -0.06, 0.00, -0.16], DARK);

  // ---------- BODY ----------
  pushTri([-0.34, -0.18, 0.34, -0.18, -0.34, -0.92], GRAY);
  pushTri([0.34, -0.18, 0.34, -0.92, -0.34, -0.92], GRAY);

  // inner belly cut / opening
  pushTri([-0.08, -0.50, 0.08, -0.50, -0.08, -0.92], LIGHT);
  pushTri([0.08, -0.50, 0.08, -0.92, -0.08, -0.92], LIGHT);

  // ---------- LEGS ----------
  pushTri([-0.34, -0.92, -0.16, -0.92, -0.34, -1.00], GRAY);
  pushTri([-0.16, -0.92, -0.16, -1.00, -0.34, -1.00], GRAY);

  pushTri([0.16, -0.92, 0.34, -0.92, 0.16, -1.00], GRAY);
  pushTri([0.34, -0.92, 0.34, -1.00, 0.16, -1.00], GRAY);

  // ---------- FEET TRIANGLES ----------
  pushTri([-0.34, -1.00, -0.30, -0.95, -0.26, -1.00], DARK);
  pushTri([-0.26, -1.00, -0.22, -0.95, -0.18, -1.00], DARK);

  pushTri([0.18, -1.00, 0.22, -0.95, 0.26, -1.00], DARK);
  pushTri([0.26, -1.00, 0.30, -0.95, 0.34, -1.00], DARK);

  renderAllShapes();
}