// CSE 160 Assignment 2: Blocky Penguin - Desmond Driver

const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let g_vertexBuffer;

let g_startTime = performance.now() / 1000.0;
let g_seconds = 0;
let g_animation = true;
let g_specialAnimation = false;
let g_specialStart = 0;

let g_shapesDrawn = 0;
let g_trianglesDrawn = 0;

let g_globalAngle = 0;
let g_mouseAngleX = -6;
let g_mouseAngleY = 14;
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let g_headAngle = 0;
let g_beakAngle = 0;
let g_leftFlipperAngle = -8;
let g_rightFlipperAngle = 8;
let g_tailAngle = 0;
let g_leftUpperLegAngle = 0;
let g_leftLowerLegAngle = 0;
let g_leftFootAngle = 0;
let g_rightUpperLegAngle = 0;
let g_rightLowerLegAngle = 0;
let g_rightFootAngle = 0;

const globalControls = [
  { id: 'globalAngle', label: 'Global Y', min: -180, max: 180, value: 0, set: v => g_globalAngle = v },
];

const jointControls = [
  { id: 'headAngle', label: 'Head', min: -30, max: 30, value: 0, set: v => g_headAngle = v },
  { id: 'beakAngle', label: 'Beak', min: -20, max: 20, value: 0, set: v => g_beakAngle = v },
  { id: 'leftFlipperAngle', label: 'Left Flipper', min: -80, max: 40, value: -8, set: v => g_leftFlipperAngle = v },
  { id: 'rightFlipperAngle', label: 'Right Flipper', min: -40, max: 80, value: 8, set: v => g_rightFlipperAngle = v },
  { id: 'tailAngle', label: 'Tail', min: -30, max: 30, value: 0, set: v => g_tailAngle = v },
  { id: 'leftUpperLegAngle', label: 'Left Upper Leg', min: -45, max: 45, value: 0, set: v => g_leftUpperLegAngle = v },
  { id: 'leftLowerLegAngle', label: 'Left Lower Leg', min: -45, max: 45, value: 0, set: v => g_leftLowerLegAngle = v },
  { id: 'leftFootAngle', label: 'Left Foot', min: -35, max: 35, value: 0, set: v => g_leftFootAngle = v },
  { id: 'rightUpperLegAngle', label: 'Right Upper Leg', min: -45, max: 45, value: 0, set: v => g_rightUpperLegAngle = v },
  { id: 'rightLowerLegAngle', label: 'Right Lower Leg', min: -45, max: 45, value: 0, set: v => g_rightLowerLegAngle = v },
  { id: 'rightFootAngle', label: 'Right Foot', min: -35, max: 35, value: 0, set: v => g_rightFootAngle = v },
];

class Matrix4 {
  constructor(src) {
    if (src && src.elements) {
      this.elements = new Float32Array(src.elements);
    } else {
      this.elements = new Float32Array(16);
      this.setIdentity();
    }
  }

  setIdentity() {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8] = 0; e[12] = 0;
    e[1] = 0; e[5] = 1; e[9] = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }

  multiply(other) {
    const a = this.elements;
    const b = other.elements;
    const e = new Float32Array(16);

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        e[i + j * 4] =
          a[i + 0 * 4] * b[0 + j * 4] +
          a[i + 1 * 4] * b[1 + j * 4] +
          a[i + 2 * 4] * b[2 + j * 4] +
          a[i + 3 * 4] * b[3 + j * 4];
      }
    }

    this.elements = e;
    return this;
  }

  translate(x, y, z) {
    const t = new Matrix4();
    t.elements[12] = x;
    t.elements[13] = y;
    t.elements[14] = z;
    return this.multiply(t);
  }

  scale(x, y, z) {
    const s = new Matrix4();
    s.elements[0] = x;
    s.elements[5] = y;
    s.elements[10] = z;
    return this.multiply(s);
  }

  rotate(angle, x, y, z) {
    const rad = Math.PI * angle / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const len = Math.sqrt(x * x + y * y + z * z);

    if (len === 0) return this;

    x /= len;
    y /= len;
    z /= len;

    const nc = 1 - c;
    const r = new Matrix4();
    const e = r.elements;

    e[0] = x * x * nc + c;
    e[1] = x * y * nc + z * s;
    e[2] = x * z * nc - y * s;
    e[3] = 0;

    e[4] = x * y * nc - z * s;
    e[5] = y * y * nc + c;
    e[6] = y * z * nc + x * s;
    e[7] = 0;

    e[8] = x * z * nc + y * s;
    e[9] = y * z * nc - x * s;
    e[10] = z * z * nc + c;
    e[11] = 0;

    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;

    return this.multiply(r);
  }
}

class Cube {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
  }

  render() {
    const rgba = this.color;
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle3D([-0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5, 0.5,0.5,-0.5, -0.5,0.5,-0.5]);

    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    drawTriangle3D([-0.5,-0.5,0.5, 0.5,0.5,0.5, 0.5,-0.5,0.5]);
    drawTriangle3D([-0.5,-0.5,0.5, -0.5,0.5,0.5, 0.5,0.5,0.5]);

    gl.uniform4f(u_FragColor, rgba[0]*0.67, rgba[1]*0.67, rgba[2]*0.67, rgba[3]);
    drawTriangle3D([-0.5,-0.5,-0.5, -0.5,0.5,-0.5, -0.5,0.5,0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5, -0.5,0.5,0.5, -0.5,-0.5,0.5]);

    gl.uniform4f(u_FragColor, rgba[0]*0.88, rgba[1]*0.88, rgba[2]*0.88, rgba[3]);
    drawTriangle3D([0.5,-0.5,-0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5]);
    drawTriangle3D([0.5,-0.5,-0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5]);

    gl.uniform4f(u_FragColor, rgba[0]*0.95, rgba[1]*0.95, rgba[2]*0.95, rgba[3]);
    drawTriangle3D([-0.5,0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5]);
    drawTriangle3D([-0.5,0.5,-0.5, 0.5,0.5,0.5, -0.5,0.5,0.5]);

    gl.uniform4f(u_FragColor, rgba[0]*0.55, rgba[1]*0.55, rgba[2]*0.55, rgba[3]);
    drawTriangle3D([-0.5,-0.5,-0.5, 0.5,-0.5,0.5, 0.5,-0.5,-0.5]);
    drawTriangle3D([-0.5,-0.5,-0.5, -0.5,-0.5,0.5, 0.5,-0.5,0.5]);

    g_shapesDrawn += 1;
    g_trianglesDrawn += 12;
  }
}

class Sphere {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();

    if (!Sphere.vertices) {
      Sphere.vertices = makeSphereVertices(12, 16);
    }
  }

  render() {
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    drawTriangle3D(Sphere.vertices);
    g_shapesDrawn += 1;
    g_trianglesDrawn += Sphere.vertices.length / 9;
  }
}

class Cone {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();

    if (!Cone.vertices) {
      Cone.vertices = makeConeVertices(20);
    }
  }

  render() {
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    drawTriangle3D(Cone.vertices);
    g_shapesDrawn += 1;
    g_trianglesDrawn += Cone.vertices.length / 9;
  }
}

function makeSphereVertices(latBands, longBands) {
  const verts = [];

  for (let lat = 0; lat < latBands; lat++) {
    const theta1 = lat * Math.PI / latBands;
    const theta2 = (lat + 1) * Math.PI / latBands;

    for (let lon = 0; lon < longBands; lon++) {
      const phi1 = lon * 2 * Math.PI / longBands;
      const phi2 = (lon + 1) * 2 * Math.PI / longBands;

      const p1 = spherePoint(theta1, phi1);
      const p2 = spherePoint(theta2, phi1);
      const p3 = spherePoint(theta2, phi2);
      const p4 = spherePoint(theta1, phi2);

      verts.push(...p1, ...p2, ...p3);
      verts.push(...p1, ...p3, ...p4);
    }
  }

  return verts;
}

function spherePoint(theta, phi) {
  return [
    Math.sin(theta) * Math.cos(phi) * 0.5,
    Math.cos(theta) * 0.5,
    Math.sin(theta) * Math.sin(phi) * 0.5,
  ];
}

function makeConeVertices(segments) {
  const verts = [];
  const apex = [0, 0, -0.5];
  const center = [0, 0, 0.5];

  for (let i = 0; i < segments; i++) {
    const a1 = i * 2 * Math.PI / segments;
    const a2 = (i + 1) * 2 * Math.PI / segments;

    const p1 = [Math.cos(a1) * 0.5, Math.sin(a1) * 0.5, 0.5];
    const p2 = [Math.cos(a2) * 0.5, Math.sin(a2) * 0.5, 0.5];

    verts.push(...apex, ...p1, ...p2);
    verts.push(...center, ...p2, ...p1);
  }

  return verts;
}

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get WebGL context.');
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');

  g_vertexBuffer = gl.createBuffer();

  gl.enable(gl.DEPTH_TEST);
  gl.clearDepth(1.0);
  gl.disable(gl.BLEND);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  addActionsForHtmlUI();
  requestAnimationFrame(tick);
}

function initShaders(gl, vshader, fshader) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);

  if (!vertexShader || !fragmentShader) return false;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('Could not link shaders: ' + gl.getProgramInfoLog(program));
    return false;
  }

  gl.useProgram(program);
  gl.program = program;
  return true;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log('Shader compile failed: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function addActionsForHtmlUI() {
  document.getElementById('animationOnButton').onclick = function() {
    g_animation = true;
  };

  document.getElementById('animationOffButton').onclick = function() {
    g_animation = false;
  };

  document.getElementById('resetButton').onclick = function() {
    resetPose();
  };

  buildSliders('globalControls', globalControls);
  buildSliders('jointControls', jointControls);

  canvas.addEventListener('mousedown', function(ev) {
    if (ev.shiftKey) {
      g_specialAnimation = true;
      g_specialStart = g_seconds;
    }

    g_isDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });

  canvas.addEventListener('mouseup', function() {
    g_isDragging = false;
  });

  canvas.addEventListener('mouseleave', function() {
    g_isDragging = false;
  });

  canvas.addEventListener('mousemove', function(ev) {
    if (!g_isDragging) return;

    const dx = ev.clientX - g_lastMouseX;
    const dy = ev.clientY - g_lastMouseY;

    g_mouseAngleY += dx * 0.45;
    g_mouseAngleX += dy * 0.45;

    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;

    renderScene();
  });
}

function buildSliders(containerId, controls) {
  const container = document.getElementById(containerId);

  controls.forEach(function(control) {
    const row = document.createElement('div');
    row.className = 'slider-row';

    const label = document.createElement('label');
    label.textContent = control.label;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = control.id;
    input.min = control.min;
    input.max = control.max;
    input.value = control.value;

    const value = document.createElement('span');
    value.id = control.id + 'Value';
    value.textContent = control.value;

    input.addEventListener('input', function() {
      const v = Number(this.value);
      value.textContent = v;
      control.set(v);
      renderScene();
    });

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(value);
    container.appendChild(row);
  });
}

function resetPose() {
  g_globalAngle = 0;
  g_mouseAngleX = -6;
  g_mouseAngleY = 14;

  g_headAngle = 0;
  g_beakAngle = 0;
  g_leftFlipperAngle = -8;
  g_rightFlipperAngle = 8;
  g_tailAngle = 0;

  g_leftUpperLegAngle = 0;
  g_leftLowerLegAngle = 0;
  g_leftFootAngle = 0;
  g_rightUpperLegAngle = 0;
  g_rightLowerLegAngle = 0;
  g_rightFootAngle = 0;

  const defaults = {
    globalAngle: 0,
    headAngle: 0,
    beakAngle: 0,
    leftFlipperAngle: -8,
    rightFlipperAngle: 8,
    tailAngle: 0,
    leftUpperLegAngle: 0,
    leftLowerLegAngle: 0,
    leftFootAngle: 0,
    rightUpperLegAngle: 0,
    rightLowerLegAngle: 0,
    rightFootAngle: 0,
  };

  Object.keys(defaults).forEach(function(id) {
    const input = document.getElementById(id);
    const span = document.getElementById(id + 'Value');

    if (input) input.value = defaults[id];
    if (span) span.textContent = defaults[id];
  });

  renderScene();
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  const t = g_seconds;

  if (g_animation) {
    g_headAngle = 5 * Math.sin(2.0 * t);
    g_beakAngle = 4 * Math.sin(4.0 * t);

    g_leftFlipperAngle = -12 - 18 * Math.sin(2.5 * t);
    g_rightFlipperAngle = 12 + 18 * Math.sin(2.5 * t);
    g_tailAngle = 7 * Math.sin(2.7 * t);

    g_leftUpperLegAngle = 18 * Math.sin(2.4 * t);
    g_rightUpperLegAngle = -18 * Math.sin(2.4 * t);
    g_leftLowerLegAngle = 10 + 10 * Math.sin(2.4 * t + 0.8);
    g_rightLowerLegAngle = 10 - 10 * Math.sin(2.4 * t + 0.8);
    g_leftFootAngle = -9 * Math.sin(2.4 * t + 0.3);
    g_rightFootAngle = 9 * Math.sin(2.4 * t + 0.3);
  }

  if (g_specialAnimation) {
    const dt = t - g_specialStart;

    if (dt < 1.5) {
      g_headAngle = 14 * Math.sin(12 * dt);
      g_beakAngle = 10 * Math.sin(13 * dt);
      g_leftFlipperAngle = -20 - 40 * Math.abs(Math.sin(10 * dt));
      g_rightFlipperAngle = 20 + 40 * Math.abs(Math.sin(10 * dt));
    } else {
      g_specialAnimation = false;
    }
  }
}

function renderScene() {
  const start = performance.now();

  g_shapesDrawn = 0;
  g_trianglesDrawn = 0;

  const globalMatrix = new Matrix4();
  globalMatrix.rotate(g_globalAngle, 0, 1, 0);
  globalMatrix.rotate(g_mouseAngleX, 1, 0, 0);
  globalMatrix.rotate(g_mouseAngleY, 0, 1, 0);

  if (g_specialAnimation) {
    const dt = g_seconds - g_specialStart;
    globalMatrix.rotate(360 * dt / 1.5, 0, 1, 0);
  }

  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawShadow();
  drawPenguin();

  const duration = performance.now() - start;
  const fps = Math.round(10000 / Math.max(duration, 1)) / 10;

  sendTextToHTML(
    `ms: ${duration.toFixed(2)} | fps estimate: ${fps} | shapes: ${g_shapesDrawn} | triangles: ${Math.round(g_trianglesDrawn)}`,
    'numdot'
  );
}

function drawShadow() {
  const shadow = new Sphere();
  shadow.color = [0.74, 0.74, 0.74, 1.0];
  shadow.matrix.translate(0, -0.95, 0.02);
  shadow.matrix.scale(0.95, 0.045, 0.65);
  shadow.render();
}

function drawPenguin() {
  const bodyBlack = [0.02, 0.02, 0.025, 1.0];
  const wingGray = [0.25, 0.26, 0.31, 1.0];
  const headGray = [0.39, 0.41, 0.46, 1.0];
  const headTopGray = [0.42, 0.44, 0.49, 1.0];
  const white = [0.98, 0.98, 0.99, 1.0];
  const lightGray = [0.90, 0.92, 0.96, 1.0];
  const orange = [0.96, 0.66, 0.10, 1.0];
  const footOrange = [0.92, 0.64, 0.08, 1.0];
  const eyeBlack = [0.0, 0.0, 0.0, 1.0];

  let bounce = 0;
  if (g_animation) {
    bounce = 0.03 * Math.abs(Math.sin(2.4 * g_seconds));
  }
  if (g_specialAnimation) {
    bounce += 0.05 * Math.abs(Math.sin(15 * (g_seconds - g_specialStart)));
  }

  const bodyBase = new Matrix4();
  bodyBase.translate(0, 0.03 + bounce, 0);

  if (g_animation) {
    bodyBase.rotate(3 * Math.sin(2.4 * g_seconds), 0, 0, 1);
  }

  const body = new Cube();
  body.color = bodyBlack;
  body.matrix = new Matrix4(bodyBase);
  body.matrix.scale(0.78, 1.12, 0.54);
  body.render();

  const belly = new Cube();
  belly.color = white;
  belly.matrix = new Matrix4(bodyBase);
  belly.matrix.translate(0, -0.02, -0.295);
  belly.matrix.scale(0.58, 0.93, 0.055);
  belly.render();

  const bellySoft = new Sphere();
  bellySoft.color = lightGray;
  bellySoft.matrix = new Matrix4(bodyBase);
  bellySoft.matrix.translate(0, -0.08, -0.335);
  bellySoft.matrix.scale(0.34, 0.50, 0.04);
  bellySoft.render();

  const headJoint = new Matrix4(bodyBase);
  headJoint.translate(0, 0.80, -0.01);
  headJoint.rotate(g_headAngle, 0, 1, 0);

  const head = new Cube();
  head.color = headGray;
  head.matrix = new Matrix4(headJoint);
  head.matrix.scale(0.54, 0.48, 0.50);
  head.render();

  // Extra thin top cap. This gives the top of the head a solid clean surface
  // and avoids the see-through or glitchy look from tight overlapping parts.
  const headTop = new Cube();
  headTop.color = headTopGray;
  headTop.matrix = new Matrix4(headJoint);
  headTop.matrix.translate(0, 0.255, 0.0);
  headTop.matrix.scale(0.545, 0.025, 0.505);
  headTop.render();

  const face = new Cube();
  face.color = white;
  face.matrix = new Matrix4(headJoint);
  face.matrix.translate(0, -0.03, -0.265);
  face.matrix.scale(0.34, 0.28, 0.045);
  face.render();

  drawEye(headJoint, -0.11, 0.03, eyeBlack);
  drawEye(headJoint, 0.11, 0.03, eyeBlack);

  const beakJoint = new Matrix4(headJoint);
  beakJoint.translate(0, -0.03, -0.305);
  beakJoint.rotate(g_beakAngle, 1, 0, 0);

  const beak = new Cube();
  beak.color = orange;
  beak.matrix = new Matrix4(beakJoint);
  beak.matrix.rotate(-15, 1, 0, 0);
  beak.matrix.translate(0, 0.0, -0.02);
  beak.matrix.scale(0.16, 0.09, 0.20);
  beak.render();

  drawFlipper(bodyBase, -0.33, g_leftFlipperAngle, -1, wingGray);
  drawFlipper(bodyBase, 0.33, g_rightFlipperAngle, 1, wingGray);

  const tailJoint = new Matrix4(bodyBase);
  tailJoint.translate(0, -0.45, 0.28);
  tailJoint.rotate(g_tailAngle, 1, 0, 0);

  const tail = new Cube();
  tail.color = wingGray;
  tail.matrix = new Matrix4(tailJoint);
  tail.matrix.translate(0, -0.02, 0.05);
  tail.matrix.scale(0.17, 0.09, 0.19);
  tail.render();

  drawLegChain(bodyBase, -0.18, g_leftUpperLegAngle, g_leftLowerLegAngle, g_leftFootAngle, orange, footOrange);
  drawLegChain(bodyBase, 0.18, g_rightUpperLegAngle, g_rightLowerLegAngle, g_rightFootAngle, orange, footOrange);
}

function drawEye(headJoint, x, y, color) {
  const eye = new Sphere();
  eye.color = color;
  eye.matrix = new Matrix4(headJoint);
  eye.matrix.translate(x, y, -0.315);
  eye.matrix.scale(0.045, 0.055, 0.025);
  eye.render();
}

function drawFlipper(bodyBase, x, angle, side, color) {
  const flipperJoint = new Matrix4(bodyBase);
  flipperJoint.translate(x, 0.08, 0.00);
  flipperJoint.rotate(angle, 0, 0, 1);
  flipperJoint.rotate(side * 5, 0, 1, 0);

  const flipper = new Cube();
  flipper.color = color;
  flipper.matrix = new Matrix4(flipperJoint);
  flipper.matrix.translate(side * 0.02, -0.30, 0.02);
  flipper.matrix.scale(0.14, 0.52, 0.09);
  flipper.render();
}

function drawLegChain(bodyBase, x, upperAngle, lowerAngle, footAngle, legColor, footColor) {
  const upperJoint = new Matrix4(bodyBase);
  upperJoint.translate(x, -0.56, -0.02);
  upperJoint.rotate(upperAngle, 1, 0, 0);

  const upperLeg = new Cube();
  upperLeg.color = legColor;
  upperLeg.matrix = new Matrix4(upperJoint);
  upperLeg.matrix.translate(0, -0.10, 0);
  upperLeg.matrix.scale(0.10, 0.20, 0.10);
  upperLeg.render();

  const lowerJoint = new Matrix4(upperJoint);
  lowerJoint.translate(0, -0.20, 0);
  lowerJoint.rotate(lowerAngle, 1, 0, 0);

  const lowerLeg = new Cube();
  lowerLeg.color = legColor;
  lowerLeg.matrix = new Matrix4(lowerJoint);
  lowerLeg.matrix.translate(0, -0.09, 0);
  lowerLeg.matrix.scale(0.08, 0.18, 0.08);
  lowerLeg.render();

  const footJoint = new Matrix4(lowerJoint);
  footJoint.translate(0, -0.18, -0.03);
  footJoint.rotate(footAngle, 1, 0, 0);

  const foot = new Cube();
  foot.color = footColor;
  foot.matrix = new Matrix4(footJoint);
  foot.matrix.translate(0, -0.01, -0.10);
  foot.matrix.scale(0.23, 0.045, 0.21);
  foot.render();

  const toe = new Cube();
  toe.color = legColor;
  toe.matrix = new Matrix4(footJoint);
  toe.matrix.translate(0, 0.0, -0.18);
  toe.matrix.scale(0.15, 0.025, 0.08);
  toe.render();
}

function drawTriangle3D(vertices) {
  const n = vertices.length / 3;

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function sendTextToHTML(text, id) {
  const elm = document.getElementById(id);

  if (elm) {
    elm.innerHTML = text;
  }
}
