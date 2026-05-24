// World.js
// Clean lighting world with Phong controls, three colored spheres, and spotlight.

const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;

  void main() {
    vec4 worldPos = u_ModelMatrix * a_Position;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_UV = a_UV;
    v_WorldPos = worldPos.xyz;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;

  uniform vec4 u_FragColor;
  uniform float u_texColorWeight;
  uniform int u_whichTexture;

  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;

  uniform vec3 u_CameraPos;
  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;
  uniform int u_LightingOn;
  uniform int u_NormalOn;
  uniform int u_PointLightOn;

  uniform vec3 u_SpotLightPos;
  uniform vec3 u_SpotDirection;
  uniform vec3 u_SpotColor;
  uniform float u_SpotCutoff;
  uniform int u_SpotLightOn;

  vec4 baseColor() {
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

    return (1.0 - u_texColorWeight) * u_FragColor + u_texColorWeight * texColor;
  }

  vec3 phongLight(vec3 base, vec3 normal, vec3 lightPos, vec3 lightColor, float strength) {
    vec3 L = normalize(lightPos - v_WorldPos);
    vec3 V = normalize(u_CameraPos - v_WorldPos);
    vec3 R = reflect(-L, normal);

    float diffuse = max(dot(normal, L), 0.0);
    float specular = 0.0;
    if (diffuse > 0.0) {
      specular = pow(max(dot(V, R), 0.0), 32.0);
    }

    float dist = length(lightPos - v_WorldPos);
    float attenuation = 1.0 / (1.0 + 0.008 * dist * dist);

    vec3 diffuseColor = diffuse * base * lightColor;
    vec3 specularColor = 0.45 * specular * lightColor;
    return (diffuseColor + specularColor) * attenuation * strength;
  }

  void main() {
    vec4 color = baseColor();
    vec3 normal = normalize(v_Normal);

    if (u_NormalOn == 1) {
      gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
      return;
    }

    if (u_LightingOn == 0) {
      gl_FragColor = color;
      return;
    }

    vec3 lit = 0.22 * color.rgb; // ambient

    if (u_PointLightOn == 1) {
      lit += phongLight(color.rgb, normal, u_LightPos, u_LightColor, 1.35);
    }

    if (u_SpotLightOn == 1) {
      vec3 spotToFrag = normalize(v_WorldPos - u_SpotLightPos);
      float spotAmount = dot(spotToFrag, normalize(u_SpotDirection));
      float cone = smoothstep(u_SpotCutoff, u_SpotCutoff + 0.08, spotAmount);
      lit += phongLight(color.rgb, normal, u_SpotLightPos, u_SpotColor, cone * 1.8);
    }

    gl_FragColor = vec4(min(lit, vec3(1.0)), color.a);
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
const ui = {};

const WORLD_SIZE = 32;
const MAX_HEIGHT = 4;
const TEX_GRASS = 0;
const TEX_DIRT = 1;
const TEX_WOOD = 2;
const TEX_SKY = 3;

let g_map = [];
let g_typeMap = [];
let g_platforms = [];
let g_cookie = { x: 25.5, y: 5.45, z: 28.5, won: true, requiredHeight: 5 };

let g_lightingOn = true;
let g_normalOn = false;
let g_pointLightOn = true;
let g_spotLightOn = true;
let g_lightBase = [14.0, 5.0, 24.0];
let g_lightPos = [14.0, 5.0, 24.0];
let g_lightColor = [1.0, 0.86, 0.72];
let g_lightOrbitRadius = 5.0;
let g_spotLightPos = [16.0, 2.0, 27.0];
let g_spotDirection = [0.0, -0.35, -1.0];

const reusableCube = new Cube();
const sphereA = new Sphere();
const sphereB = new Sphere();
const sphereC = new Sphere();
let g_objModel = null;

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
  Cube.init(gl, attribs.a_Position, attribs.a_UV, attribs.a_Normal);
  Sphere.init(gl, attribs.a_Position, attribs.a_UV, attribs.a_Normal);

  // Required OBJ model: kept small/off to the side so the three spheres stay as the main focus.
  g_objModel = new OBJModel('models/crystal.obj');
  g_objModel.load(gl, attribs);

  gl.clearColor(0.48, 0.68, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  camera = new Camera(canvas);
  generateWorldMap();
  createCookieCourse();
  initTextures();
  setupEvents();
  setupLightingUI();

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
  attribs.a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');

  uniforms.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  uniforms.u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  uniforms.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  uniforms.u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  uniforms.u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  uniforms.u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  uniforms.u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');

  uniforms.u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  uniforms.u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  uniforms.u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  uniforms.u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');

  uniforms.u_CameraPos = gl.getUniformLocation(gl.program, 'u_CameraPos');
  uniforms.u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  uniforms.u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  uniforms.u_LightingOn = gl.getUniformLocation(gl.program, 'u_LightingOn');
  uniforms.u_NormalOn = gl.getUniformLocation(gl.program, 'u_NormalOn');
  uniforms.u_PointLightOn = gl.getUniformLocation(gl.program, 'u_PointLightOn');

  uniforms.u_SpotLightPos = gl.getUniformLocation(gl.program, 'u_SpotLightPos');
  uniforms.u_SpotDirection = gl.getUniformLocation(gl.program, 'u_SpotDirection');
  uniforms.u_SpotColor = gl.getUniformLocation(gl.program, 'u_SpotColor');
  uniforms.u_SpotCutoff = gl.getUniformLocation(gl.program, 'u_SpotCutoff');
  uniforms.u_SpotLightOn = gl.getUniformLocation(gl.program, 'u_SpotLightOn');
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

    if (key === 'l') toggleLighting();
    if (key === 'n') toggleNormals();
    if (key === 'p') togglePointLight();
    if (key === 'o') toggleSpotLight();
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
  });

  canvas.addEventListener('contextmenu', function(ev) {
    ev.preventDefault();
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

function setupLightingUI() {
  ui.lightingBtn = document.getElementById('toggleLighting');
  ui.normalBtn = document.getElementById('toggleNormals');
  ui.pointBtn = document.getElementById('togglePointLight');
  ui.spotBtn = document.getElementById('toggleSpotLight');
  ui.lightX = document.getElementById('lightX');
  ui.lightY = document.getElementById('lightY');
  ui.lightZ = document.getElementById('lightZ');
  ui.lightRadius = document.getElementById('lightRadius');
  ui.lightR = document.getElementById('lightR');
  ui.lightG = document.getElementById('lightG');
  ui.lightB = document.getElementById('lightB');
  ui.lightReadout = document.getElementById('lightReadout');

  if (ui.lightingBtn) ui.lightingBtn.addEventListener('click', toggleLighting);
  if (ui.normalBtn) ui.normalBtn.addEventListener('click', toggleNormals);
  if (ui.pointBtn) ui.pointBtn.addEventListener('click', togglePointLight);
  if (ui.spotBtn) ui.spotBtn.addEventListener('click', toggleSpotLight);
  updateLightingUI();
}

function toggleLighting() {
  g_lightingOn = !g_lightingOn;
  updateLightingUI();
}

function toggleNormals() {
  g_normalOn = !g_normalOn;
  updateLightingUI();
}

function togglePointLight() {
  g_pointLightOn = !g_pointLightOn;
  updateLightingUI();
}

function toggleSpotLight() {
  g_spotLightOn = !g_spotLightOn;
  updateLightingUI();
}

function updateLightingUI() {
  if (ui.lightingBtn) ui.lightingBtn.textContent = `Lighting: ${g_lightingOn ? 'ON' : 'OFF'}`;
  if (ui.normalBtn) ui.normalBtn.textContent = `Normals: ${g_normalOn ? 'ON' : 'OFF'}`;
  if (ui.pointBtn) ui.pointBtn.textContent = `Point Light: ${g_pointLightOn ? 'ON' : 'OFF'}`;
  if (ui.spotBtn) ui.spotBtn.textContent = `Spotlight: ${g_spotLightOn ? 'ON' : 'OFF'}`;
}

function readLightingControls() {
  if (ui.lightX) g_lightBase[0] = parseFloat(ui.lightX.value);
  if (ui.lightY) g_lightBase[1] = parseFloat(ui.lightY.value);
  if (ui.lightZ) g_lightBase[2] = parseFloat(ui.lightZ.value);
  if (ui.lightRadius) g_lightOrbitRadius = parseFloat(ui.lightRadius.value);

  if (ui.lightR) g_lightColor[0] = parseFloat(ui.lightR.value);
  if (ui.lightG) g_lightColor[1] = parseFloat(ui.lightG.value);
  if (ui.lightB) g_lightColor[2] = parseFloat(ui.lightB.value);
}

function updateLights() {
  readLightingControls();

  g_lightPos[0] = g_lightBase[0] + Math.cos(g_seconds * 0.9) * g_lightOrbitRadius;
  g_lightPos[1] = g_lightBase[1] + Math.sin(g_seconds * 1.3) * 0.75;
  g_lightPos[2] = g_lightBase[2] + Math.sin(g_seconds * 0.9) * g_lightOrbitRadius;

  if (camera) {
    const e = camera.eye.elements;
    const f = camera.getForwardVector(true);
    g_spotLightPos = [e[0], e[1], e[2]];
    g_spotDirection = [f[0], f[1], f[2]];
  }

  if (ui.lightReadout) {
    ui.lightReadout.textContent =
      `Point light: (${g_lightPos[0].toFixed(1)}, ${g_lightPos[1].toFixed(1)}, ${g_lightPos[2].toFixed(1)}) | ` +
      `Color RGB: (${g_lightColor[0].toFixed(2)}, ${g_lightColor[1].toFixed(2)}, ${g_lightColor[2].toFixed(2)})`;
  }
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
  updateLights();
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
  statusEl.innerHTML =
    `Phong: ambient + diffuse + specular<br>` +
    `Lighting: ${g_lightingOn ? 'on' : 'off'} | Normals: ${g_normalOn ? 'on' : 'off'}<br>` +
    `Three colored spheres: red, yellow, green<br>` +
    `OBJ crystal loaded small/off to the side for rubric credit<br>` +
    `FPS: ${g_fps} | Textures: ${g_texturesLoaded}/4<br>` +
    `Hotkeys: L, N, P, O.`;
}

function renderScene() {
  resizeCanvas();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(uniforms.u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(uniforms.u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniform3f(uniforms.u_CameraPos, camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);

  gl.uniform3f(uniforms.u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(uniforms.u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform1i(uniforms.u_LightingOn, g_lightingOn ? 1 : 0);
  gl.uniform1i(uniforms.u_NormalOn, g_normalOn ? 1 : 0);
  gl.uniform1i(uniforms.u_PointLightOn, g_pointLightOn ? 1 : 0);

  gl.uniform3f(uniforms.u_SpotLightPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  gl.uniform3f(uniforms.u_SpotDirection, g_spotDirection[0], g_spotDirection[1], g_spotDirection[2]);
  gl.uniform3f(uniforms.u_SpotColor, 0.82, 0.90, 1.0);
  gl.uniform1f(uniforms.u_SpotCutoff, Math.cos(18.0 * Math.PI / 180.0));
  gl.uniform1i(uniforms.u_SpotLightOn, g_spotLightOn ? 1 : 0);

  drawSky();
  drawGround();
  drawMapWalls();
  drawTrees();
  drawLightingSpheres();
  drawOBJModel();
  drawLightMarkers();
}

function temporarilySetLighting(on, drawFn) {
  gl.uniform1i(uniforms.u_LightingOn, on ? 1 : 0);
  drawFn();
  gl.uniform1i(uniforms.u_LightingOn, g_lightingOn ? 1 : 0);
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
  temporarilySetLighting(false, function() {
    gl.disable(gl.CULL_FACE);
    drawCubeAt(16, 16, 16, 120, 120, 120, [0.45, 0.65, 1.0, 1.0], TEX_SKY, 0.75);
    gl.enable(gl.CULL_FACE);
  });
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
  // Only two trees now. The old assignment 3 world had too many objects blocking the lighting demo.
  const trees = [
    [4, 4], [27, 4]
  ];

  for (const t of trees) {
    const x = t[0];
    const z = t[1];
    drawCubeAt(x + 0.5, 1.10, z + 0.5, 0.62, 2.2, 0.62, [1, 1, 1, 1], TEX_WOOD, 1.0);
    drawCubeAt(x + 0.5, 2.65, z + 0.5, 1.85, 1.45, 1.85, [0.14, 0.55, 0.16, 1.0], -2, 0.0);
    drawCubeAt(x + 0.5, 3.45, z + 0.5, 1.35, 1.05, 1.35, [0.10, 0.43, 0.13, 1.0], -2, 0.0);
  }
}

function drawLightingSpheres() {
  // Three colored spheres in front of the starting camera so the lighting change is obvious.
  sphereA.matrix.setIdentity();
  sphereA.matrix.translate(16.0, 1.25, 24.0);
  sphereA.matrix.scale(1.75, 1.75, 1.75);
  sphereA.color = [1.0, 0.08, 0.02, 1.0]; // red
  sphereA.render(gl, uniforms);

  sphereB.matrix.setIdentity();
  sphereB.matrix.translate(13.6, 1.05, 24.4);
  sphereB.matrix.scale(1.15, 1.15, 1.15);
  sphereB.color = [1.0, 0.85, 0.05, 1.0]; // yellow
  sphereB.render(gl, uniforms);

  sphereC.matrix.setIdentity();
  sphereC.matrix.translate(18.6, 1.05, 24.4);
  sphereC.matrix.scale(1.15, 1.15, 1.15);
  sphereC.color = [0.10, 0.85, 0.20, 1.0]; // green
  sphereC.render(gl, uniforms);
}

function drawOBJModel() {
  if (!g_objModel) return;
  g_objModel.matrix.setIdentity();
  // Required OBJ model. Small/off to the side so the three spheres stay as the main visual focus.
  g_objModel.matrix.translate(21.1, 0.75, 24.8);
  g_objModel.matrix.rotate(g_seconds * 14.0, 0, 1, 0);
  g_objModel.matrix.scale(0.45, 0.45, 0.45);
  g_objModel.color = [0.82, 0.82, 0.82, 1.0];

  gl.disable(gl.CULL_FACE);
  g_objModel.render(gl, uniforms);
  gl.enable(gl.CULL_FACE);
}

function drawLightMarkers() {
  temporarilySetLighting(false, function() {
    drawCubeAt(g_lightPos[0], g_lightPos[1], g_lightPos[2], 0.38, 0.38, 0.38,
      [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0], -2, 0.0);
  });
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

      // Keep a simple outside border so it still feels like the assignment 3 world.
      if (x === 0 || z === 0 || x === WORLD_SIZE - 1 || z === WORLD_SIZE - 1) {
        h = 2;
        tex = TEX_WOOD;
      }

      row.push(h);
      typeRow.push(tex);
    }

    g_map.push(row);
    g_typeMap.push(typeRow);
  }

  // Small demo corner behind the red sphere. This gives the same clear lighting look as the prompt images
  // without the old maze/tree clutter blocking the view.
  for (let x = 10; x <= 22; x++) {
    setWall(x, 21, 3 + (x % 2), TEX_DIRT);
  }
  for (let z = 21; z <= 27; z++) {
    setWall(10, z, 3, TEX_DIRT);
    setWall(23, z, 2, TEX_WOOD);
  }

  // A few low blocks off to the side so there are still regular cubes receiving light.
  setWall(13, 25, 1, TEX_DIRT);
  setWall(19, 25, 1, TEX_WOOD);
  setWall(21, 26, 2, TEX_DIRT);
}

function createCookieCourse() {
  // Assignment 3 cookie course is disabled for this lighting version to keep the scene clean.
  g_platforms = [];
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
