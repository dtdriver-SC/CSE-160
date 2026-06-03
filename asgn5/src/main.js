import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Floating Music Studio - cohesive version
// A cleaner layout that feels like one full studio island instead of random floating props.

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(6.5, 5.0, 7.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Required mouse controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.25, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 17;

// UI
const introOverlay = document.getElementById('introOverlay');
const startButton = document.getElementById('startButton');
const gameStartButton = document.getElementById('gameStartButton');
const gameStopButton = document.getElementById('gameStopButton');
const findText = document.getElementById('findText');
const timerText = document.getElementById('timerText');
const scoreText = document.getElementById('scoreText');
const gameMessage = document.getElementById('gameMessage');

startButton.addEventListener('click', () => {
  introOverlay.classList.add('hidden');
});

gameStartButton.addEventListener('click', () => {
  startGame();
});

gameStopButton.addEventListener('click', () => {
  stopGame();
});

// Skybox
const cubeTextureLoader = new THREE.CubeTextureLoader();
scene.background = cubeTextureLoader.load([
  '/skybox/px.png',
  '/skybox/nx.png',
  '/skybox/py.png',
  '/skybox/ny.png',
  '/skybox/pz.png',
  '/skybox/nz.png',
]);

// Textures
const textureLoader = new THREE.TextureLoader();

const woodTexture = textureLoader.load('/textures/wood_floor.png');
woodTexture.wrapS = THREE.RepeatWrapping;
woodTexture.wrapT = THREE.RepeatWrapping;
woodTexture.repeat.set(3, 2);

const neonFloorTexture = textureLoader.load('/textures/neon_floor.png');
neonFloorTexture.wrapS = THREE.RepeatWrapping;
neonFloorTexture.wrapT = THREE.RepeatWrapping;
neonFloorTexture.repeat.set(2, 2);

const speakerFabricTexture = textureLoader.load('/textures/speaker_fabric.png');
speakerFabricTexture.wrapS = THREE.RepeatWrapping;
speakerFabricTexture.wrapT = THREE.RepeatWrapping;
speakerFabricTexture.repeat.set(2, 2);

// Materials
const mat = {
  base: new THREE.MeshStandardMaterial({ color: 0x1d2130, roughness: 0.65 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x34384f, roughness: 0.55 }),
  wood: new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.72 }),
  neonFloor: new THREE.MeshStandardMaterial({ map: neonFloorTexture, roughness: 0.5, emissive: 0x111133, emissiveIntensity: 0.25 }),
  black: new THREE.MeshStandardMaterial({ color: 0x101017, roughness: 0.55 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x181824, roughness: 0.58 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x101023, emissive: 0x5cecff, emissiveIntensity: 1.05 }),
  keyWhite: new THREE.MeshStandardMaterial({ color: 0xf2f2eb, roughness: 0.45 }),
  keyBlack: new THREE.MeshStandardMaterial({ color: 0x050509, roughness: 0.45 }),
  speakerFabric: new THREE.MeshStandardMaterial({ map: speakerFabricTexture, roughness: 0.82 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0xff2fd8, emissiveIntensity: 1.1 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x56dfff, emissive: 0x2aa8ff, emissiveIntensity: 1.1 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffd96e, roughness: 0.35 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8d8d9b, metalness: 0.45, roughness: 0.25 }),
  vinyl: new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.35 }),
  red: new THREE.MeshStandardMaterial({ color: 0xff3e4f, emissive: 0xff2020, emissiveIntensity: 0.3 }),
  cloud: new THREE.MeshStandardMaterial({ color: 0xf2f7ff, roughness: 0.8 }),
};

// Lights: 3+ types
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xb7ecff, 0x292136, 0.85);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.25);
directionalLight.position.set(7, 9, 6);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
scene.add(directionalLight);

const pinkPointLight = new THREE.PointLight(0xff4fd8, 1.8, 16);
pinkPointLight.position.set(-3.3, 2.7, 1.2);
scene.add(pinkPointLight);

const bluePointLight = new THREE.PointLight(0x56dfff, 1.8, 16);
bluePointLight.position.set(3.3, 2.7, 1.2);
scene.add(bluePointLight);

const spotlight = new THREE.SpotLight(0xffffff, 1.7, 18, Math.PI / 7, 0.45);
spotlight.position.set(0, 6.4, 4.0);
spotlight.target.position.set(0, 0.4, 0.4);
spotlight.castShadow = true;
scene.add(spotlight);
scene.add(spotlight.target);

// Helpers
const animated = [];

// -------------------- SIMPLE RANDOM FIND GAME --------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const gameHitBoxes = [];
const gameItems = [
  { key: 'keyboard', label: 'Keyboard' },
  { key: 'micStand', label: 'Mic Stand' },
  { key: 'mic', label: 'Mic' },
  { key: 'vinyl', label: 'Vinyl' },
  { key: 'headphones', label: 'Headphones' },
  { key: 'boombox', label: 'Boombox' },
  { key: 'recordPlayer', label: 'Record Player' },
];

let currentTarget = null;
let roundsWon = 0;
let timeLeft = 10;
let gameActive = false;
let lastTimerSecond = Math.floor(performance.now() / 1000);

const invisibleHitBoxMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
});

function makeHitBox(key, label, x, y, z, sx, sy, sz) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    invisibleHitBoxMaterial
  );

  box.name = `${label} invisible click box`;
  box.position.set(x, y, z);
  box.userData.targetKey = key;
  box.userData.targetLabel = label;
  box.visible = true;

  scene.add(box);
  gameHitBoxes.push(box);
}

function updateGameUI() {
  if (!gameActive || !currentTarget) {
    findText.textContent = 'Find: Press Start Game';
    timerText.textContent = 'Time: 10';
    scoreText.textContent = `Rounds Won: ${roundsWon}`;
    return;
  }

  findText.textContent = `Find: ${currentTarget.label}`;
  timerText.textContent = `Time: ${timeLeft}`;
  scoreText.textContent = `Rounds Won: ${roundsWon}`;
}

function chooseRandomTarget() {
  let next = gameItems[Math.floor(Math.random() * gameItems.length)];

  // Avoid the same item twice in a row when possible.
  if (currentTarget && gameItems.length > 1) {
    let safety = 0;
    while (next.key === currentTarget.key && safety < 10) {
      next = gameItems[Math.floor(Math.random() * gameItems.length)];
      safety++;
    }
  }

  currentTarget = next;
  timeLeft = 10;
  lastTimerSecond = Math.floor(performance.now() / 1000);
  updateGameUI();
}

function startGame() {
  roundsWon = 0;
  gameActive = true;
  gameMessage.textContent = 'Game started. Find the random item before time runs out.';
  chooseRandomTarget();
}

function stopGame() {
  gameActive = false;
  currentTarget = null;
  gameMessage.textContent = 'Game stopped. Press Start Game to play again.';
  updateGameUI();
}

function winRound() {
  roundsWon++;
  gameMessage.textContent = `Correct. You found the ${currentTarget.label}. New random item selected.`;
  chooseRandomTarget();
}

function loseRound() {
  gameMessage.textContent = 'Time ran out. New random item selected.';
  chooseRandomTarget();
}

function tickGameTimer() {
  if (!gameActive || !currentTarget) return;

  const nowSecond = Math.floor(performance.now() / 1000);
  if (nowSecond !== lastTimerSecond) {
    const difference = nowSecond - lastTimerSecond;
    lastTimerSecond = nowSecond;
    timeLeft -= difference;

    if (timeLeft <= 0) {
      timeLeft = 0;
      updateGameUI();
      loseRound();
    } else {
      updateGameUI();
    }
  }
}

window.addEventListener('click', (event) => {
  if (!gameActive || !currentTarget) return;

  // Do not count UI clicks as game clicks.
  if (event.target.closest('#ui') || event.target.closest('#introOverlay')) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(gameHitBoxes, true);

  if (hits.length === 0) {
    gameMessage.textContent = `Missed. Find ${currentTarget.label}.`;
    return;
  }

  const clickedKey = hits[0].object.userData.targetKey;

  if (clickedKey === currentTarget.key) {
    winRound();
  } else {
    const clickedLabel = hits[0].object.userData.targetLabel || 'another item';
    gameMessage.textContent = `That was ${clickedLabel}. Find ${currentTarget.label}.`;
  }
});


function addMesh(mesh, shouldAnimate = false) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (shouldAnimate) animated.push(mesh);
  return mesh;
}

function cube(name, sx, sy, sz, x, y, z, material, animate = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  return addMesh(mesh, animate);
}

function cylinder(name, rt, rb, h, x, y, z, material, animate = false, seg = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  return addMesh(mesh, animate);
}

function sphere(name, r, x, y, z, material, animate = false) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  return addMesh(mesh, animate);
}

function fitModel(model, targetSize) {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateWorldMatrix(true, true);

  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  let maxDim = Math.max(size.x, size.y, size.z, 0.001);

  const scale = targetSize / maxDim;
  model.scale.setScalar(scale);

  model.updateWorldMatrix(true, true);
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
}

// Cohesive main island
cube('main floating base', 11.2, 0.5, 7.8, 0, -0.35, 0, mat.base);
cube('neon carpet floor', 9.8, 0.08, 6.4, 0, 0.02, 0, mat.neonFloor);
cube('wood studio rug', 7.2, 0.09, 4.2, 0, 0.09, -0.35, mat.wood);

// Trim border, looks intentional
cube('front trim', 11.4, 0.18, 0.2, 0, 0.05, 3.9, mat.trim);
cube('back trim', 11.4, 0.18, 0.2, 0, 0.05, -3.9, mat.trim);
cube('left trim', 0.2, 0.18, 7.8, -5.6, 0.05, 0, mat.trim);
cube('right trim', 0.2, 0.18, 7.8, 5.6, 0.05, 0, mat.trim);

// Back studio wall/shelf area to give cohesion
cube('back low wall', 8.4, 1.55, 0.28, 0, 0.85, -3.45, mat.dark);
cube('back shelf', 6.8, 0.18, 0.55, 0, 1.55, -3.15, mat.wood);
cube('left acoustic panel', 1.2, 1.1, 0.1, -3.35, 1.0, -3.25, mat.pink);
cube('right acoustic panel', 1.2, 1.1, 0.1, 3.35, 1.0, -3.25, mat.blue);
cube('center wall screen', 2.4, 1.1, 0.1, 0, 1.15, -3.22, mat.screen, true);

// Main desk
cube('desk top', 6.5, 0.32, 1.35, 0, 1.0, -1.55, mat.wood);
cube('desk left leg front', 0.28, 1.0, 0.28, -3.0, 0.47, -0.95, mat.wood);
cube('desk right leg front', 0.28, 1.0, 0.28, 3.0, 0.47, -0.95, mat.wood);
cube('desk left leg back', 0.28, 1.0, 0.28, -3.0, 0.47, -2.05, mat.wood);
cube('desk right leg back', 0.28, 1.0, 0.28, 3.0, 0.47, -2.05, mat.wood);

// Laptop
cube('laptop base', 1.7, 0.1, 0.95, 0, 1.24, -1.38, mat.dark);
const laptopScreen = cube('laptop screen', 1.7, 1.05, 0.08, 0, 1.82, -1.83, mat.screen, true);
laptopScreen.rotation.x = -0.12;

// MIDI keyboard
cube('midi keyboard body', 3.8, 0.16, 0.72, 0, 1.27, -0.55, mat.black);
for (let i = 0; i < 16; i++) {
  cube(`white key ${i}`, 0.17, 0.05, 0.5, -1.55 + i * 0.205, 1.39, -0.48, mat.keyWhite);
}
for (let i = 0; i < 11; i++) {
  cube(`black key ${i}`, 0.11, 0.065, 0.31, -1.43 + i * 0.285, 1.43, -0.64, mat.keyBlack);
}

// Built-in monitor speakers scaled with desk
function monitorSpeaker(x, side) {
  cube(`${side} studio monitor box`, 0.85, 1.35, 0.65, x, 1.65, -1.45, mat.black, true);
  const woofer = cylinder(`${side} monitor woofer`, 0.24, 0.24, 0.07, x, 1.5, -1.1, mat.speakerFabric, true);
  woofer.rotation.x = Math.PI / 2;
  const tweeter = cylinder(`${side} monitor tweeter`, 0.12, 0.12, 0.07, x, 1.9, -1.1, side === 'left' ? mat.blue : mat.pink, true);
  tweeter.rotation.x = Math.PI / 2;
}
monitorSpeaker(-2.35, 'left');
monitorSpeaker(2.35, 'right');

// Record player area, smaller and cohesive on right desk
cube('record player table block', 1.75, 0.18, 1.15, 2.45, 1.24, -0.55, mat.black);
const vinyl = cylinder('animated vinyl primary shape', 0.43, 0.43, 0.06, 2.45, 1.37, -0.55, mat.vinyl, true, 64);
// Vinyl stays flat on top of the desk and does not spin.
const vinylLabel = cylinder('vinyl label', 0.12, 0.12, 0.065, 2.45, 1.38, -0.55, mat.red, true, 32);
// Vinyl label stays flat and does not spin.

// Mic area on left front
const micBase = cylinder('mic base', 0.34, 0.34, 0.08, -3.65, 0.16, 0.95, mat.metal);
const micPole = cylinder('mic pole', 0.035, 0.035, 1.7, -3.65, 0.95, 0.95, mat.metal);
const micArm = cylinder('mic boom arm', 0.03, 0.03, 1.1, -3.25, 1.78, 0.95, mat.metal);
micArm.rotation.z = Math.PI / 2;
cube('vocal booth mini carpet', 1.6, 0.06, 1.3, -3.65, 0.13, 1.15, mat.dark);

// Center stage pad
const stage = cylinder('left neon floor decoration', 0.58, 0.58, 0.06, -4.35, 0.17, 2.85, mat.pink, true, 64);
stage.userData.pulse = true;

// Small colored square decorations placed around the room, not in front of the keyboard
const decorationPads = [
  [-4.55, 0.17, -2.45], [-4.1, 0.17, -2.45], [-3.65, 0.17, -2.45],
  [4.55, 0.17, -2.45], [4.1, 0.17, -2.45], [3.65, 0.17, -2.45],
  [-4.75, 0.17, 2.15], [-4.25, 0.17, 2.15],
  [4.75, 0.17, 2.15], [4.25, 0.17, 2.15],
  [-2.8, 0.17, 3.25], [2.8, 0.17, 3.25],
  [-1.9, 0.17, 3.25], [1.9, 0.17, 3.25],
  [-0.45, 0.17, 3.25], [0.45, 0.17, 3.25],
];

decorationPads.forEach((pos, i) => {
  const pad = cube(`colored room decoration square ${i}`, 0.32, 0.065, 0.32, pos[0], pos[1], pos[2], i % 2 ? mat.pink : mat.blue, true);
  pad.userData.pulse = true;
  pad.userData.offset = i * 0.25;
});

// Matching right-side neon circle decoration for balance
const rightCircle = cylinder('right neon floor decoration', 0.58, 0.58, 0.06, 4.35, 0.17, 2.85, mat.blue, true, 64);
rightCircle.userData.pulse = true;

// Standing light poles in matching corners
for (let i = 0; i < 4; i++) {
  const x = i < 2 ? -4.6 : 4.6;
  const z = i % 2 === 0 ? -2.7 : 2.7;
  cylinder(`corner light pole ${i}`, 0.045, 0.045, 1.7, x, 0.9, z, mat.metal);
  sphere(`corner glowing light ${i}`, 0.18, x, 1.8, z, i % 2 ? mat.pink : mat.blue, true);
}

// Music notes above back wall, closer and consistent
for (let i = 0; i < 8; i++) {
  const x = -3.2 + i * 0.9;
  const z = -2.82;
  const y = 2.05 + (i % 2) * 0.28;
  const stem = cylinder(`music note stem ${i}`, 0.018, 0.018, 0.55, x, y + 0.2, z, mat.gold, true, 10);
  stem.userData.float = true;
  stem.userData.offset = i * 0.6;
  const head = sphere(`music note head ${i}`, 0.12, x - 0.08, y - 0.12, z, mat.gold, true);
  head.scale.set(1.25, 0.7, 0.55);
  head.userData.float = true;
  head.userData.offset = i * 0.6;
}

// Clouds around, not inside the main layout
function cloudGroup(name, x, y, z, scale = 1) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  scene.add(group);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.38 + (i % 2) * 0.14, 24, 16), mat.cloud);
    p.position.set((i - 2) * 0.34 * scale, Math.sin(i) * 0.06, (i % 2) * 0.15);
    p.scale.set(1.35 * scale, 0.52 * scale, 0.78 * scale);
    group.add(p);
  }
  group.userData.float = true;
  group.userData.offset = x + z;
  animated.push(group);
}
cloudGroup('left overhead cloud', -4.6, 3.8, 1.4, 1.05);
cloudGroup('right overhead cloud', 4.6, 3.9, 1.2, 1.0);
cloudGroup('back overhead cloud', 0, 4.15, -2.9, 1.25);
cloudGroup('center high cloud', 0.2, 4.55, 0.55, 0.9);

// Custom GLB models
const loader = new GLTFLoader();

function loadModel(path, name, x, y, z, targetSize, rotY = 0, animate = false) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  scene.add(group);
  if (animate) animated.push(group);

  loader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      group.add(model);
      fitModel(model, targetSize);
    },
    undefined,
    () => {
      const fallback = new THREE.Mesh(new THREE.BoxGeometry(targetSize, targetSize * 0.45, targetSize), mat.metal);
      fallback.castShadow = true;
      fallback.receiveShadow = true;
      group.add(fallback);
      console.warn(`${name} failed to load. Fallback used.`);
    }
  );
  return group;
}

// Placed intentionally and consistently
loadModel('/models/headphones.glb', 'headphones model on left desk', -1.85, 1.36, 0.22, 0.85, Math.PI / 7);
loadModel('/models/microphone.glb', 'microphone model on stand', -2.85, 1.78, 0.95, 0.62, Math.PI / 2);
const boombox = loadModel('/models/boombox.glb', 'boombox model on shelf', -2.1, 1.68, -3.02, 1.05, 0, true);
loadModel('/models/record_player.glb', 'record player model on desk', 2.45, 1.43, -0.55, 0.95, -Math.PI / 10);
// Removed the two speaker.glb objects because they were floating in the air.
// The built-in primary-shape studio speakers on the desk remain in the scene.
loadModel('/models/mp3_player.glb', 'mp3 player model on desk', 1.4, 1.35, 0.2, 0.48, -Math.PI / 7);

let currentMode = 'studio';

// Invisible click boxes for the scavenger hunt.
// Final mapping:
// - Mic and mic stand are separate targets on the left.
// - Boombox, headphones, and record player are on the ground/desk area under the keyboard.
// - Keyboard is the long piano/MIDI keyboard above them.
// - Vinyl is the black record on the front-right counter/desk.
makeHitBox('keyboard', 'Keyboard', 0.0, 1.45, -0.52, 4.75, 0.95, 1.15);

makeHitBox('micStand', 'Mic Stand', -3.58, 1.05, 0.95, 1.05, 2.45, 1.05);
makeHitBox('mic', 'Mic', -2.85, 1.86, 0.95, 1.15, 0.9, 0.9);

makeHitBox('boombox', 'Boombox', 0.05, 0.7, 0.95, 1.55, 1.0, 1.0);
makeHitBox('headphones', 'Headphones', -1.0, 0.95, 0.2, 1.45, 0.9, 1.1);
makeHitBox('recordPlayer', 'Record Player', 1.35, 0.95, 0.2, 1.45, 0.9, 1.1);

makeHitBox('vinyl', 'Vinyl', 2.45, 1.45, -0.55, 1.3, 0.55, 1.3);

updateGameUI();

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  tickGameTimer();

  // Main required animation
  animated.forEach((obj, i) => {
    if (obj.userData.spin) {
      obj.rotation.z += 0.02;
    }
    if (obj.userData.pulse) {
      const s = 1 + Math.sin(t * 3.0 + (obj.userData.offset || i)) * 0.035;
      obj.scale.set(s, s, s);
    }
    if (obj.userData.float) {
      const baseY = obj.userData.baseY ?? obj.position.y;
      obj.userData.baseY = baseY;
      obj.position.y = baseY + Math.sin(t + (obj.userData.offset || 0)) * 0.06;
    }
  });

  // Bigger gear bounces only a little in concert mode, not chaos
  const bounce = 0.012;
  boombox.position.y = 1.68 + Math.abs(Math.sin(t * 5.5)) * bounce;

  // Lights move subtly
  pinkPointLight.position.x = -3.3 + Math.sin(t * 1.1) * 0.45;
  bluePointLight.position.x = 3.3 + Math.cos(t * 1.1) * 0.45;
  spotlight.position.x = Math.sin(t * 0.8) * 1.25;
  spotlight.position.z = 3.8 + Math.cos(t * 0.8) * 0.35;

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
