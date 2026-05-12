// World.js
// Grass world, block course, textures, and controls.

const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  varying vec2 v_UV;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_UV;

  uniform vec4 u_FragColor;
  uniform float u_texColorWeight;
  uniform int u_whichTexture;

  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;

  void main() {
    vec4 texColor = u_FragColor;

    if (u_whichTexture == 0) {
      texColor = texture2D(u_Sampler0, v_UV);
    } else if (u_whichTexture == 1) {
      texColor = texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == 2) {
      texColor = texture2D(u_Sampler2, v_UV);
    } else if (u_whichTexture == 3) {
      texColor = texture2D(u_Sampler3, v_UV);
    }

    gl_FragColor = (1.0 - u_texColorWeight) * u_FragColor + u_texColorWeight * texColor;
  }
`;

let gl;
let canvas;
let camera;
let statusEl;
let g_seconds = 0;
let g_startTime = performance.now() / 1000.0;
let g_lastFrame = performance.now();
let g_fps = 0;
let g_keys = {};
let g_jumpQueued = false;
let g_texturesLoaded = 0;

const uniforms = {};
const attribs = {};

const WORLD_SIZE = 32;
const MAX_HEIGHT = 4;
const TEX_GRASS = 0;
const TEX_DIRT = 1;
const TEX_WOOD = 2;
const TEX_SKY = 3;

let g_map = [];
let g_typeMap = [];
let g_platforms = [];
let g_cookie = { x: 25.5, y: 5.45, z: 28.5, won: false, requiredHeight: 5 };

const reusableCube = new Cube();

function main() {
  canvas = document.getElementById('webgl');
  statusEl = document.getElementById('status');
  resizeCanvas();

  gl = getWebGLContext(canvas);
  if (!gl) {
    alert('WebGL did not start. Try Chrome or Firefox.');
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    alert('Shader setup failed. Check the console.');
    return;
  }

  connectVariablesToGLSL();
  Cube.init(gl, attribs.a_Position, attribs.a_UV);

  gl.clearColor(0.48, 0.68, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  camera = new Camera(canvas);
  generateWorldMap();
  createCookieCourse();
  initTextures();
  setupEvents();

  requestAnimationFrame(tick);
}

function getWebGLContext(canvas) {
  return canvas.getContext('webgl', { preserveDrawingBuffer: true }) ||
         canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
}

function initShaders(gl, vshader, fshader) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);
  if (!vertexShader || !fragmentShader) return false;

  const program = gl.createProgram();
  if (!program) return false;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('Program link failed: ' + gl.getProgramInfoLog(program));
    return false;
  }

  gl.useProgram(program);
  gl.program = program;
  return true;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log('Shader compile failed: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function connectVariablesToGLSL() {
  attribs.a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  attribs.a_UV = gl.getAttribLocation(gl.program, 'a_UV');

  uniforms.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  uniforms.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  uniforms.u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  uniforms.u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  uniforms.u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  uniforms.u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');

  uniforms.u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  uniforms.u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  uniforms.u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  uniforms.u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
}

function initTextures() {
  makePlaceholderTexture(0, [90, 170, 70, 255]);
  makePlaceholderTexture(1, [125, 80, 42, 255]);
  makePlaceholderTexture(2, [135, 86, 39, 255]);
  makePlaceholderTexture(3, [90, 140, 255, 255]);

  gl.uniform1i(uniforms.u_Sampler0, 0);
  gl.uniform1i(uniforms.u_Sampler1, 1);
  gl.uniform1i(uniforms.u_Sampler2, 2);
  gl.uniform1i(uniforms.u_Sampler3, 3);

  loadTexture('textures/grass.png', 0, uniforms.u_Sampler0);
  loadTexture('textures/dirt.png', 1, uniforms.u_Sampler1);
  loadTexture('textures/wood.png', 2, uniforms.u_Sampler2);
  loadTexture('textures/sky.png', 3, uniforms.u_Sampler3);
}

function makePlaceholderTexture(unit, rgba) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return texture;
}

function loadTexture(path, unit, samplerUniform) {
  const texture = gl.createTexture();
  const image = new Image();

  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform1i(samplerUniform, unit);
    g_texturesLoaded++;
  };

  image.onerror = function() {
    console.log('Texture failed:', path);
  };

  image.src = path;
}

function setupEvents() {
  window.addEventListener('resize', function() {
    resizeCanvas();
    if (camera) camera.resize(canvas.width / canvas.height);
  });

  document.addEventListener('keydown', function(ev) {
    const key = ev.key.toLowerCase();
    g_keys[key] = true;

    if (key === 'f') addBlockInFront();
    if (key === 'r') deleteBlockInFront();
    if (ev.code === 'Space') {
      ev.preventDefault();
      g_jumpQueued = true;
    }
  });

  document.addEventListener('keyup', function(ev) {
    g_keys[ev.key.toLowerCase()] = false;
  });

  canvas.addEventListener('click', function() {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
    addBlockInFront();
  });

  canvas.addEventListener('contextmenu', function(ev) {
    ev.preventDefault();
    deleteBlockInFront();
  });

  canvas.addEventListener('mousemove', function(ev) {
    if (document.pointerLockElement === canvas) {
      camera.addYawPitch(ev.movementX * 0.15, -ev.movementY * 0.12);
    }
  });

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', function(ev) {
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
  });

  window.addEventListener('mouseup', function() {
    dragging = false;
  });

  window.addEventListener('mousemove', function(ev) {
    if (dragging && document.pointerLockElement !== canvas) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      camera.addYawPitch(dx * 0.20, -dy * 0.15);
      lastX = ev.clientX;
      lastY = ev.clientY;
    }
  });
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(window.innerWidth * dpr);
  const height = Math.floor(window.innerHeight * dpr);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
}

function tick(nowMs) {
  const dt = Math.min((nowMs - g_lastFrame) / 1000, 0.05);
  g_lastFrame = nowMs;
  if (dt > 0) g_fps = Math.round(1 / dt);

  g_seconds = performance.now() / 1000.0 - g_startTime;
  updateCameraFromKeys(dt);
  checkCookieWin();
  renderScene();
  updateHUD();

  requestAnimationFrame(tick);
}

function updateCameraFromKeys(dt) {
  if (!camera) return;

  const collision = isBlocked;
  if (g_keys['w']) camera.moveForward(collision);
  if (g_keys['s']) camera.moveBackwards(collision);
  if (g_keys['a']) camera.moveLeft(collision);
  if (g_keys['d']) camera.moveRight(collision);
  if (g_keys['q']) camera.panLeft();
  if (g_keys['e']) camera.panRight();

  if (g_jumpQueued) camera.jump();
  g_jumpQueued = false;

  camera.updateVertical(dt, getGroundHeight(camera.eye.elements[0], camera.eye.elements[2]));
}

function updateHUD() {
  const target = getTargetCell();
  const gameText = g_cookie.won ? '<strong>You won the cookie.</strong>' : 'Jump across the dirt blocks by spawn and grab the cookie.';

  statusEl.innerHTML =
    `Game: ${gameText}<br>` +
    `Facing cell: (${target.x}, ${target.z}) height ${cellHeight(target.x, target.z)}<br>` +
    `FPS: ${g_fps} | Textures: ${g_texturesLoaded}/4<br>` +
    `Tip: hold W while jumping. Each jump is one block up and one block over.`;
}

function renderScene() {
  resizeCanvas();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(uniforms.u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(uniforms.u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  drawSky();
  drawGround();
  drawCookieCourse();
  drawMapWalls();
  drawTrees();
  drawCookie();
}

function drawCubeAt(x, y, z, sx, sy, sz, color, textureNum, weight) {
  reusableCube.matrix.setIdentity();
  reusableCube.matrix.translate(x, y, z);
  reusableCube.matrix.scale(sx, sy, sz);
  reusableCube.color = color;
  reusableCube.textureNum = textureNum;
  reusableCube.texColorWeight = weight === undefined ? 1.0 : weight;
  reusableCube.render(gl, uniforms);
}

function drawUnitBlock(x, y, z, textureNum) {
  drawCubeAt(x + 0.5, y + 0.5, z + 0.5, 1, 1, 1, [1, 1, 1, 1], textureNum, 1.0);
}

function drawSky() {
  gl.disable(gl.CULL_FACE);
  drawCubeAt(16, 16, 16, 120, 120, 120, [0.45, 0.65, 1.0, 1.0], TEX_SKY, 0.75);
  gl.enable(gl.CULL_FACE);
}

function drawGround() {
  drawCubeAt(16, -0.08, 16, 34, 0.12, 34, [0.35, 0.78, 0.28, 1.0], TEX_GRASS, 1.0);
}

function drawCookieCourse() {
  for (const p of g_platforms) {
    drawCubeAt(p.x + 0.5, p.h - 0.5, p.z + 0.5, 1, 1, 1, [1, 1, 1, 1], TEX_DIRT, 1.0);
  }
}

function drawMapWalls() {
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const height = g_map[z][x];
      if (height <= 0) continue;

      const tex = g_typeMap[z][x];
      for (let y = 0; y < height; y++) {
        drawUnitBlock(x, y, z, tex);
      }
    }
  }
}

function drawTrees() {
  const trees = [
    [4, 4], [10, 5], [27, 4], [5, 17], [26, 20], [11, 26]
  ];

  for (const t of trees) {
    const x = t[0];
    const z = t[1];
    drawCubeAt(x + 0.5, 1.10, z + 0.5, 0.62, 2.2, 0.62, [1, 1, 1, 1], TEX_WOOD, 1.0);
    drawCubeAt(x + 0.5, 2.65, z + 0.5, 1.85, 1.45, 1.85, [0.14, 0.55, 0.16, 1.0], -2, 0.0);
    drawCubeAt(x + 0.5, 3.45, z + 0.5, 1.35, 1.05, 1.35, [0.10, 0.43, 0.13, 1.0], -2, 0.0);
  }
}


function drawCookie() {
  if (g_cookie.won) return;

  const bob = Math.sin(g_seconds * 2.5) * 0.06;
  const x = g_cookie.x;
  const y = g_cookie.y + bob;
  const z = g_cookie.z;

  drawCubeAt(x, y, z, 0.50, 0.18, 0.50, [0.72, 0.42, 0.16, 1.0], -2, 0.0);
  drawCubeAt(x - 0.13, y + 0.11, z - 0.10, 0.08, 0.06, 0.08, [0.18, 0.09, 0.03, 1.0], -2, 0.0);
  drawCubeAt(x + 0.12, y + 0.11, z + 0.11, 0.08, 0.06, 0.08, [0.18, 0.09, 0.03, 1.0], -2, 0.0);
  drawCubeAt(x + 0.04, y + 0.11, z - 0.18, 0.07, 0.06, 0.07, [0.18, 0.09, 0.03, 1.0], -2, 0.0);
}

function generateWorldMap() {
  g_map = [];
  g_typeMap = [];

  for (let z = 0; z < WORLD_SIZE; z++) {
    const row = [];
    const typeRow = [];

    for (let x = 0; x < WORLD_SIZE; x++) {
      let h = 0;
      let tex = TEX_DIRT;

      if (x === 0 || z === 0 || x === WORLD_SIZE - 1 || z === WORLD_SIZE - 1) {
        h = 3 + ((x + z) % 2);
        tex = TEX_WOOD;
      }

      if ((x === 7 && z > 2 && z < 26) ||
          (x === 14 && z > 5 && z < 30) ||
          (x === 22 && z > 1 && z < 24) ||
          (z === 8 && x > 3 && x < 18) ||
          (z === 15 && x > 10 && x < 30) ||
          (z === 24 && x > 2 && x < 23)) {
        h = 1 + ((x * 3 + z * 5) % 4);
        tex = ((x + z) % 3 === 0) ? TEX_WOOD : TEX_DIRT;
      }

      if ((x === 7 && (z === 5 || z === 14 || z === 22)) ||
          (x === 14 && (z === 10 || z === 20 || z === 27)) ||
          (x === 22 && (z === 6 || z === 17)) ||
          (z === 8 && (x === 6 || x === 13 || x === 17)) ||
          (z === 15 && (x === 13 || x === 21 || x === 28)) ||
          (z === 24 && (x === 5 || x === 16 || x === 21))) {
        h = 0;
      }

      if ((x >= 15 && x <= 27 && z >= 27 && z <= 30) ||
          (x >= 2 && x <= 6 && z >= 2 && z <= 6)) {
        h = 0;
      }

      row.push(h);
      typeRow.push(tex);
    }

    g_map.push(row);
    g_typeMap.push(typeRow);
  }

  setWall(11, 4, 2, TEX_WOOD);
  setWall(12, 4, 3, TEX_DIRT);
  setWall(26, 6, 2, TEX_WOOD);
  setWall(27, 6, 2, TEX_DIRT);
  setWall(4, 20, 2, TEX_WOOD);
  setWall(27, 25, 3, TEX_DIRT);
}

function createCookieCourse() {
  // One empty block between each jump.
  g_platforms = [
    { x: 17, z: 28, h: 1 },
    { x: 19, z: 28, h: 2 },
    { x: 21, z: 28, h: 3 },
    { x: 23, z: 28, h: 4 },
    { x: 25, z: 28, h: 5 }
  ];

  for (const p of g_platforms) {
    setWall(p.x, p.z, 0, TEX_DIRT);
  }
}

function setWall(x, z, h, tex) {
  if (x < 0 || x >= WORLD_SIZE || z < 0 || z >= WORLD_SIZE) return;
  g_map[z][x] = h;
  g_typeMap[z][x] = tex;
}

function checkCookieWin() {
  if (g_cookie.won) return;

  const dx = camera.eye.elements[0] - g_cookie.x;
  const dz = camera.eye.elements[2] - g_cookie.z;
  const ground = getGroundHeight(camera.eye.elements[0], camera.eye.elements[2]);
  if (Math.sqrt(dx * dx + dz * dz) < 0.8 && ground >= g_cookie.requiredHeight) {
    g_cookie.won = true;
  }
}

function isBlocked(x, z, cam) {
  const cellX = Math.floor(x);
  const cellZ = Math.floor(z);
  if (cellX < 0 || cellX >= WORLD_SIZE || cellZ < 0 || cellZ >= WORLD_SIZE) return true;
  if (g_map[cellZ][cellX] > 0) return true;

  if (cam) {
    const nextGround = getGroundHeight(x, z);
    const footY = cam.eye.elements[1] - cam.playerHeight;
    if (nextGround > footY + 0.75) return true;
  }

  return false;
}

function getPlatformHeightByCell(x, z) {
  for (const p of g_platforms) {
    if (p.x === x && p.z === z) return p.h;
  }
  return 0;
}

function getGroundHeight(x, z) {
  return getPlatformHeightByCell(Math.floor(x), Math.floor(z));
}

function cellHeight(x, z) {
  if (x < 0 || x >= WORLD_SIZE || z < 0 || z >= WORLD_SIZE) return -1;
  return g_map[z][x];
}

function getTargetCell() {
  const f = camera.getForwardVector(false);
  const distance = 1.55;
  const x = Math.floor(camera.eye.elements[0] + f[0] * distance);
  const z = Math.floor(camera.eye.elements[2] + f[2] * distance);
  return { x, z };
}

function addBlockInFront() {
  if (!camera || !g_map.length) return;
  const t = getTargetCell();
  if (t.x <= 0 || t.x >= WORLD_SIZE - 1 || t.z <= 0 || t.z >= WORLD_SIZE - 1) return;

  const playerX = Math.floor(camera.eye.elements[0]);
  const playerZ = Math.floor(camera.eye.elements[2]);
  if (t.x === playerX && t.z === playerZ) return;
  if (getPlatformHeightByCell(t.x, t.z) > 0) return;

  if (g_map[t.z][t.x] < MAX_HEIGHT) {
    g_map[t.z][t.x]++;
    g_typeMap[t.z][t.x] = TEX_DIRT;
  }
}

function deleteBlockInFront() {
  if (!camera || !g_map.length) return;
  const t = getTargetCell();
  if (t.x <= 0 || t.x >= WORLD_SIZE - 1 || t.z <= 0 || t.z >= WORLD_SIZE - 1) return;
  if (getPlatformHeightByCell(t.x, t.z) > 0) return;
  if (g_map[t.z][t.x] > 0) g_map[t.z][t.x]--;
}
