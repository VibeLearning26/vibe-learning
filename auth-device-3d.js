import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.authDeviceModuleStarted = 'module-started';

const canvas = document.getElementById('auth-device-canvas');

if (!canvas) {
  throw new Error('Missing auth device canvas.');
}

const MESH_NAMES = {
  purpilScreen: 'purpil screen',
  violetScreen: 'violet screen',
  blueScreen: 'blue screen',
  purpilCube: 'purpil cube',
  purpilButton: 'purpil button',
  purpilExit: 'purpil exit',
  goldenRing: 'golden ring',
  signIn: 'sign in',
  signUp: 'sign up',
  goldenExit: 'golden exit',
  violetCube: 'violet cube',
  forgotPasswordArea: 'forgot password area',
  violetButton: 'violet button',
  slideButton: 'slide button',
  google: 'google',
  github: 'github',
  douthub: 'douthub',
  conformButton: 'conform button',
  voiletExit: 'voilet exit',
  blueCube: 'blue cube',
  blueButton: 'blue button',
  blueExit: 'blue exit',
  cylinder1: 'cylinder1',
  cylinder2: 'cylinder2',
  purpilCylinder: 'purpil cylinder',
  voiletCylinder: 'voilet cylinder',
  blueCylinder: 'blue cylinder',
  purpilWire: 'purpil wire',
  violetWire: 'violet wire',
  blueWire: 'blue wire',
  mainCube: 'main cube',
};

const MESH_NAME_ALIASES = {
  'violet screen': ['vilot screen'],
  'slide button': ['sliding button'],
  douthub: ['doubthub'],
  'voilet exit': ['violet exit'],
  cylinder1: ['top cylinder1'],
  cylinder2: ['top cylinder2'],
  'voilet cylinder': ['violet cylinder'],
};

function normalizeMeshName(name) {
  return String(name || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance',
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function createChromeEnvMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.48, '#7fb7ff');
  grad.addColorStop(0.5, '#111118');
  grad.addColorStop(1, '#050508');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  
  const envTexture = new THREE.CanvasTexture(canvas);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;
  return envTexture;
}

const scene = new THREE.Scene();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
scene.environment = pmremGenerator.fromEquirectangular(createChromeEnvMap()).texture;

const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
camera.position.set(0, 1.18, 6.35);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const loader = new GLTFLoader();
const clock = new THREE.Clock();
const DEVICE_MODEL_URL = 'assets/models/authentication_device.glb';

const deviceRoot = new THREE.Group();
deviceRoot.name = 'doubthub-authentication-device-root';
const modelPivot = new THREE.Group();
modelPivot.name = 'authentication-device-centered-rotation-pivot';
deviceRoot.add(modelPivot);

deviceRoot.position.set(1.55, 2.82, 0);
// Y rotation shifted -1.57 (clockwise 90°) from original -0.42
deviceRoot.rotation.set(-0.05, 0, 0.03);
deviceRoot.scale.set(0.55, 0.55, 0.55);

scene.add(deviceRoot);

const lightTarget = new THREE.Object3D();
lightTarget.name = 'auth-device-light-target';

// Aim slightly toward the center/front of the model
lightTarget.position.set(
  deviceRoot.position.x,
  deviceRoot.position.y + 0.15,
  deviceRoot.position.z
);

scene.add(lightTarget);

const lights = {
  // soft base light so black model is never fully invisible
  ambient: new THREE.AmbientLight(0x1b2a66, 2.2),

  // natural upper sky light
  hemisphere: new THREE.HemisphereLight(0x7fb7ff, 0x080b22, 1.25),

  // main front light - this makes the model clearly visible
  key: new THREE.DirectionalLight(0xffffff, 3.8),

  // cyan light from left/front for sci-fi highlight
  cyan: new THREE.PointLight(0x24e5ff, 5.5, 10, 1.6),

  // magenta rim light from right/back
  magenta: new THREE.PointLight(0xff4dd8, 4.8, 9, 1.7),

  // warm gold light from lower front/right
  gold: new THREE.PointLight(0xffd166, 3.2, 7, 1.8),

  // small front fill light to reveal dark details
  frontFill: new THREE.PointLight(0xdbe8ff, 2.4, 6, 1.5),
};

// Main directional light position
lights.key.position.set(1.2, 4.8, 5.2);
lights.key.target = lightTarget;
lights.key.castShadow = true;

// Better light positions around your current model position
lights.cyan.position.set(
  deviceRoot.position.x - 2.4,
  deviceRoot.position.y + 1.6,
  deviceRoot.position.z + 3.2
);

lights.magenta.position.set(
  deviceRoot.position.x + 2.6,
  deviceRoot.position.y + 1.2,
  deviceRoot.position.z + 2.2
);

lights.gold.position.set(
  deviceRoot.position.x + 1.4,
  deviceRoot.position.y - 0.4,
  deviceRoot.position.z + 2.6
);

lights.frontFill.position.set(
  deviceRoot.position.x,
  deviceRoot.position.y + 0.2,
  deviceRoot.position.z + 4.2
);

// Add all lights to scene
Object.values(lights).forEach((light) => scene.add(light));

const state = {
  phase: 'loading',
  authMode: 'signin',
  authProvider: 'douthub',
  activeField: 'email',
  name: '',
  email: '',
  password: '',
  hovered: null,
  cameraZoom: 1,
  // Default rotation shifted -1.57 (clockwise 90°) from original -0.42
  targetRotationY: -3.2,
  currentRotationY: 10,
  targetRotationX: 4.8,
  currentRotationX: 0,
  targetRotationZ: 4,
  currentRotationZ: 0,
  assemblyStart: 0,
  assembledAt: 10,
};

window.authDeviceDebug = {
  phase: 'boot',
  meshCount: 0,
  mappedMeshes: [],
  canvas: null,
  modelBounds: null,
};

function setDeviceDataset(updates) {
  Object.entries(updates).forEach(([key, value]) => {
    document.documentElement.dataset[`authDevice${key}`] = String(value);
  });
}

const meshMap = new Map();
let mixer = null;
const clickableNames = new Set([
  MESH_NAMES.purpilButton,
  MESH_NAMES.purpilExit,
  MESH_NAMES.signIn,
  MESH_NAMES.signUp,
  MESH_NAMES.goldenExit,
  MESH_NAMES.google,
  MESH_NAMES.github,
  MESH_NAMES.douthub,
  MESH_NAMES.slideButton,
  MESH_NAMES.conformButton,
  MESH_NAMES.forgotPasswordArea,
  MESH_NAMES.violetButton,
  MESH_NAMES.voiletExit,
  MESH_NAMES.blueButton,
  MESH_NAMES.blueExit,
]);

const lcd = {
  purpil: createLcdTexture(),
  violet: createLcdTexture(),
  blue: createLcdTexture(),
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function cloneMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
  });
}

function forEachMaterial(mesh, callback) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    if (material) callback(material);
  });
}

function setOpacity(mesh, opacity) {
  mesh.traverse((child) => {
    if (!child.isMesh) return;
    forEachMaterial(child, (material) => {
      material.transparent = opacity < 0.985;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.65;
      material.needsUpdate = true;
    });
  });
}

function setEmissive(mesh, color, intensity) {
  mesh.traverse((child) => {
    if (!child.isMesh) return;
    forEachMaterial(child, (material) => {
      if (!material.emissive) return;
      material.emissive.set(color);
      material.emissiveIntensity = intensity;
      material.needsUpdate = true;
    });
  });
}

function createLcdTexture() {
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = 1024;
  canvasTexture.height = 512;
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas: canvasTexture, ctx: canvasTexture.getContext('2d'), texture };
}

function drawLcd(target, lines, { status = '', error = false, success = false } = {}) {
  const { canvas: screen, ctx, texture } = target;
  const width = screen.width;
  const height = screen.height;
  
  // Very dark background for LED look
  ctx.fillStyle = '#06080d';
  ctx.fillRect(0, 0, width, height);

  // Subtle LED matrix grid
  ctx.fillStyle = 'rgba(36, 229, 255, 0.04)';
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Neon glowing outer border
  ctx.strokeStyle = '#24e5ff';
  ctx.lineWidth = 6;
  ctx.shadowColor = '#24e5ff';
  ctx.shadowBlur = 18;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  
  // Inner subtle border
  ctx.strokeStyle = 'rgba(36, 229, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 0;
  ctx.strokeRect(26, 26, width - 52, height - 52);

  ctx.textBaseline = 'top';
  
  lines.forEach((line, index) => {
    // Alternate bright LED colors for different lines to mimic the reference
    const lineColors = ['#24e5ff', '#ff4dd8', '#ffd166', '#dbe8ff'];
    const lineGlows = ['#00aeff', '#ff00aa', '#ffaa00', '#ffffff'];
    
    let c = error ? '#ff4f7b' : success ? '#15f2c2' : lineColors[index % lineColors.length];
    let g = error ? '#ff0044' : success ? '#00ffaa' : lineGlows[index % lineGlows.length];
    
    ctx.fillStyle = c;
    ctx.shadowColor = g;
    ctx.shadowBlur = 22;
    
    const size = index === 0 ? 56 : 64;
    // Digital italic monospace look
    ctx.font = `italic 700 ${size}px "Courier New", monospace`;
    ctx.fillText(String(line).toUpperCase(), 60, 60 + index * 85);
    
    // Draw white core to intensify the LED center
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(line).toUpperCase(), 60, 60 + index * 85);
  });

  if (status) {
    ctx.fillStyle = '#ff4dd8';
    ctx.shadowColor = '#ff4dd8';
    ctx.shadowBlur = 15;
    ctx.font = 'italic 700 38px "Courier New", monospace';
    ctx.fillText(String(status).toUpperCase(), 60, height - 80);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(status).toUpperCase(), 60, height - 80);
  }

  texture.needsUpdate = true;
}

function makeLabelTexture(text, colors = {}) {
  const label = document.createElement('canvas');
  label.width = 512;
  label.height = 192;
  const ctx = label.getContext('2d');
  ctx.fillStyle = colors.bg || '#000000';
  ctx.fillRect(0, 0, label.width, label.height);
  
  ctx.font = '800 64px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colors.fg || '#ffffff';
  ctx.shadowColor = colors.glow || 'rgba(255, 255, 255, 0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText(text.toUpperCase(), label.width / 2, label.height / 2);
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function applyTexture(mesh, texture, emissive = 0.25) {
  if (!mesh) return;
  mesh.traverse((child) => {
    if (!child.isMesh) return;
    forEachMaterial(child, (material) => {
      // Do not overwrite base color with the map if it's highly metallic (steel buttons)
      if (material.metalness >= 0.9) {
        material.map = null;
      } else {
        material.map = texture;
      }
      if (material.emissive) {
        material.emissiveMap = texture;
        material.emissive.set(0xffffff);
        material.emissiveIntensity = emissive;
      }
      material.needsUpdate = true;
    });
  });
}

function findNamedMesh(root, name) {
  let found = null;
  const normalizedTarget = normalizeMeshName(name);
  const aliases = (MESH_NAME_ALIASES[name] || []).map(normalizeMeshName);
  root.traverse((child) => {
    if (found || !child.isMesh) return;
    const normalizedChild = normalizeMeshName(child.name);
    if (normalizedChild === normalizedTarget || aliases.includes(normalizedChild)) found = child;
  });
  return found;
}

function fitModelToView(root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  root.position.sub(center);
  const maxAxis = Math.max(size.x, size.y, size.z);
  root.scale.setScalar(2.85 / Math.max(maxAxis, 0.001));
  root.position.y += 0.34;
}

function prepareMesh(root) {
  cloneMaterials(root);
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.userData.originalScale = child.scale.clone();
    forEachMaterial(child, (material) => {
      material.envMapIntensity = 0.8;
      if (material.emissive) {
        material.userData.baseEmissive = material.emissive.clone();
        material.userData.baseEmissiveIntensity = material.emissiveIntensity || 0;
      }
      material.needsUpdate = true;
    });
  });
}

function mapMeshes(root) {
  Object.values(MESH_NAMES).forEach((name) => {
    const mesh = findNamedMesh(root, name);
    if (mesh) {
      meshMap.set(name, mesh);
      if (normalizeMeshName(mesh.name) !== normalizeMeshName(name)) {
        console.info(`Mapped mesh alias: ${name} -> ${mesh.name}`);
      }
    } else {
      console.warn(`Missing mesh: ${name}`);
    }
  });

  // Fix missing or broken UV mapping on the large screens so textures render correctly
  [MESH_NAMES.purpilScreen, MESH_NAMES.violetScreen, MESH_NAMES.blueScreen].forEach((name) => {
    const mesh = meshMap.get(name);
    if (mesh && mesh.geometry) {
      mesh.geometry.computeBoundingBox();
      const bbox = mesh.geometry.boundingBox;
      const size = new THREE.Vector3();
      bbox.getSize(size);
      
      const posAttribute = mesh.geometry.attributes.position;
      const uvArray = new Float32Array(posAttribute.count * 2);
      
      for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const z = posAttribute.getZ(i);
        
        let u = 0, v = 0;
        // Project onto the two largest axes
        if (size.x < size.y && size.x < size.z) {
          u = (z - bbox.min.z) / size.z;
          v = (y - bbox.min.y) / size.y;
        } else if (size.y < size.x && size.y < size.z) {
          u = (x - bbox.min.x) / size.x;
          v = (z - bbox.min.z) / size.z;
        } else {
          u = (x - bbox.min.x) / size.x;
          v = (y - bbox.min.y) / size.y;
        }
        
        uvArray[i * 2] = u;
        uvArray[i * 2 + 1] = v; // Invert V if necessary, try standard first
      }
      
      mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
      mesh.geometry.attributes.uv.needsUpdate = true;
    }
  });

  // The 3D model has a scaling bug where the purple and violet screens are actually physically buried 
  // INSIDE the device shell (the cubes are thicker than the screens). 
  // We need to physically pop them out along their local X axis so they are visible!
  const pScreen = meshMap.get(MESH_NAMES.purpilScreen);
  if (pScreen) pScreen.translateX(0.18);

  const vScreen = meshMap.get(MESH_NAMES.violetScreen);
  if (vScreen) vScreen.translateX(0.18);

  // Set requested buttons and exits to a polished shiny steel material
  [
    MESH_NAMES.purpilButton,
    MESH_NAMES.blueButton,
    MESH_NAMES.violetButton,
    MESH_NAMES.purpilExit,
    MESH_NAMES.blueExit,
    MESH_NAMES.voiletExit,
    MESH_NAMES.conformButton
  ].forEach(name => {
    const mesh = meshMap.get(name);
    if (!mesh) return;
    mesh.traverse(child => {
      if (!child.isMesh) return;
      forEachMaterial(child, mat => {
        if (mat.color) mat.color.set(0xeeeeee);
        mat.metalness = 1.0;
        mat.roughness = 0.05;
        mat.map = null;
        mat.emissiveMap = null;
        if (mat.emissive) mat.emissive.set(0x000000);
        mat.needsUpdate = true;
      });
    });
  });
}

function onBlenderAnimationFinished() {
  state.phase = 'assembled';
  state.assembledAt = performance.now();
  updatePurpilScreen();
  updateVioletScreen();
  updateBlueScreen();
  updateLabels();
  document.body.classList.add('auth-device-ready');
  console.info('Blender animation finished — device assembled.');
}

function updatePurpilScreen() {
  drawLcd(lcd.purpil, ['DOUBTHUB', 'WELCOME', 'CONTINUE PROCESS'], { status: 'SYSTEM READY' });
}

function getMaskedPassword() {
  return state.password ? '*'.repeat(Math.min(12, state.password.length)) : '';
}

function updateVioletScreen(message = '') {
  if (message) {
    drawLcd(lcd.violet, [message], { success: !message.startsWith('ERROR'), error: message.startsWith('ERROR') });
    return;
  }

  if (state.authProvider === 'google' || state.authProvider === 'github') {
    drawLcd(lcd.violet, [
      `METHOD: ${state.authProvider}`,
      `CONTINUE WITH ${state.authProvider}`,
    ], { status: 'CONFIRM METHOD' });
    return;
  }

  const lines = state.authMode === 'signup'
    ? ['CREATE ACCOUNT', `NAME: ${state.name || '_'}`, `EMAIL: ${state.email || '_'}`, `PASS: ${getMaskedPassword() || '_'}`]
    : ['SIGN IN', `EMAIL: ${state.email || '_'}`, `PASS: ${getMaskedPassword() || '_'}`, 'METHOD: DOUBTHUB'];
  drawLcd(lcd.violet, lines, { status: `FIELD: ${state.activeField}` });
}

function updateBlueScreen() {
  const displayName = state.name || state.email.split('@')[0] || 'USER';
  drawLcd(lcd.blue, ['ACCESS GRANTED', 'WELCOME', displayName], { status: 'ENTER DOUBTHUB', success: true });
}

function updateLabels() {
  // Steel buttons no longer receive text labels, they are pure polished steel.
  applyTexture(meshMap.get(MESH_NAMES.slideButton), makeLabelTexture('VERIFY IDENTITY'), 0.32);
  applyTexture(meshMap.get(MESH_NAMES.signIn), makeLabelTexture('SIGN IN', { bg: '#2d210c', fg: '#ffe6a6', glow: '#ffd166' }), 0.38);
  applyTexture(meshMap.get(MESH_NAMES.signUp), makeLabelTexture('SIGN UP', { bg: '#2d210c', fg: '#ffe6a6', glow: '#ffd166' }), 0.38);
  applyTexture(meshMap.get(MESH_NAMES.google), makeLabelTexture('Google'));
  applyTexture(meshMap.get(MESH_NAMES.github), makeLabelTexture('GitHub'));
  applyTexture(meshMap.get(MESH_NAMES.douthub), makeLabelTexture('DoubtHub'));
  applyTexture(meshMap.get(MESH_NAMES.forgotPasswordArea), makeLabelTexture('FORGOT PASSWORD', { bg: '#101019', fg: '#bffaff' }), 0.28);
}

function updateVioletButtonLabel() {
  // Violet button is now pure steel, no label updates needed
}

function setScreenTextures() {
  // Prevent specular lighting glares from washing out the LCD screens
  [MESH_NAMES.purpilScreen, MESH_NAMES.violetScreen, MESH_NAMES.blueScreen].forEach((name) => {
    const mesh = meshMap.get(name);
    if (!mesh) return;
    mesh.traverse((child) => {
      if (!child.isMesh) return;
      forEachMaterial(child, (mat) => {
        if (mat.color) mat.color.set(0x000000);
        mat.roughness = 0.9;
        mat.metalness = 0.1;
      });
    });
  });

  applyTexture(meshMap.get(MESH_NAMES.purpilScreen), lcd.purpil.texture, 1.4);
  applyTexture(meshMap.get(MESH_NAMES.violetScreen), lcd.violet.texture, 1.4);
  applyTexture(meshMap.get(MESH_NAMES.blueScreen), lcd.blue.texture, 1.4);
}

function transitionTo(nextPhase) {
  if (state.phase === nextPhase) return;
  
  document.body.classList.toggle('auth-device-focused', nextPhase !== 'assembled');
  applyPhase(nextPhase);
}

function applyPhase(nextPhase) {
  state.phase = nextPhase;
  // All rotation values shifted -1.57 (clockwise 90°) from original
  const rotationsY = {
    assembled: 0,  
    purple: -1.39,  
    golden: 0.01,  
    violet: -2.93,  
    blue: 1.53,  
  };
  const rotationsX = {
    assembled: 0, 
    purple: 0,
    golden: 0,
    violet: 0,
    blue: 0,
  };
  const rotationsZ = {
    assembled: 0, 
    purple: 0,
    golden: 0,
    violet: 0,
    blue: 0,
  };
  state.targetRotationY = rotationsY[nextPhase] ?? state.targetRotationY;
  state.targetRotationX = rotationsX[nextPhase] ?? state.targetRotationX;
  state.targetRotationZ = rotationsZ[nextPhase] ?? state.targetRotationZ;
  state.cameraZoom = nextPhase === 'assembled' ? 0 : 1;
}

function selectProvider(provider) {
  state.authProvider = provider;
  state.activeField = provider === 'douthub' ? (state.authMode === 'signup' ? 'name' : 'email') : 'email';
  updateVioletScreen();
  updateVioletButtonLabel();
  moveSlideButton(provider);
}

function moveSlideButton(provider) {
  const slide = meshMap.get(MESH_NAMES.slideButton);
  const target = meshMap.get(provider === 'google' ? MESH_NAMES.google : provider === 'github' ? MESH_NAMES.github : MESH_NAMES.douthub);
  if (!slide || !target) return;
  const parent = slide.parent;
  const world = new THREE.Vector3();
  target.getWorldPosition(world);
  const local = parent.worldToLocal(world);
  slide.position.x = local.x;
}

function press(mesh) {
  if (!mesh) return;
  const basePos = mesh.userData.originalPosition || mesh.position.clone();
  if (!mesh.userData.originalPosition) mesh.userData.originalPosition = basePos.clone();
  
  // Push effect: mechanically depress into the device slightly
  mesh.translateZ(-0.04);
  
  window.setTimeout(() => {
    // Spring back to original position
    mesh.position.copy(basePos);
  }, 150);
}

function validateAndContinue() {
  if (state.authProvider !== 'douthub') {
    updateVioletScreen('CONNECTING...');
    window.setTimeout(() => {
      updateBlueScreen();
      transitionTo('blue');
    }, 850);
    return;
  }

  if (state.authMode === 'signup' && !state.name.trim()) {
    updateVioletScreen('ERROR: ENTER NAME');
    window.setTimeout(() => updateVioletScreen(), 1400);
    return;
  }
  if (!state.email.trim()) {
    updateVioletScreen('ERROR: ENTER EMAIL');
    window.setTimeout(() => updateVioletScreen(), 1400);
    return;
  }
  if (!state.password.trim()) {
    updateVioletScreen('ERROR: ENTER PASSWORD');
    window.setTimeout(() => updateVioletScreen(), 1400);
    return;
  }

  updateVioletScreen('ACCESS CHECK...');
  window.setTimeout(() => {
    updateBlueScreen();
    transitionTo('blue');
  }, 800);
}

function handleClick(mesh) {
  const name = mesh?.name;
  if (!name && state.phase !== 'assembled') return;
  
  const target = state.phase === 'assembled' ? modelPivot : mesh;
  press(target);

  if (state.phase === 'assembled') {
    transitionTo('purple');
    return;
  }

  if (state.phase === 'purple') {
    if (name === MESH_NAMES.purpilButton) transitionTo('golden');
    if (name === MESH_NAMES.purpilExit) transitionTo('assembled');
    return;
  }

  if (state.phase === 'golden') {
    if (name === MESH_NAMES.signIn || name === MESH_NAMES.signUp) {
      state.authMode = name === MESH_NAMES.signUp ? 'signup' : 'signin';
      selectProvider('douthub');
      updateVioletScreen();
      transitionTo('violet');
    }
    if (name === MESH_NAMES.goldenExit) transitionTo('purple');
    return;
  }

  if (state.phase === 'violet') {
    if (name === MESH_NAMES.google) selectProvider('google');
    if (name === MESH_NAMES.github) selectProvider('github');
    if (name === MESH_NAMES.douthub) selectProvider('douthub');
    if (name === MESH_NAMES.conformButton) updateVioletScreen();
    if (name === MESH_NAMES.forgotPasswordArea && state.authMode === 'signin') {
      updateVioletScreen('RESET LINK SENT');
      window.setTimeout(() => updateVioletScreen(), 2000);
    }
    if (name === MESH_NAMES.violetButton) validateAndContinue();
    if (name === MESH_NAMES.voiletExit) transitionTo('golden');
    if (name === MESH_NAMES.violetScreen) cycleField();
    return;
  }

  if (state.phase === 'blue') {
    if (name === MESH_NAMES.blueButton) window.location.href = 'index.html';
    if (name === MESH_NAMES.blueExit) transitionTo('violet');
  }
}

function cycleField() {
  if (state.authProvider !== 'douthub') return;
  const fields = state.authMode === 'signup' ? ['name', 'email', 'password'] : ['email', 'password'];
  const index = fields.indexOf(state.activeField);
  state.activeField = fields[(index + 1) % fields.length];
  updateVioletScreen();
}

function handleTyping(event) {
  if (state.phase !== 'violet' || state.authProvider !== 'douthub') return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Tab') {
    event.preventDefault();
    cycleField();
    return;
  }
  if (event.key === 'Backspace') {
    event.preventDefault();
    state[state.activeField] = state[state.activeField].slice(0, -1);
    updateVioletScreen();
    return;
  }
  if (event.key === 'Enter') {
    validateAndContinue();
    return;
  }
  if (event.key.length === 1) {
    event.preventDefault();
    state[state.activeField] = `${state[state.activeField]}${event.key}`.slice(0, 32);
    updateVioletScreen();
  }
}

function getIntersections(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects([...meshMap.values()], true);
}

function getRootNamedMesh(object) {
  let current = object;
  while (current && current !== deviceRoot) {
    if (meshMap.has(current.name)) return current;
    current = current.parent;
  }
  return object;
}

function updateHover(mesh) {
  const target = (mesh && state.phase === 'assembled') ? modelPivot : mesh;

  if (state.hovered === target) return;
  if (state.hovered) {
    const base = state.hovered.userData.originalScale;
    if (base) state.hovered.scale.copy(base);
    setEmissive(state.hovered, '#000000', 0);
  }
  state.hovered = target;
  if (target) {
    const base = target.userData.originalScale || target.scale.clone();
    target.userData.originalScale = base.clone();
    // Slightly different glow/scale effect for interaction
    target.scale.copy(base).multiplyScalar(1.03);
    setEmissive(target, '#ffffff', state.phase === 'assembled' ? 0.1 : 0.25);
  }
  canvas.style.cursor = target ? 'pointer' : 'default';
}

function canClick(name) {
  if (state.phase === 'assembled') return true;
  if (!clickableNames.has(name)) return false;
  if (state.phase === 'purple') return [MESH_NAMES.purpilButton, MESH_NAMES.purpilExit].includes(name);
  if (state.phase === 'golden') return [MESH_NAMES.signIn, MESH_NAMES.signUp, MESH_NAMES.goldenExit].includes(name);
  if (state.phase === 'violet') return [
    MESH_NAMES.google,
    MESH_NAMES.github,
    MESH_NAMES.douthub,
    MESH_NAMES.conformButton,
    MESH_NAMES.forgotPasswordArea,
    MESH_NAMES.violetButton,
    MESH_NAMES.voiletExit,
  ].includes(name);
  if (state.phase === 'blue') return [MESH_NAMES.blueButton, MESH_NAMES.blueExit].includes(name);
  return false;
}

function onPointerMove(event) {
  const hit = getIntersections(event).map((item) => getRootNamedMesh(item.object)).find((mesh) => canClick(mesh.name));
  updateHover(hit || null);
}

function onPointerDown(event) {
  const hit = getIntersections(event).map((item) => getRootNamedMesh(item.object)).find((mesh) => canClick(mesh.name));
  if (hit) handleClick(hit);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  window.authDeviceDebug.canvas = {
    width,
    height,
    left: rect.left,
    top: rect.top,
  };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

async function loadDevice() {
  window.authDevicePhase = 'loading-model';
  window.authDeviceDebug.phase = 'loading-model';
  setDeviceDataset({ Phase: 'loading-model' });
  const gltf = await loader.loadAsync(DEVICE_MODEL_URL);
  const model = gltf.scene;
  window.authDeviceDebug.meshCount = 0;
  model.traverse((child) => {
    if (!child.isMesh) return;
    window.authDeviceDebug.meshCount += 1;
    console.log('GLB mesh:', child.name);
  });

  setDeviceDataset({ Source: DEVICE_MODEL_URL });

  prepareMesh(model);
  fitModelToView(model);
  model.rotation.x = -Math.PI / 2;
  model.updateMatrixWorld(true);
  const modelBounds = new THREE.Box3().setFromObject(model);
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const modelCenter = modelBounds.getCenter(new THREE.Vector3());
  window.authDeviceDebug.modelBounds = {
    center: modelCenter.toArray(),
    size: modelSize.toArray(),
    scale: model.scale.x,
  };
  mapMeshes(model);
  window.authDeviceDebug.mappedMeshes = [...meshMap.keys()];
  setDeviceDataset({
    MeshCount: window.authDeviceDebug.meshCount,
    MappedCount: meshMap.size,
    Bounds: `${modelSize.x.toFixed(3)},${modelSize.y.toFixed(3)},${modelSize.z.toFixed(3)}`,
    Center: `${modelCenter.x.toFixed(3)},${modelCenter.y.toFixed(3)},${modelCenter.z.toFixed(3)}`,
    Scale: model.scale.x.toFixed(5),
  });

  // Center the model in the pivot so it rotates in-place instead of rounding a path
  modelPivot.position.copy(modelCenter);
  model.position.sub(modelCenter);

  modelPivot.add(model);
  setScreenTextures();

  // --- Play Blender-exported animation via AnimationMixer ---
  console.log('GLB animations:', gltf.animations.map((a) => a.name));

  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);

    console.info(`Playing ${gltf.animations.length} Blender animation clips simultaneously...`);

    let maxDuration = 0;
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.play();
      if (clip.duration > maxDuration) {
        maxDuration = clip.duration;
      }
    });

    mixer.addEventListener('finished', (e) => {
      // Only trigger finished when the longest animation finishes
      if (e.action.getClip().duration >= maxDuration - 0.01) {
        onBlenderAnimationFinished();
      }
    });

    state.phase = 'landingAnimationPlaying';
    
    // Safety fallback: if the animation fails to fire 'finished', force unlock after its duration
    window.setTimeout(() => {
      if (state.phase === 'landingAnimationPlaying') {
        console.warn('Animation finished event did not fire. Forcing state to assembled.');
        onBlenderAnimationFinished();
      }
    }, (maxDuration * 1000) + 1000);
  } else {
    console.warn('No Blender animation clips found in GLB — skipping to assembled state.');
    onBlenderAnimationFinished();
  }

  window.authDevicePhase = 'device-ready';
  window.authDeviceDebug.phase = 'device-ready';
  setDeviceDataset({ Phase: 'device-ready' });
}

function animate() {
  const now = performance.now();
  // Cap delta time to prevent animations from instantly finishing if there's a load pause
  const dt = Math.min(clock.getDelta(), 0.1);

  // Update Blender animation mixer (plays exported exploding/assembly animation)
  if (mixer) mixer.update(dt);

  // After assembly: static model with gentle vertical float only (no rotation)
  if (state.phase === 'assembled') {
    const idle = (now - state.assembledAt) * 0.001;
    deviceRoot.position.y = 2.82 + Math.sin(idle * 1.8) * 0.045;
  }

  const goldenRing = meshMap.get(MESH_NAMES.goldenRing);
  if (goldenRing) goldenRing.rotation.z += dt * 1.25;

  // Only interpolate rotation when NOT playing the Blender animation
  if (state.phase !== 'landingAnimationPlaying') {
    state.currentRotationY += (state.targetRotationY - state.currentRotationY) * 0.075;
    state.currentRotationX += (state.targetRotationX - state.currentRotationX) * 0.075;
    state.currentRotationZ += (state.targetRotationZ - state.currentRotationZ) * 0.075;
    modelPivot.rotation.y = state.currentRotationY;
    modelPivot.rotation.x = state.currentRotationX;
    modelPivot.rotation.z = state.currentRotationZ;
  }

  const targetCameraZ = state.cameraZoom ? 4.45 : 6.35;
  camera.position.z += (targetCameraZ - camera.position.z) * 0.06;
  camera.lookAt(0, 0.7, 0);

  // ---------- Dynamic light follow system ----------

  // Keep light target locked to the model center
  lightTarget.position.set(
    deviceRoot.position.x,
    deviceRoot.position.y + 0.15,
    deviceRoot.position.z
  );

  // Make lights softly follow the floating model
  lights.cyan.position.y = deviceRoot.position.y + 1.6;
  lights.magenta.position.y = deviceRoot.position.y + 1.2;
  lights.gold.position.y = deviceRoot.position.y - 0.4;
  lights.frontFill.position.y = deviceRoot.position.y + 0.2;

  // Subtle animated sci-fi light movement
  const lightTime = performance.now() * 0.001;

  lights.cyan.position.x = deviceRoot.position.x - 2.4 + Math.sin(lightTime * 0.8) * 0.25;
  lights.magenta.position.x = deviceRoot.position.x + 2.6 + Math.cos(lightTime * 0.7) * 0.25;
  lights.gold.intensity = 3.0 + Math.sin(lightTime * 1.4) * 0.25;
  lights.frontFill.intensity = 2.3 + Math.sin(lightTime * 1.1) * 0.18;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerdown', onPointerDown);
window.addEventListener('keydown', handleTyping);
window.addEventListener('resize', resize);

document.getElementById('auth-hero-login')?.addEventListener('click', () => {
  if (state.phase === 'assembled') transitionTo('purple');
});
document.getElementById('auth-focus-login')?.addEventListener('click', () => {
  if (state.phase === 'assembled') transitionTo('purple');
});
document.getElementById('auth-hero-signup')?.addEventListener('click', () => {
  state.authMode = 'signup';
  if (state.phase === 'assembled') transitionTo('purple');
});
document.getElementById('auth-focus-signup')?.addEventListener('click', () => {
  state.authMode = 'signup';
  if (state.phase === 'assembled') transitionTo('purple');
});

resize();
loadDevice().catch((error) => {
  window.authDeviceError = error?.message || String(error);
  setDeviceDataset({ Phase: 'error', Error: window.authDeviceError });
  document.body.classList.add('auth-device-error');
  console.error('Unable to load authentication device:', error);
});
requestAnimationFrame(animate);