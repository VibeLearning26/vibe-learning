import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.authDeviceModuleStarted = 'module-started';

const canvas = document.getElementById('auth-device-canvas');

if (!canvas) {
  throw new Error('Missing auth device canvas.');
}

const mobile3d = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

const SUPABASE_URL = 'https://fgdmxuslojnbyzeaweyd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T0xMYGMk2MyqEeGw_3QPeg_jr2YfCJR';
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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
  antialias: !mobile3d,
  powerPreference: 'high-performance',
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = !mobile3d;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function createChromeEnvMap() {
  const canvas = document.createElement('canvas');
  canvas.width = mobile3d ? 256 : 512;
  canvas.height = mobile3d ? 256 : 512;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.48, '#7fb7ff');
  grad.addColorStop(0.5, '#111118');
  grad.addColorStop(1, '#050508');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const envTexture = new THREE.CanvasTexture(canvas);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;
  return envTexture;
}

const scene = new THREE.Scene();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
scene.environment = pmremGenerator.fromEquirectangular(createChromeEnvMap()).texture;

const camera = new THREE.PerspectiveCamera(mobile3d ? 48 : 34, 1, 0.05, 80);
camera.position.set(0, 1.18, mobile3d ? 7.25 : 6.35);

// Camera framing: default landing view vs. focused close-up on the device side.
// The focused position sits on the line from the default camera toward the device,
// with the same look direction, so the model stays anchored above the galaxy
// and only appears larger — it never shifts on screen.
const CAMERA_VIEWS = {
  default: {
    position: new THREE.Vector3(0, 1.18, 6.35),
    lookAt: new THREE.Vector3(0, 0.7, 0),
  },
  focused: {
    position: new THREE.Vector3(0.78, 2.0, 3.18),
    lookAt: new THREE.Vector3(0, 0.7, 0),
  },
};
const cameraLookAt = CAMERA_VIEWS.default.lookAt.clone();
const cameraLookTarget = new THREE.Vector3();
let cameraEase = 0.3;
const cameraPositionTarget = mobile3d
  ? new THREE.Vector3(0, 1.18, 7.25)
  : CAMERA_VIEWS.default.position.clone();
const deviceBaseTargetPosition = new THREE.Vector3(mobile3d ? 0.35 : 1.55, mobile3d ? 2.64 : 2.82, 0);
let deviceScaleTarget = mobile3d ? 0.506 : 0.55;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const loader = new GLTFLoader();
const clock = new THREE.Clock();
const DEVICE_MODEL_URL = 'assets/models/authentication_device.glb';
let modelRotationEase = 0.3;

const deviceRoot = new THREE.Group();
deviceRoot.name = 'doubthub-authentication-device-root';
const modelPivot = new THREE.Group();
modelPivot.name = 'authentication-device-centered-rotation-pivot';
deviceRoot.add(modelPivot);

const deviceBasePosition = new THREE.Vector3(mobile3d ? 0.35 : 1.55, mobile3d ? 2.64 : 2.82, 0);
deviceRoot.position.copy(deviceBasePosition);
// Y rotation shifted -1.57 (clockwise 90°) from original -0.42
deviceRoot.rotation.set(-0.05, 0, 0.03);
deviceRoot.scale.setScalar(mobile3d ? 0.506 : 0.55);

cameraPositionTarget.set(0, 1.18, mobile3d ? 7.25 : 6.35);
cameraLookTarget.set(0, 0.7, 0);
deviceBaseTargetPosition.copy(deviceBasePosition);
deviceScaleTarget = mobile3d ? 0.506 : 0.55;

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
  // Low neutral base preserves texture contrast without flattening the metal.
  ambient: new THREE.AmbientLight(0x17234a, 1.15),

  // Cool sky and deep violet ground provide soft environmental separation.
  hemisphere: new THREE.HemisphereLight(0x6fa8ff, 0x12051f, 0.75),

  // Soft blue-white key reveals form without creating a white hotspot.
  key: new THREE.DirectionalLight(0xa9c7ff, 1.05),

  // RGB triangle: cyan left, magenta right, blue rear.
  cyan: new THREE.PointLight(0x20e6ff, 3.1, 9, 1.8),

  magenta: new THREE.PointLight(0xff3fbf, 2.8, 9, 1.8),

  blue: new THREE.PointLight(0x4169ff, 2.5, 8, 1.9),

  // Warm accent keeps the golden side distinct from the cool RGB lighting.
  gold: new THREE.PointLight(0xffbd45, 1.35, 6, 2),
};

// Main directional light position
lights.key.position.set(0.8, 4.2, 4.8);
lights.key.target = lightTarget;
lights.key.castShadow = true;

// Better light positions around your current model position
lights.cyan.position.set(
  deviceRoot.position.x - 2.5,
  deviceRoot.position.y + 1.25,
  deviceRoot.position.z + 2.2
);

lights.magenta.position.set(
  deviceRoot.position.x + 2.5,
  deviceRoot.position.y + 0.9,
  deviceRoot.position.z + 1.5
);

lights.blue.position.set(
  deviceRoot.position.x,
  deviceRoot.position.y + 1.7,
  deviceRoot.position.z - 2.4
);

lights.gold.position.set(
  deviceRoot.position.x + 1.2,
  deviceRoot.position.y - 0.55,
  deviceRoot.position.z + 1.8
);

// Add all lights to scene
Object.values(lights).forEach((light) => scene.add(light));

const state = {
  phase: 'loading',
  previousPhase: null,
  isTransitioning: false,
  authMode: 'signin',
  authProvider: 'douthub',
  activeField: 'email',
  name: '',
  email: '',
  password: '',
  hovered: null,
  hoverStartedAt: 0,
  slideDragging: false,
  slideDragPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  slideDragOffset: new THREE.Vector3(),
  slideProviderTargets: new Map(),
  cameraZoom: 1,
  targetRotationY: -0.08,
  currentRotationY: -0.08,
  targetRotationX: 1.75,
  currentRotationX: 1.75,
  targetRotationZ: 0.62,
  currentRotationZ: 0.62,
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
  MESH_NAMES.violetScreen,
  MESH_NAMES.violetButton,
  MESH_NAMES.voiletExit,
  MESH_NAMES.blueButton,
  MESH_NAMES.blueExit,
]);

const screenAlignedButtonLabels = new Set([
  MESH_NAMES.signIn,
  MESH_NAMES.signUp,
]);

const PHASE_SETTINGS = {
  assembled: {
    rotation: { x: 1.75, y: -0.08, z: 0.62 },
    camera: {
      position: { x: 0, y: 1.18, z: 6.35 },
      lookAt: { x: 0, y: 0.7, z: 0 },
    },
    deviceRoot: {
      basePosition: { x: 1.55, y: 2.82, z: 0 },
      scale: 0.55,
    },
    easing: { rotation: 0.3, camera: 0.3 },
  },
  purple: {
    rotation: { x: 1.28, y: 0.05, z: 1.33 },
    camera: {
      position: { x: 0.78, y: 2, z: 3.18 },
      lookAt: { x: 0, y: 0.7, z: 0 },
    },
    deviceRoot: {
      basePosition: { x: 2.05, y: 2.76, z: 0 },
      scale: 0.65,
    },
    easing: { rotation: 0.3, camera: 0.3 },
  },
  golden: {
    rotation: { x: 1.28, y: 0.05, z: 2.86 },
    camera: {
      position: { x: 0.78, y: 2, z: 3.18 },
      lookAt: { x: 0, y: 0.7, z: 0 },
    },
    deviceRoot: {
      basePosition: { x: 2.05, y: 2.76, z: 0 },
      scale: 0.65,
    },
    easing: { rotation: 0.3, camera: 0.3 },
  },
  violet: {
    rotation: { x: -1.83, y: -3.18, z: 1.35 },
    camera: {
      position: { x: 0.78, y: 2, z: 3.18 },
      lookAt: { x: 0, y: 0.7, z: 0 },
    },
    deviceRoot: {
      basePosition: { x: 2.05, y: 2.76, z: 0 },
      scale: 0.65,
    },
    easing: { rotation: 0.3, camera: 0.3 },
  },
  blue: {
    rotation: { x: 1.26, y: 0.04, z: -0.26 },
    camera: {
      position: { x: 0.78, y: 2, z: 3.18 },
      lookAt: { x: 0, y: 0.7, z: 0 },
    },
    deviceRoot: {
      basePosition: { x: 2.05, y: 2.76, z: 0 },
      scale: 0.65,
    },
    easing: { rotation: 0.3, camera: 0.3 },
  },
};

const lcd = {
  purpil: createLcdTexture('purpilScreen'),
  violet: createLcdTexture('violetScreen'),
  blue: createLcdTexture('blueScreen'),
};

const TEXT_LAYOUTS = {
  purpilScreen: { x: 58, y: 58, statusX: 57, statusY: 395, size: 85, secondarySize: 42, lineGap: 72, align: 'left', color: '#eaffff', glow: '#24e5ff', fontWeight: 700, statusSize: 49, rotation: 0, mirrorX: false, mirrorY: false, fixedText: 'Welcome to doubthub!', fixedStatus: '' },
  violetScreen: { x: 58, y: 58, statusX: 58, statusY: 434, size: 70, secondarySize: 70, lineGap: 116, align: 'left', color: '#eaffff', glow: '#24e5ff', fontWeight: 700, statusSize: 19, rotation: 0, mirrorX: false, mirrorY: false, fixedText: 'email : |password :|name : ', fixedStatus: '' },
  blueScreen: { x: 58, y: 58, statusX: 58, statusY: 434, size: 72, secondarySize: 86, lineGap: 74, align: 'left', color: '#d7fff5', glow: '#15f2c2', fontWeight: 700, statusSize: 34, rotation: 0, mirrorX: false, mirrorY: false, fixedText: 'Welcome', fixedStatus: '' },
  purpilButton: { x: 256, y: 96, size: 58, align: 'center', color: '#dffbff', glow: '#24e5ff', fontWeight: 700 },
  signIn: { x: 256, y: 96, size: 76, secondarySize: 76, statusX: 256, statusY: 0, statusSize: 34, lineGap: 72, align: 'center', color: '#ffffff', glow: '#ffd166', fontWeight: 800, rotation: 0, mirrorX: false, mirrorY: false, fixedText: '', fixedStatus: '' },
  signUp: { x: 256, y: 96, size: 76, secondarySize: 76, statusX: 256, statusY: 0, statusSize: 34, lineGap: 72, align: 'center', color: '#ffffff', glow: '#ffd166', fontWeight: 800, rotation: 0, mirrorX: false, mirrorY: false, fixedText: '', fixedStatus: '' },
  google: { x: 256, y: 96, size: 48, align: 'center', color: '#ffffff', glow: '#24e5ff', fontWeight: 700 },
  github: { x: 256, y: 96, size: 48, align: 'center', color: '#ffffff', glow: '#bffaff', fontWeight: 700 },
  douthub: { x: 256, y: 96, size: 48, align: 'center', color: '#ffffff', glow: '#ff4dd8', fontWeight: 700 },
  slideButton: { x: 256, y: 96, size: 48, align: 'center', color: '#dffbff', glow: '#24e5ff', fontWeight: 700 },
  conformButton: { x: 256, y: 96, size: 48, align: 'center', color: '#dffbff', glow: '#24e5ff', fontWeight: 700 },
  forgotPasswordArea: { x: 256, y: 96, size: 42, align: 'center', color: '#bffaff', glow: '#24e5ff', fontWeight: 700 },
  violetButton: { x: 256, y: 96, size: 58, align: 'center', color: '#ffffff', glow: '#ff4dd8', fontWeight: 700 },
  blueButton: { x: 256, y: 96, size: 58, align: 'center', color: '#d7fff5', glow: '#15f2c2', fontWeight: 700 },
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

function createLcdTexture(layoutKey = 'purpilScreen') {
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = 1024;
  canvasTexture.height = 512;
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas: canvasTexture, ctx: canvasTexture.getContext('2d'), texture, layoutKey };
}

function getMachineFont(size, weight = 700) {
  const safeSize = Math.max(1, Number(size) || 48);
  const safeWeight = THREE.MathUtils.clamp(Number(weight) || 700, 100, 1000);
  return `${safeWeight} ${safeSize}px "OCR A Std", "Share Tech Mono", "Consolas", "Courier New", monospace`;
}

function getTextLayout(key) {
  return TEXT_LAYOUTS[key] || TEXT_LAYOUTS.purpilScreen;
}

function parseFixedText(value) {
  return String(value || '')
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean);
}

function drawLayoutText(ctx, text, x, y, width, height, layout) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(THREE.MathUtils.degToRad(layout.rotation || 0));
  ctx.scale(layout.mirrorX ? -1 : 1, layout.mirrorY ? -1 : 1);
  ctx.fillText(text, x - width / 2, y - height / 2);
  ctx.restore();
}

function drawLcd(target, lines, { status = '', error = false, success = false, preserveCase = false, instant = false } = {}) {
  target.lines = lines.map((line) => {
    const value = String(line);
    return preserveCase ? value : value.toUpperCase();
  });
  target.status = preserveCase ? String(status || '') : String(status || '').toUpperCase();
  target.error = error;
  target.success = success;
  target.useRuntimeLines = false;
  target.instantText = instant;
  target.startedAt = performance.now();
  renderLcd(target);
}

function drawInteractiveLcd(target, lines, options = {}) {
  target.lines = lines.map((line) => String(line));
  target.status = String(options.status || '');
  target.error = options.error || false;
  target.success = options.success || false;
  target.useRuntimeLines = true;
  target.instantText = true;
  renderLcd(target);
}

function renderLcd(target) {
  const { canvas: screen, ctx, texture } = target;
  const width = screen.width;
  const height = screen.height;
  const layout = getTextLayout(target.layoutKey);
  const fixedLines = target.useRuntimeLines ? [] : parseFixedText(layout.fixedText);
  const lines = fixedLines.length ? fixedLines : (target.lines || []);
  const status = layout.fixedStatus ? String(layout.fixedStatus) : (target.status || '');
  const error = target.error || false;
  const success = target.success || false;
  const visibleChars = target.instantText
    ? Number.POSITIVE_INFINITY
    : Math.floor(((performance.now() - (target.startedAt || 0)) / 1000) * 30);
  
  ctx.fillStyle = '#06080d';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(36, 229, 255, 0.055)';
  for (let y = 0; y < height; y += 6) {
    ctx.fillRect(0, y, width, 1);
  }

  ctx.fillStyle = 'rgba(36, 229, 255, 0.035)';
  for (let x = 0; x < width; x += 8) {
    ctx.fillRect(x, 0, 1, height);
  }

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
  ctx.textAlign = layout.align || 'left';
  
  let printed = 0;
  lines.forEach((line, index) => {
    const lineColors = [layout.color || '#29f5ff', '#ff4dd8', '#ffd166', '#c7f9ff'];
    const lineGlows = [layout.glow || '#00aeff', '#ff00aa', '#ffaa00', '#24e5ff'];
    const remaining = Math.max(0, visibleChars - printed);
    const text = target.instantText ? String(line) : String(line).slice(0, remaining);
    printed += String(line).length + 2;
    
    const c = error ? '#ff4f7b' : success ? '#15f2c2' : lineColors[index % lineColors.length];
    const g = error ? '#ff0044' : success ? '#00ffaa' : lineGlows[index % lineGlows.length];
    
    ctx.fillStyle = c;
    ctx.shadowColor = g;
    ctx.shadowBlur = 16;
    
    const size = index === 0 ? layout.size : (layout.secondarySize || layout.size);
    const x = layout.x ?? 58;
    const y = (layout.y ?? 58) + index * (layout.lineGap ?? 72);
    ctx.font = getMachineFont(size, layout.fontWeight || 700);
    drawLayoutText(ctx, text, x, y, width, height, layout);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = error ? '#ffd8e2' : success ? '#d7fff5' : (layout.color || '#eaffff');
    drawLayoutText(ctx, text, x, y, width, height, layout);
  });

  if (status) {
    const statusText = target.instantText || visibleChars > printed ? status : '';
    ctx.fillStyle = '#ff4dd8';
    ctx.shadowColor = '#ff4dd8';
    ctx.shadowBlur = 15;
    ctx.font = getMachineFont(layout.statusSize || 34, layout.fontWeight || 700);
    drawLayoutText(ctx, statusText, layout.statusX ?? 58, layout.statusY ?? height - 78, width, height, layout);
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fdf2ff';
    drawLayoutText(ctx, statusText, layout.statusX ?? 58, layout.statusY ?? height - 78, width, height, layout);
  }

  texture.needsUpdate = true;
}

function makeLabelTexture(text, colors = {}) {
  const label = document.createElement('canvas');
  label.width = 1024;
  label.height = 256;
  const ctx = label.getContext('2d');
  const layout = getTextLayout(colors.layoutKey);
  ctx.clearRect(0, 0, label.width, label.height);
  
  const labelScale = colors.overlay ? 2.4 : 1;
  ctx.font = getMachineFont((layout.size || (colors.small ? 48 : 58)) * labelScale, layout.fontWeight || 700);
  ctx.textAlign = layout.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = layout.color || colors.fg || '#ffffff';
  ctx.shadowColor = layout.glow || colors.glow || 'rgba(255, 255, 255, 0.4)';
  ctx.shadowBlur = 8;
  drawLayoutText(
    ctx,
    String(layout.fixedText || text).toUpperCase(),
    colors.overlay ? label.width / 2 : (layout.x ?? label.width / 2),
    colors.overlay ? label.height / 2 : (layout.y ?? label.height / 2),
    label.width,
    label.height,
    layout
  );
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function applyTexture(mesh, texture, emissive = 0.25) {
  if (!mesh) return;
  mesh.traverse((child) => {
    if (!child.isMesh) return;
    forEachMaterial(child, (material) => {
      // Do not overwrite base color with the map if it's highly metallic (steel buttons)
      if (material.metalness >= 0.9) {
        material.metalness = 0.25;
        material.roughness = 0.35;
        material.map = texture;
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

function ensureScreenDisplaySurface(mesh, texture) {
  if (!mesh?.geometry) return;

  let displaySurface = mesh.getObjectByName('auth-text-display-surface');
  if (!displaySurface) {
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const geometry = new THREE.PlaneGeometry(
      Math.max(size.z * 0.94, 0.01),
      Math.max(size.y * 0.9, 0.01)
    );
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    displaySurface = new THREE.Mesh(geometry, material);
    displaySurface.name = 'auth-text-display-surface';
    displaySurface.position.set(
      bounds.max.x + Math.max(size.x * 0.03, 0.002),
      center.y,
      center.z
    );
    displaySurface.rotation.y = Math.PI / 2;
    displaySurface.renderOrder = 20;
    mesh.add(displaySurface);
  }

  displaySurface.material.map = texture;
  displaySurface.material.needsUpdate = true;
}

function ensureButtonLabelSurfaces(mesh, texture) {
  if (!mesh?.geometry) return;

  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const faceAxis = [
    ['x', size.x],
    ['y', size.y],
    ['z', size.z],
  ].reduce((smallest, axis) => axis[1] < smallest[1] ? axis : smallest)[0];
  const fixedToButton = screenAlignedButtonLabels.has(mesh.userData.canonicalName);
  let label = mesh.userData.authButtonLabel;
  if (label && fixedToButton !== Boolean(label.userData.fixedToButton)) {
    label.removeFromParent();
    label.material?.dispose?.();
    label.geometry?.dispose?.();
    label = null;
    mesh.userData.authButtonLabel = null;
  }

  if (!label) {
    const materialOptions = {
      map: texture,
      transparent: true,
      alphaTest: 0.08,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    };
    const material = new THREE.MeshBasicMaterial({
      ...materialOptions,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    label = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    label.name = 'auth-button-label';
    label.userData.fixedToButton = fixedToButton;
    label.renderOrder = 100;
    if (fixedToButton) {
      const planeXSize = faceAxis === 'x' ? size.z : size.x;
      const planeYSize = faceAxis === 'y' ? size.z : size.y;
      const faceLongSide = Math.max(planeXSize, planeYSize);
      const faceShortSide = Math.min(planeXSize, planeYSize);
      const maxWidth = Math.max(faceLongSide * 0.84, 0.08);
      const maxHeight = Math.max(faceShortSide * 0.62, 0.02);
      const labelWidth = Math.min(maxWidth, maxHeight * 4);
      const labelHeight = labelWidth / 4;

      label.position.copy(center);
      label.scale.set(labelWidth, labelHeight, 1);
      if (faceAxis === 'x') label.rotation.y = Math.PI / 2;
      if (faceAxis === 'y') label.rotation.x = -Math.PI / 2;
      if (planeXSize < planeYSize) label.rotateZ(Math.PI / 2);
      label.rotateZ(Math.PI);
      mesh.add(label);
    } else {
      label.scale.set(0.34, 0.085, 1);
      scene.add(label);
    }
    mesh.userData.authButtonLabel = label;
    mesh.userData.authButtonLabelCenter = center.clone();
    mesh.userData.authButtonLabelAxis = faceAxis;
  }

  label.material.map = texture;
  label.material.needsUpdate = true;
}

function updateButtonLabelPositions() {
  const worldCenter = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const worldQuaternion = new THREE.Quaternion();
  const faceQuaternion = new THREE.Quaternion();
  const localXAxis = new THREE.Vector3(1, 0, 0);
  const localYAxis = new THREE.Vector3(0, 1, 0);
  const localZAxis = new THREE.Vector3(0, 0, 1);

  clickableNames.forEach((meshName) => {
    const mesh = meshMap.get(meshName);
    const label = mesh?.userData.authButtonLabel;
    const localCenter = mesh?.userData.authButtonLabelCenter;
    const faceAxis = mesh?.userData.authButtonLabelAxis || 'z';
    if (!label || !localCenter || !label.visible) return;

    mesh.updateWorldMatrix(true, false);
    if (label.userData.fixedToButton && label.parent === mesh) return;
    worldCenter.copy(localCenter).applyMatrix4(mesh.matrixWorld);

    mesh.getWorldQuaternion(worldQuaternion);
    const localNormal = faceAxis === 'x' ? localXAxis : faceAxis === 'y' ? localYAxis : localZAxis;
    worldNormal.copy(localNormal).applyQuaternion(worldQuaternion).normalize();
    cameraDirection.copy(camera.position).sub(worldCenter).normalize();
    const faceSide = worldNormal.dot(cameraDirection) >= 0 ? 1 : -1;

    if (faceAxis === 'x') {
      faceQuaternion.setFromAxisAngle(localYAxis, faceSide * Math.PI / 2);
    } else if (faceAxis === 'y') {
      faceQuaternion.setFromAxisAngle(localXAxis, faceSide * -Math.PI / 2);
    } else {
      faceQuaternion.setFromAxisAngle(localYAxis, faceSide > 0 ? 0 : Math.PI);
    }
    label.quaternion.copy(worldQuaternion).multiply(faceQuaternion);
    label.position.copy(worldCenter).addScaledVector(worldNormal, faceSide * 0.008);
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
      // Tag with the canonical name so click/hover logic matches regardless of GLB naming
      mesh.userData.canonicalName = name;
      if (normalizeMeshName(mesh.name) !== normalizeMeshName(name)) {
        console.info(`Mapped mesh alias: ${name} -> ${mesh.name}`);
      }
    } else {
      console.warn(`Missing mesh: ${name}`);
    }
  });

  const removedSliderMesh = findNamedMesh(root, 'Cube010') ||
    findNamedMesh(root, 'Cube.010') ||
    findNamedMesh(root, 'cube 010');
  if (removedSliderMesh) {
    removedSliderMesh.traverse((child) => {
      child.visible = false;
      child.raycast = () => {};
    });
    console.info(`Removed picked slider mesh: ${removedSliderMesh.name}`);
  } else {
    console.warn('Picked slider mesh not found for dark slot fill: Cube010');
  }

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

  // Give every interactive control one consistent solid polished-steel finish.
  clickableNames.forEach((name) => {
    const mesh = meshMap.get(name);
    if (!mesh) return;
    mesh.traverse((child) => {
      if (!child.isMesh) return;
      forEachMaterial(child, (material) => {
        if (material.color) material.color.set(0x252a31);
        material.metalness = 0.94;
        material.roughness = 0.2;
        material.envMapIntensity = 1.65;
        material.map = null;
        material.aoMap = null;
        material.emissiveMap = null;
        material.metalnessMap = null;
        material.roughnessMap = null;
        material.transparent = false;
        material.opacity = 1;
        if (material.emissive) {
          material.emissive.set(0x000000);
          material.emissiveIntensity = 0;
        }
        material.needsUpdate = true;
      });
    });
  });

  const slideButton = meshMap.get(MESH_NAMES.slideButton);
  if (slideButton) {
    slideButton.traverse((child) => {
      if (!child.isMesh) return;
      forEachMaterial(child, (material) => {
        if (material.color) material.color.set(0x8f111d);
        material.metalness = 0.92;
        material.roughness = 0.18;
        material.envMapIntensity = 1.75;
        material.needsUpdate = true;
      });
    });
  }

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
  drawLcd(lcd.purpil, ['DOUBTHUB', 'WELCOME', 'CONTINUE PROCESS'], { status: 'PRESS CONTINUE' });
}

function getMaskedPassword() {
  return state.password ? '*'.repeat(Math.min(12, state.password.length)) : '';
}

function updateVioletScreen(message = '') {
  if (message) {
    drawInteractiveLcd(lcd.violet, [message], { success: !message.startsWith('ERROR'), error: message.startsWith('ERROR') });
    return;
  }

  if (state.authProvider === 'google' || state.authProvider === 'github') {
    drawInteractiveLcd(lcd.violet, [
      `METHOD: ${state.authProvider}`,
      `CONTINUE WITH ${state.authProvider}`,
    ], { status: 'CONFIRM METHOD' });
    return;
  }

  const cursor = (field) => state.activeField === field ? ' _' : '';
  const lines = [
    `email : ${state.email || ''}${cursor('email')}`,
    `password : ${getMaskedPassword()}${cursor('password')}`,
  ];
  if (state.authMode === 'signup') lines.push(`name : ${state.name || ''}${cursor('name')}`);
  drawInteractiveLcd(lcd.violet, lines, { status: `field: ${state.activeField}` });
}

function updateBlueScreen() {
  const displayName = state.name || state.email.split('@')[0] || 'user';
  drawInteractiveLcd(lcd.blue, ['welcome', displayName], { success: true });
}

function getSupabaseName(user) {
  const metadata = user?.user_metadata || user?.app_metadata || {};
  return metadata.full_name || metadata.name || metadata.display_name || '';
}

async function saveAuthProfile(user, fullName, email) {
  if (!supabaseClient || !user?.id) return;

  const profile = {
    id: user.id,
    full_name: fullName || getSupabaseName(user) || email.split('@')[0],
    email,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from('auth_profiles')
    .upsert(profile, { onConflict: 'id' });

  // Auth metadata is still saved even if the optional profile table has not
  // been created yet, so keep the 3D flow usable.
  if (error) console.warn('Unable to save auth profile table row:', error.message);
}

async function loadAuthProfileName(user, email) {
  const metadataName = getSupabaseName(user);
  if (metadataName) return metadataName;
  if (!supabaseClient || !user?.id) return '';

  const { data, error } = await supabaseClient
    .from('auth_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Unable to load auth profile table row:', error.message);
    return '';
  }
  return data?.full_name || email.split('@')[0] || '';
}

function isEmailNotConfirmed(error) {
  return /email not confirmed/i.test(error?.message || '');
}

async function resendConfirmationEmail(email) {
  if (!supabaseClient || !email) return;
  const { error } = await supabaseClient.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth.html`,
    },
  });
  if (error) console.warn('Unable to resend confirmation email:', error.message);
}

function updateLabels() {
  const labels = [
    [MESH_NAMES.purpilButton, 'CONTINUE', 'purpilButton', '#081018', 0.36],
    [MESH_NAMES.signIn, 'SIGN IN', 'signIn', '#2d210c', 0.38],
    [MESH_NAMES.signUp, 'SIGN UP', 'signUp', '#2d210c', 0.38],
    [MESH_NAMES.google, 'GOOGLE', 'google', '#101019', 0.25, true],
    [MESH_NAMES.github, 'GITHUB', 'github', '#101019', 0.25, true],
    [MESH_NAMES.douthub, 'DOUBTHUB', 'douthub', '#101019', 0.25, true],
    [MESH_NAMES.conformButton, 'CONFIRM', 'conformButton', '#07111c', 0.32, true],
    [MESH_NAMES.forgotPasswordArea, 'FORGOT PASSWORD', 'forgotPasswordArea', '#101019', 0.28, true],
    [MESH_NAMES.violetButton, 'SUBMIT', 'violetButton', '#081018', 0.34],
    [MESH_NAMES.blueButton, 'ENTER', 'blueButton', '#061018', 0.38],
  ];

  labels.forEach(([meshName, text, layoutKey, bg, emissive, small = false]) => {
    const mesh = meshMap.get(meshName);
    const texture = makeLabelTexture(text, { layoutKey, bg, small, overlay: true });
    ensureButtonLabelSurfaces(mesh, texture);
  });
  updateButtonLabelVisibility();
}

function updateButtonLabelVisibility() {
  const visibleByPhase = {
    purple: [MESH_NAMES.purpilButton],
    golden: [MESH_NAMES.signIn, MESH_NAMES.signUp],
    violet: [
      MESH_NAMES.google,
      MESH_NAMES.github,
      MESH_NAMES.douthub,
      MESH_NAMES.slideButton,
      MESH_NAMES.conformButton,
      MESH_NAMES.forgotPasswordArea,
      MESH_NAMES.violetButton,
    ],
    blue: [MESH_NAMES.blueButton],
  };
  const visibleNames = new Set(visibleByPhase[state.phase] || []);
  clickableNames.forEach((meshName) => {
    const label = meshMap.get(meshName)?.userData.authButtonLabel;
    if (label) label.visible = visibleNames.has(meshName);
  });
}

function updateVioletButtonLabel() {
  // Label is static; the screen text carries the current auth mode.
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
  ensureScreenDisplaySurface(meshMap.get(MESH_NAMES.purpilScreen), lcd.purpil.texture);
  ensureScreenDisplaySurface(meshMap.get(MESH_NAMES.violetScreen), lcd.violet.texture);
  ensureScreenDisplaySurface(meshMap.get(MESH_NAMES.blueScreen), lcd.blue.texture);
}

// Working rotation values for each intact device side.
// The model hierarchy is never changed; button clicks only rotate the complete device.
const ROTATIONS = Object.fromEntries(
  Object.entries(PHASE_SETTINGS).map(([phase, setting]) => [
    phase,
    {
      x: setting.rotation.x,
      y: setting.rotation.y,
      z: setting.rotation.z,
    },
  ])
);

function getPhaseSetting(phase) {
  return PHASE_SETTINGS[phase] || PHASE_SETTINGS.assembled;
}

function transitionTo(nextPhase) {
  if (state.phase === nextPhase) return;
  if (!ROTATIONS[nextPhase]) {
    console.warn(`Unknown phase requested: ${nextPhase}`);
    return;
  }

  state.previousPhase = state.phase;
  state.isTransitioning = true;
  console.info(`Phase transition: ${state.previousPhase} -> ${nextPhase}`);

  document.body.classList.toggle('auth-device-focused', nextPhase !== 'assembled');
  applyPhase(nextPhase);

  // Refresh the relevant screen when entering a side
  if (nextPhase === 'purple') updatePurpilScreen();
  if (nextPhase === 'violet') updateVioletScreen();
  if (nextPhase === 'blue') updateBlueScreen();
}

function applyPhase(nextPhase) {
  state.phase = nextPhase;
  updateButtonLabelVisibility();
  if (nextPhase === 'violet') moveSlideButton(state.authProvider);
  const phaseSetting = getPhaseSetting(nextPhase);
  const rotation = phaseSetting.rotation;
  state.targetRotationY = rotation?.y ?? state.targetRotationY;
  state.targetRotationX = rotation?.x ?? state.targetRotationX;
  state.targetRotationZ = rotation?.z ?? state.targetRotationZ;
  cameraPositionTarget.set(
    phaseSetting.camera.position.x,
    phaseSetting.camera.position.y,
    phaseSetting.camera.position.z
  );
  cameraLookTarget.set(
    phaseSetting.camera.lookAt.x,
    phaseSetting.camera.lookAt.y,
    phaseSetting.camera.lookAt.z
  );
  deviceBaseTargetPosition.set(
    phaseSetting.deviceRoot.basePosition.x,
    phaseSetting.deviceRoot.basePosition.y,
    phaseSetting.deviceRoot.basePosition.z
  );
  deviceScaleTarget = phaseSetting.deviceRoot.scale;
  if (mobile3d) {
    const focused = nextPhase !== 'assembled';
    cameraPositionTarget.z += focused ? 1.5 : 0.9;
    deviceBaseTargetPosition.x -= focused ? 1.72 : 1.2;
    deviceBaseTargetPosition.y -= focused ? 0.28 : 0.18;
    deviceScaleTarget *= focused ? 0.88 : 0.92;
  }
  modelRotationEase = clamp(phaseSetting.easing?.rotation ?? modelRotationEase, 0.01, 1);
  cameraEase = clamp(phaseSetting.easing?.camera ?? cameraEase, 0.01, 1);
  state.cameraZoom = nextPhase === 'assembled' ? 0 : 1;
}

function selectProvider(provider) {
  state.authProvider = provider;
  state.activeField = 'email';
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
  if (!slide.userData.originalSelectorPosition) {
    slide.userData.originalSelectorPosition = slide.position.clone();
  }

  // The exported slider starts on the white rail. Only its local Y changes;
  // preserving X/Z keeps it on that rail instead of moving over provider buttons.
  slide.position.x = slide.userData.originalSelectorPosition.x;
  slide.position.y = local.y;
  slide.position.z = slide.userData.originalSelectorPosition.z;
}

function getProviderFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const providers = [
    ['google', MESH_NAMES.google],
    ['github', MESH_NAMES.github],
    ['douthub', MESH_NAMES.douthub],
  ];

  let nearestProvider = state.authProvider;
  let nearestDistance = Infinity;

  providers.forEach(([provider, meshName]) => {
    const mesh = meshMap.get(meshName);
    if (!mesh) return;

    const point = new THREE.Vector3();
    mesh.getWorldPosition(point);
    point.project(camera);
    const screenY = rect.top + (-point.y * 0.5 + 0.5) * rect.height;
    const distance = Math.abs(event.clientY - screenY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestProvider = provider;
    }
  });

  return nearestProvider;
}

function startSlideDrag(event, mesh) {
  if (state.phase !== 'violet' || state.isTransitioning) return false;
  if ((mesh?.userData?.canonicalName || mesh?.name) !== MESH_NAMES.slideButton) return false;

  state.slideDragging = true;
  canvas.setPointerCapture?.(event.pointerId);
  selectProvider(getProviderFromPointer(event));
  return true;
}

function updateSlideDrag(event) {
  if (!state.slideDragging) return false;
  selectProvider(getProviderFromPointer(event));
  return true;
}

function endSlideDrag(event) {
  if (!state.slideDragging) return;
  state.slideDragging = false;
  canvas.releasePointerCapture?.(event.pointerId);
}

function press(mesh) {
  if (!mesh) return;
  const base = mesh.userData.originalScale || mesh.scale.clone();
  if (!mesh.userData.originalScale) mesh.userData.originalScale = base.clone();

  // Press effect: scale down slightly, then spring back
  mesh.scale.copy(base).multiplyScalar(0.92);

  window.setTimeout(() => {
    mesh.scale.copy(base);
  }, 150);
}

async function submitDouthubAuth() {
  if (!supabaseClient) {
    updateVioletScreen('ERROR: AUTH OFFLINE');
    window.setTimeout(() => updateVioletScreen(), 1500);
    return;
  }

  updateVioletScreen(state.authMode === 'signup' ? 'CREATING ACCOUNT...' : 'SIGNING IN...');

  try {
    if (state.authMode === 'signup') {
      const { data, error } = await supabaseClient.auth.signUp({
        email: state.email.trim(),
        password: state.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth.html`,
          data: {
            full_name: state.name.trim(),
            name: state.name.trim(),
          },
        },
      });

      if (error) throw error;
      await saveAuthProfile(data?.user, state.name.trim(), state.email.trim());
      if (!data?.session) {
        updateVioletScreen('CHECK EMAIL TO CONFIRM');
        window.setTimeout(() => updateVioletScreen(), 2200);
        return;
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: state.email.trim(),
        password: state.password,
      });

      if (error) throw error;
      const displayName = await loadAuthProfileName(data?.user, state.email.trim());
      if (displayName) state.name = displayName;
      await saveAuthProfile(data?.user, state.name, state.email.trim());
    }

    updateVioletScreen('ACCESS CHECK...');
    window.setTimeout(() => {
      updateBlueScreen();
      transitionTo('blue');
    }, 650);
  } catch (error) {
    if (isEmailNotConfirmed(error)) {
      await resendConfirmationEmail(state.email.trim());
      updateVioletScreen('CHECK EMAIL TO CONFIRM');
      window.setTimeout(() => updateVioletScreen(), 2400);
      return;
    }
    updateVioletScreen(`ERROR: ${(error?.message || 'AUTH FAILED').slice(0, 28)}`);
    window.setTimeout(() => updateVioletScreen(), 1800);
  }
}

function validateAndContinue({ allowEmptyFields = false } = {}) {
  if (state.authProvider !== 'douthub') {
    updateVioletScreen('CONNECTING...');
    window.setTimeout(() => {
      updateBlueScreen();
      transitionTo('blue');
    }, 850);
    return;
  }

  if (allowEmptyFields) {
    updateVioletScreen('ACCESS CHECK...');
    window.setTimeout(() => {
      updateBlueScreen();
      transitionTo('blue');
    }, 800);
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
  if (state.password.length < 6) {
    updateVioletScreen('ERROR: PASSWORD 6+');
    window.setTimeout(() => updateVioletScreen(), 1400);
    return;
  }

  submitDouthubAuth();
}

function confirmAuthProvider() {
  if (state.authProvider === 'google' || state.authProvider === 'github') {
    validateAndContinue({ allowEmptyFields: true });
    return;
  }

  updateVioletScreen('DOUBTHUB READY');
  window.setTimeout(() => updateVioletScreen(), 1200);
}

function handleClick(mesh) {
  const name = mesh?.userData?.canonicalName || mesh?.name;
  console.log(`Clicked mesh: ${name || '(none)'} (glb: ${mesh?.name || '?'}) | phase: ${state.phase}`);
  if (state.phase === 'assembled') {
    console.log('Click ignored: use Secure login to begin the authentication transition.');
    return;
  }
  if (!name && state.phase !== 'assembled') return;
  if (state.isTransitioning) {
    console.log('Click ignored: model transition in progress.');
    return;
  }

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
    if (name === MESH_NAMES.conformButton) confirmAuthProvider();
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
  const fields = state.authMode === 'signup' ? ['email', 'password', 'name'] : ['email', 'password'];
  const index = fields.indexOf(state.activeField);
  state.activeField = fields[(index + 1) % fields.length];
  updateVioletScreen();
}

function selectVioletFieldFromHit(hit) {
  if (state.authProvider !== 'douthub') return;
  const fields = state.authMode === 'signup' ? ['email', 'password', 'name'] : ['email', 'password'];
  if (!hit?.uv) {
    cycleField();
    return;
  }

  const layout = getTextLayout('violetScreen');
  const canvasY = (1 - hit.uv.y) * lcd.violet.canvas.height;
  let nearestField = fields[0];
  let nearestDistance = Infinity;
  fields.forEach((field, index) => {
    const lineY = (layout.y ?? 58) + index * (layout.lineGap ?? 116) + (layout.size ?? 70) * 0.5;
    const distance = Math.abs(canvasY - lineY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestField = field;
    }
  });
  state.activeField = nearestField;
  updateVioletScreen();
}

function handleTyping(event) {
  if (state.phase !== 'violet' || state.authProvider !== 'douthub') return;
  if (state.isTransitioning) return;
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
    event.preventDefault();
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

function getRawIntersections(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(modelPivot.children, true)
    .filter((item) => item.object?.isMesh);
}

function describePickedMesh(hit) {
  if (!hit?.object) return null;
  const object = hit.object;
  const chain = [];
  let current = object;
  while (current && current !== scene) {
    chain.push(current.name || current.type || '(unnamed)');
    current = current.parent;
  }

  return {
    type: 'auth-3d-picked-mesh',
    picked: {
      name: object.name || '(unnamed)',
      uuid: object.uuid,
      visible: object.visible,
      material: Array.isArray(object.material)
        ? object.material.map((material) => material?.name || material?.type || '(material)')
        : (object.material?.name || object.material?.type || '(material)'),
      distance: Number(hit.distance.toFixed(4)),
      point: {
        x: Number(hit.point.x.toFixed(4)),
        y: Number(hit.point.y.toFixed(4)),
        z: Number(hit.point.z.toFixed(4)),
      },
      parentChain: chain,
    },
  };
}

function getRootNamedMesh(object) {
  let current = object;
  while (current && current !== deviceRoot) {
    if (current.userData.canonicalName) return current;
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
  state.hoverStartedAt = performance.now();
  if (target) {
    const base = target.userData.originalScale || target.scale.clone();
    target.userData.originalScale = base.clone();
    target.scale.copy(base);
    setEmissive(target, '#ff2d7a', state.phase === 'assembled' ? 0.05 : 0.18);
  }
  canvas.style.cursor = target ? 'pointer' : 'default';
}

function canClick(name) {
  if (state.isTransitioning) return false;
  if (state.phase === 'assembled') return false;
  if (!clickableNames.has(name)) return false;
  if (state.phase === 'purple') return [MESH_NAMES.purpilButton, MESH_NAMES.purpilExit].includes(name);
  if (state.phase === 'golden') return [MESH_NAMES.signIn, MESH_NAMES.signUp, MESH_NAMES.goldenExit].includes(name);
  if (state.phase === 'violet') return [
    MESH_NAMES.google,
    MESH_NAMES.github,
    MESH_NAMES.douthub,
    MESH_NAMES.slideButton,
    MESH_NAMES.conformButton,
    MESH_NAMES.forgotPasswordArea,
    MESH_NAMES.violetScreen,
    MESH_NAMES.violetButton,
    MESH_NAMES.voiletExit,
  ].includes(name);
  if (state.phase === 'blue') return [MESH_NAMES.blueButton, MESH_NAMES.blueExit].includes(name);
  return false;
}

function onPointerMove(event) {
  if (updateSlideDrag(event)) return;

  const hit = getIntersections(event)
    .map((item) => getRootNamedMesh(item.object))
    .find((mesh) => canClick(mesh.userData?.canonicalName || mesh.name));
  updateHover(hit || null);
}

function onPointerDown(event) {
  if (tuner.pickMeshOnce) {
    tuner.pickMeshOnce = false;
    const hit = getRawIntersections(event).find((item) => item.object?.visible);
    const payload = describePickedMesh(hit) || {
      type: 'auth-3d-picked-mesh',
      error: 'No visible mesh hit at click position',
    };
    writeTunerPayload(payload);
    return;
  }

  const intersections = getIntersections(event);
  const violetScreenHit = state.phase === 'violet'
    ? intersections.find((item) => {
        const root = getRootNamedMesh(item.object);
        return (root.userData?.canonicalName || root.name) === MESH_NAMES.violetScreen;
      })
    : null;
  if (violetScreenHit) {
    selectVioletFieldFromHit(violetScreenHit);
    return;
  }

  const hits = intersections.map((item) => getRootNamedMesh(item.object));
  const slideHit = hits.find((mesh) => (mesh.userData?.canonicalName || mesh.name) === MESH_NAMES.slideButton);
  if (startSlideDrag(event, slideHit)) return;

  const hit = hits.find((mesh) => canClick(mesh.userData?.canonicalName || mesh.name));
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
  renderer.setPixelRatio(mobile3d ? Math.min(window.devicePixelRatio || 1, 1) : Math.min(window.devicePixelRatio || 1, 1.75));
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

const tunerEnabled = new URLSearchParams(window.location.search).has('debug3d') ||
  window.location.hash.includes('debug3d');
if (tunerEnabled) {
  document.body.classList.add('auth-3d-debug', 'auth-device-summoned');
}
const TUNER_PHASES = ['assembled', 'purple', 'golden', 'violet', 'blue'];

const tunerMeshLabels = [
  MESH_NAMES.purpilCube,
  MESH_NAMES.purpilScreen,
  MESH_NAMES.purpilButton,
  MESH_NAMES.goldenRing,
  MESH_NAMES.signIn,
  MESH_NAMES.signUp,
  MESH_NAMES.violetCube,
  MESH_NAMES.violetScreen,
  MESH_NAMES.violetButton,
  MESH_NAMES.blueCube,
  MESH_NAMES.blueScreen,
  MESH_NAMES.blueButton,
];

const tuner = {
  panel: null,
  output: null,
  status: null,
  editView: null,
  previewView: null,
  labelLayer: null,
  labels: new Map(),
  rawLabels: new Map(),
  inputs: {},
  mode: 'edit',
  editPhase: 'assembled',
  textSurface: 'purpilScreen',
  savedSettings: {},
  labelsVisible: false,
  rawLabelsVisible: false,
  pickMeshOnce: false,
};

function toPlainVector(vector) {
  return {
    x: Number(vector.x.toFixed(4)),
    y: Number(vector.y.toFixed(4)),
    z: Number(vector.z.toFixed(4)),
  };
}

function getCameraViewForPhase(phase) {
  return phase === 'assembled' ? CAMERA_VIEWS.default : CAMERA_VIEWS.focused;
}

function getCurrentTunerSetting(phase = tuner.editPhase) {
  const view = getCameraViewForPhase(phase);
  const rotation = ROTATIONS[phase] || {
    x: state.targetRotationX,
    y: state.targetRotationY,
    z: state.targetRotationZ,
  };

  return {
    phase,
    rotation: {
      x: Number(rotation.x.toFixed(4)),
      y: Number(rotation.y.toFixed(4)),
      z: Number(rotation.z.toFixed(4)),
    },
    camera: {
      position: toPlainVector(view.position),
      lookAt: toPlainVector(view.lookAt),
    },
    deviceRoot: {
      basePosition: toPlainVector(deviceBasePosition),
      scale: Number(deviceRoot.scale.x.toFixed(4)),
    },
    easing: {
      rotation: Number(modelRotationEase.toFixed(4)),
      camera: Number(cameraEase.toFixed(4)),
    },
  };
}

function syncPhaseSetting(phase, setting) {
  if (!PHASE_SETTINGS[phase] || !setting) return;

  PHASE_SETTINGS[phase] = {
    phase,
    rotation: {
      x: Number(setting.rotation.x),
      y: Number(setting.rotation.y),
      z: Number(setting.rotation.z),
    },
    camera: {
      position: {
        x: Number(setting.camera.position.x),
        y: Number(setting.camera.position.y),
        z: Number(setting.camera.position.z),
      },
      lookAt: {
        x: Number(setting.camera.lookAt.x),
        y: Number(setting.camera.lookAt.y),
        z: Number(setting.camera.lookAt.z),
      },
    },
    deviceRoot: {
      basePosition: {
        x: Number(setting.deviceRoot.basePosition.x),
        y: Number(setting.deviceRoot.basePosition.y),
        z: Number(setting.deviceRoot.basePosition.z),
      },
      scale: Number(setting.deviceRoot.scale),
    },
    easing: {
      rotation: Number(setting.easing.rotation),
      camera: Number(setting.easing.camera),
    },
  };

  ROTATIONS[phase] = {
    x: PHASE_SETTINGS[phase].rotation.x,
    y: PHASE_SETTINGS[phase].rotation.y,
    z: PHASE_SETTINGS[phase].rotation.z,
  };
}

function applyTunerSetting(setting, { snapRotation = false, setPhase = true } = {}) {
  if (!setting) return;

  const phase = setting.phase || tuner.editPhase;
  const view = getCameraViewForPhase(phase);
  syncPhaseSetting(phase, setting);

  if (ROTATIONS[phase] && setting.rotation) {
    state.targetRotationX = ROTATIONS[phase].x;
    state.targetRotationY = ROTATIONS[phase].y;
    state.targetRotationZ = ROTATIONS[phase].z;
  }

  if (setting.camera?.position) {
    view.position.set(
      Number(setting.camera.position.x),
      Number(setting.camera.position.y),
      Number(setting.camera.position.z)
    );
  }

  if (setting.camera?.lookAt) {
    view.lookAt.set(
      Number(setting.camera.lookAt.x),
      Number(setting.camera.lookAt.y),
      Number(setting.camera.lookAt.z)
    );
  }

  if (setting.deviceRoot?.basePosition) {
    deviceBasePosition.set(
      Number(setting.deviceRoot.basePosition.x),
      Number(setting.deviceRoot.basePosition.y),
      Number(setting.deviceRoot.basePosition.z)
    );
    deviceRoot.position.x = deviceBasePosition.x;
    deviceRoot.position.z = deviceBasePosition.z;
  }

  if (Number.isFinite(Number(setting.deviceRoot?.scale))) {
    deviceRoot.scale.setScalar(Math.max(0.05, Number(setting.deviceRoot.scale)));
  }

  if (Number.isFinite(Number(setting.easing?.rotation))) {
    modelRotationEase = clamp(Number(setting.easing.rotation), 0.01, 1);
  }

  if (Number.isFinite(Number(setting.easing?.camera))) {
    cameraEase = clamp(Number(setting.easing.camera), 0.01, 1);
  }

  state.cameraZoom = phase === 'assembled' ? 0 : 1;
  if (setPhase) {
    state.phase = phase;
    updateButtonLabelVisibility();
    if (phase === 'violet') moveSlideButton(state.authProvider);
  }

  if (snapRotation) {
    state.currentRotationX = state.targetRotationX;
    state.currentRotationY = state.targetRotationY;
    state.currentRotationZ = state.targetRotationZ;
  }

  state.isTransitioning = !snapRotation;
}

function collectMeshWorldCenters() {
  const centers = {};
  tunerMeshLabels.forEach((name) => {
    const mesh = meshMap.get(name);
    if (!mesh) return;
    const center = new THREE.Vector3();
    mesh.getWorldPosition(center);
    centers[name] = toPlainVector(center);
  });
  return centers;
}

function getTunerSnapshot() {
  return {
    phase: state.phase,
    tunerMode: tuner.mode,
    editingPhase: tuner.editPhase,
    editingTextSurface: tuner.textSurface,
    savedSettings: tuner.savedSettings,
    textLayouts: TEXT_LAYOUTS,
    modelRotation: {
      current: {
        x: Number(state.currentRotationX.toFixed(4)),
        y: Number(state.currentRotationY.toFixed(4)),
        z: Number(state.currentRotationZ.toFixed(4)),
      },
      target: {
        x: Number(state.targetRotationX.toFixed(4)),
        y: Number(state.targetRotationY.toFixed(4)),
        z: Number(state.targetRotationZ.toFixed(4)),
      },
      savedSides: Object.fromEntries(
        Object.entries(ROTATIONS).map(([phase, rotation]) => [
          phase,
          {
            x: Number(rotation.x.toFixed(4)),
            y: Number(rotation.y.toFixed(4)),
            z: Number(rotation.z.toFixed(4)),
          },
        ])
      ),
      ease: Number(modelRotationEase.toFixed(4)),
    },
    camera: {
      currentPosition: toPlainVector(camera.position),
      currentLookAt: toPlainVector(cameraLookAt),
      focusedPosition: toPlainVector(CAMERA_VIEWS.focused.position),
      focusedLookAt: toPlainVector(CAMERA_VIEWS.focused.lookAt),
      defaultPosition: toPlainVector(CAMERA_VIEWS.default.position),
      defaultLookAt: toPlainVector(CAMERA_VIEWS.default.lookAt),
      ease: Number(cameraEase.toFixed(4)),
      zoomMode: state.cameraZoom ? 'focused' : 'default',
    },
    deviceRoot: {
      basePosition: toPlainVector(deviceBasePosition),
      livePosition: toPlainVector(deviceRoot.position),
      rotation: toPlainVector(deviceRoot.rotation),
      scale: toPlainVector(deviceRoot.scale),
    },
    meshWorldCenters: collectMeshWorldCenters(),
  };
}

function setTunerInput(name, value) {
  const input = tuner.inputs[name];
  if (input) input.value = Number(value).toFixed(3);
}

function syncTunerInputs() {
  if (!tuner.panel) return;

  const phase = tuner.editPhase;
  const saved = tuner.savedSettings[phase];
  const rotation = saved?.rotation || ROTATIONS[phase] || {
    x: state.targetRotationX,
    y: state.targetRotationY,
    z: state.targetRotationZ,
  };
  const view = getCameraViewForPhase(phase);
  const cameraPosition = saved?.camera?.position || view.position;
  const cameraLookAt = saved?.camera?.lookAt || view.lookAt;
  const devicePosition = saved?.deviceRoot?.basePosition || deviceBasePosition;
  const scale = saved?.deviceRoot?.scale ?? deviceRoot.scale.x;
  const rotationEase = saved?.easing?.rotation ?? modelRotationEase;
  const savedCameraEase = saved?.easing?.camera ?? cameraEase;

  if (tuner.inputs.phase) tuner.inputs.phase.value = phase;
  setTunerInput('rotX', rotation.x);
  setTunerInput('rotY', rotation.y);
  setTunerInput('rotZ', rotation.z);
  setTunerInput('camX', cameraPosition.x);
  setTunerInput('camY', cameraPosition.y);
  setTunerInput('camZ', cameraPosition.z);
  setTunerInput('lookX', cameraLookAt.x);
  setTunerInput('lookY', cameraLookAt.y);
  setTunerInput('lookZ', cameraLookAt.z);
  setTunerInput('rootX', devicePosition.x);
  setTunerInput('rootY', devicePosition.y);
  setTunerInput('rootZ', devicePosition.z);
  setTunerInput('scale', scale);
  setTunerInput('rotEase', rotationEase);
  setTunerInput('camEase', savedCameraEase);
}

function readTunerNumber(name, fallback = 0) {
  const value = Number(tuner.inputs[name]?.value);
  return Number.isFinite(value) ? value : fallback;
}

function applyTunerValues({ snapRotation = false } = {}) {
  const phase = tuner.editPhase;
  const view = getCameraViewForPhase(phase);

  state.targetRotationX = readTunerNumber('rotX', state.targetRotationX);
  state.targetRotationY = readTunerNumber('rotY', state.targetRotationY);
  state.targetRotationZ = readTunerNumber('rotZ', state.targetRotationZ);
  if (ROTATIONS[phase]) {
    ROTATIONS[phase].x = state.targetRotationX;
    ROTATIONS[phase].y = state.targetRotationY;
    ROTATIONS[phase].z = state.targetRotationZ;
  }

  if (snapRotation) {
    state.currentRotationX = state.targetRotationX;
    state.currentRotationY = state.targetRotationY;
    state.currentRotationZ = state.targetRotationZ;
  }

  view.position.set(
    readTunerNumber('camX', view.position.x),
    readTunerNumber('camY', view.position.y),
    readTunerNumber('camZ', view.position.z)
  );

  view.lookAt.set(
    readTunerNumber('lookX', view.lookAt.x),
    readTunerNumber('lookY', view.lookAt.y),
    readTunerNumber('lookZ', view.lookAt.z)
  );

  deviceBasePosition.set(
    readTunerNumber('rootX', deviceBasePosition.x),
    readTunerNumber('rootY', deviceBasePosition.y),
    readTunerNumber('rootZ', deviceBasePosition.z)
  );
  deviceRoot.position.x = deviceBasePosition.x;
  deviceRoot.position.z = deviceBasePosition.z;

  const scale = readTunerNumber('scale', deviceRoot.scale.x);
  deviceRoot.scale.setScalar(Math.max(0.05, scale));

  modelRotationEase = clamp(readTunerNumber('rotEase', modelRotationEase), 0.01, 1);
  cameraEase = clamp(readTunerNumber('camEase', cameraEase), 0.01, 1);
  state.phase = phase;
  state.cameraZoom = phase === 'assembled' ? 0 : 1;
  state.isTransitioning = !snapRotation;
}

function loadTunerEditPhase(phase) {
  if (!TUNER_PHASES.includes(phase)) return;

  tuner.mode = 'edit';
  tuner.editPhase = phase;
  syncTunerInputs();
  applyTunerSetting(tuner.savedSettings[phase] || getCurrentTunerSetting(phase), {
    snapRotation: true,
    setPhase: true,
  });
  syncTunerInputs();
  updateTunerMode();
}

function saveCurrentEditPhase() {
  applyTunerValues({ snapRotation: true });
  const setting = getCurrentTunerSetting(tuner.editPhase);
  syncPhaseSetting(tuner.editPhase, setting);
  tuner.savedSettings[tuner.editPhase] = setting;
  writeTunerPayload({
    type: 'auth-3d-selected-setting',
    savedAt: new Date().toISOString(),
    setting,
  });
}

function getTunerFinalPayload() {
  return {
    type: 'auth-3d-final-settings',
    savedAt: new Date().toISOString(),
    editOrder: TUNER_PHASES,
    settings: tuner.savedSettings,
    currentRuntime: getTunerSnapshot(),
  };
}

function writeTunerPayload(payload) {
  if (!tuner.output) return;

  const snapshot = JSON.stringify(payload, null, 2);
  tuner.output.value = snapshot;
  tuner.output.focus();
  tuner.output.select();

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(snapshot).catch(() => {});
  }
}

function writeSelectedTunerSetting() {
  writeTunerPayload({
    type: 'auth-3d-selected-setting',
    setting: tuner.savedSettings[tuner.editPhase] || getCurrentTunerSetting(tuner.editPhase),
  });
}

function writeAllTunerSettings() {
  writeTunerPayload(getTunerFinalPayload());
}

function enterTunerPreview() {
  tuner.mode = 'preview';
  writeAllTunerSettings();
  updateTunerMode();
}

function enterTunerEdit() {
  tuner.mode = 'edit';
  updateTunerMode();
}

function previewTunerPhase(phase) {
  if (!TUNER_PHASES.includes(phase)) return;

  const setting = tuner.savedSettings[phase] || getCurrentTunerSetting(phase);
  applyTunerSetting(setting, { snapRotation: false, setPhase: false });
  transitionTo(phase);
}

function updateTunerMode() {
  if (!tuner.panel) return;

  if (tuner.editView) tuner.editView.style.display = tuner.mode === 'edit' ? 'grid' : 'none';
  if (tuner.previewView) tuner.previewView.style.display = tuner.mode === 'preview' ? 'grid' : 'none';
}

function syncTextTunerInputs() {
  const layout = getTextLayout(tuner.textSurface);
  if (tuner.inputs.textSurface) tuner.inputs.textSurface.value = tuner.textSurface;
  setTunerInput('textX', layout.x ?? 0);
  setTunerInput('textY', layout.y ?? 0);
  setTunerInput('textStatusX', layout.statusX ?? layout.x ?? 0);
  setTunerInput('textStatusY', layout.statusY ?? 0);
  setTunerInput('textSize', layout.size ?? 48);
  setTunerInput('textSecondarySize', layout.secondarySize ?? layout.size ?? 48);
  setTunerInput('textStatusSize', layout.statusSize ?? 34);
  setTunerInput('textLineGap', layout.lineGap ?? 72);
  setTunerInput('textWeight', layout.fontWeight ?? 700);
  setTunerInput('textRotation', layout.rotation ?? 0);
  if (tuner.inputs.textAlign) tuner.inputs.textAlign.value = layout.align || 'center';
  if (tuner.inputs.textMirrorX) tuner.inputs.textMirrorX.value = layout.mirrorX ? 'on' : 'off';
  if (tuner.inputs.textMirrorY) tuner.inputs.textMirrorY.value = layout.mirrorY ? 'on' : 'off';
  if (tuner.inputs.textColor) tuner.inputs.textColor.value = layout.color || '#ffffff';
  if (tuner.inputs.textGlow) tuner.inputs.textGlow.value = layout.glow || '#24e5ff';
  if (tuner.inputs.textColorPalette) tuner.inputs.textColorPalette.value = layout.color || '#ffffff';
  if (tuner.inputs.textGlowPalette) tuner.inputs.textGlowPalette.value = layout.glow || '#24e5ff';
  if (tuner.inputs.textFixed) tuner.inputs.textFixed.value = layout.fixedText || '';
  if (tuner.inputs.textFixedStatus) tuner.inputs.textFixedStatus.value = layout.fixedStatus || '';
}

function applyTextTunerValues() {
  const layout = getTextLayout(tuner.textSurface);
  layout.x = readTunerNumber('textX', layout.x ?? 0);
  layout.y = readTunerNumber('textY', layout.y ?? 0);
  layout.statusX = readTunerNumber('textStatusX', layout.statusX ?? layout.x ?? 0);
  layout.statusY = readTunerNumber('textStatusY', layout.statusY ?? 0);
  layout.size = readTunerNumber('textSize', layout.size ?? 48);
  layout.secondarySize = readTunerNumber('textSecondarySize', layout.secondarySize ?? layout.size ?? 48);
  layout.statusSize = readTunerNumber('textStatusSize', layout.statusSize ?? 34);
  layout.lineGap = readTunerNumber('textLineGap', layout.lineGap ?? 72);
  layout.fontWeight = THREE.MathUtils.clamp(
    readTunerNumber('textWeight', layout.fontWeight ?? 700),
    100,
    1000
  );
  setTunerInput('textWeight', layout.fontWeight);
  layout.rotation = readTunerNumber('textRotation', layout.rotation ?? 0);
  layout.align = tuner.inputs.textAlign?.value || layout.align || 'center';
  layout.mirrorX = tuner.inputs.textMirrorX?.value === 'on';
  layout.mirrorY = tuner.inputs.textMirrorY?.value === 'on';
  layout.color = tuner.inputs.textColor?.value || layout.color || '#ffffff';
  layout.glow = tuner.inputs.textGlow?.value || layout.glow || '#24e5ff';
  layout.fixedText = tuner.inputs.textFixed?.value || '';
  layout.fixedStatus = tuner.inputs.textFixedStatus?.value || '';
  updateLabels();
  renderLcd(lcd.purpil);
  renderLcd(lcd.violet);
  renderLcd(lcd.blue);
}

function resetSelectedTextInsideMesh() {
  const layout = getTextLayout(tuner.textSurface);
  if (tuner.textSurface.endsWith('Screen')) {
    layout.x = 512;
    layout.y = 72;
    layout.statusX = 512;
    layout.statusY = 434;
    layout.align = 'center';
  } else {
    layout.x = 256;
    layout.y = 96;
    layout.align = 'center';
  }
  layout.size = tuner.textSurface.endsWith('Screen') ? 64 : 58;
  layout.secondarySize = tuner.textSurface.endsWith('Screen') ? 52 : layout.size;
  layout.color = '#ffffff';
  layout.glow = '#24e5ff';
  syncTextTunerInputs();
  applyTextTunerValues();
}

function insertFixedTextLineBreak() {
  const input = tuner.inputs.textFixed;
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  const prefix = before && !before.endsWith('|') ? '|' : '';
  const suffix = after && !after.startsWith('|') ? '|' : '';
  input.value = `${before}${prefix}${suffix}${after}`;
  const cursor = before.length + prefix.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
  applyTextTunerValues();
}

function setVioletFormTextPreset() {
  tuner.textSurface = 'violetScreen';
  const layout = getTextLayout(tuner.textSurface);
  layout.fixedText = 'NAME: ____|EMAIL: ____|PASSWORD: ____';
  layout.fixedStatus = 'FIELD: EMAIL';
  layout.x = 58;
  layout.y = 58;
  layout.statusX = 58;
  layout.statusY = 434;
  layout.size = Math.min(layout.size || 40, 40);
  layout.secondarySize = Math.min(layout.secondarySize || 34, 34);
  layout.lineGap = layout.lineGap || 68;
  layout.align = 'left';
  layout.mirrorX = false;
  layout.mirrorY = false;
  syncTextTunerInputs();
  applyTextTunerValues();
}

function writeTextLayoutSettings() {
  writeTunerPayload({
    type: 'auth-3d-text-layout-settings',
    savedAt: new Date().toISOString(),
    selectedSurface: tuner.textSurface,
    textLayouts: TEXT_LAYOUTS,
  });
}

function createTunerNumber(name, label, step = '0.01', onInput = applyTunerValues) {
  const wrap = document.createElement('label');
  wrap.style.display = 'grid';
  wrap.style.gap = '0.15rem';
  wrap.style.fontSize = '0.68rem';
  wrap.style.color = '#b9d8ff';
  wrap.textContent = label;

  const input = document.createElement('input');
  input.type = 'number';
  input.step = step;
  input.style.width = '5.1rem';
  input.style.padding = '0.25rem';
  input.style.border = '1px solid rgba(125, 211, 252, 0.35)';
  input.style.borderRadius = '0.35rem';
  input.style.background = 'rgba(2, 6, 23, 0.92)';
  input.style.color = '#ffffff';
  input.addEventListener('input', onInput);
  tuner.inputs[name] = input;
  wrap.appendChild(input);
  return wrap;
}

function createTunerText(name, label) {
  const wrap = document.createElement('label');
  wrap.style.display = 'grid';
  wrap.style.gap = '0.15rem';
  wrap.style.fontSize = '0.68rem';
  wrap.style.color = '#b9d8ff';
  wrap.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.style.width = '5.8rem';
  input.style.padding = '0.25rem';
  input.style.border = '1px solid rgba(125, 211, 252, 0.35)';
  input.style.borderRadius = '0.35rem';
  input.style.background = 'rgba(2, 6, 23, 0.92)';
  input.style.color = '#ffffff';
  input.addEventListener('input', () => {
    const paletteName = name === 'textColor'
      ? 'textColorPalette'
      : name === 'textGlow'
        ? 'textGlowPalette'
        : null;
    if (paletteName && /^#[0-9a-f]{6}$/i.test(input.value) && tuner.inputs[paletteName]) {
      tuner.inputs[paletteName].value = input.value;
    }
    applyTextTunerValues();
  });
  tuner.inputs[name] = input;
  wrap.appendChild(input);
  return wrap;
}

function createTunerColor(name, label, textInputName) {
  const wrap = document.createElement('label');
  wrap.style.display = 'grid';
  wrap.style.gap = '0.15rem';
  wrap.style.fontSize = '0.68rem';
  wrap.style.color = '#b9d8ff';
  wrap.textContent = label;

  const input = document.createElement('input');
  input.type = 'color';
  input.style.width = '3.2rem';
  input.style.height = '2rem';
  input.style.padding = '0.12rem';
  input.style.border = '1px solid rgba(125, 211, 252, 0.35)';
  input.style.borderRadius = '0.35rem';
  input.style.background = 'rgba(2, 6, 23, 0.92)';
  input.style.cursor = 'pointer';
  input.addEventListener('input', () => {
    if (tuner.inputs[textInputName]) tuner.inputs[textInputName].value = input.value;
    applyTextTunerValues();
  });
  tuner.inputs[name] = input;
  wrap.appendChild(input);
  return wrap;
}

function createTunerSelect(name, label, options, onChange) {
  const wrap = document.createElement('label');
  wrap.style.display = 'grid';
  wrap.style.gap = '0.15rem';
  wrap.style.fontSize = '0.68rem';
  wrap.style.color = '#b9d8ff';
  wrap.textContent = label;

  const select = document.createElement('select');
  select.style.padding = '0.35rem';
  select.style.borderRadius = '0.45rem';
  select.style.background = 'rgba(2, 6, 23, 0.95)';
  select.style.color = '#ffffff';
  options.forEach((optionValue) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    select.appendChild(option);
  });
  select.addEventListener('change', onChange);
  tuner.inputs[name] = select;
  wrap.appendChild(select);
  return wrap;
}

function createTunerButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.style.padding = '0.35rem 0.5rem';
  button.style.border = '1px solid rgba(125, 211, 252, 0.4)';
  button.style.borderRadius = '0.45rem';
  button.style.background = 'rgba(14, 165, 233, 0.18)';
  button.style.color = '#ffffff';
  button.style.font = '700 0.72rem Inter, system-ui, sans-serif';
  button.style.cursor = 'pointer';
  button.addEventListener('click', onClick);
  return button;
}

function createTunerSection(title, children) {
  const section = document.createElement('section');
  section.style.display = 'grid';
  section.style.gap = '0.45rem';

  const heading = document.createElement('div');
  heading.textContent = title;
  heading.style.color = '#67e8f9';
  heading.style.font = '800 0.72rem Inter, system-ui, sans-serif';
  heading.style.textTransform = 'uppercase';
  heading.style.letterSpacing = '0.08em';

  const grid = document.createElement('div');
  grid.style.display = 'flex';
  grid.style.flexWrap = 'wrap';
  grid.style.gap = '0.45rem';
  children.forEach((child) => grid.appendChild(child));

  section.append(heading, grid);
  return section;
}

function setupTunerLabels() {
  tuner.labelLayer = document.createElement('div');
  tuner.labelLayer.style.position = 'fixed';
  tuner.labelLayer.style.inset = '0';
  tuner.labelLayer.style.zIndex = '9998';
  tuner.labelLayer.style.pointerEvents = 'none';
  tuner.labelLayer.style.display = 'none';
  document.body.appendChild(tuner.labelLayer);

  tunerMeshLabels.forEach((name) => {
    const label = document.createElement('div');
    label.textContent = name;
    label.style.position = 'absolute';
    label.style.padding = '0.15rem 0.35rem';
    label.style.border = '1px solid rgba(34, 211, 238, 0.65)';
    label.style.borderRadius = '999px';
    label.style.background = 'rgba(2, 6, 23, 0.82)';
    label.style.color = '#dffbff';
    label.style.font = '700 0.62rem Inter, system-ui, sans-serif';
    label.style.textShadow = '0 0 8px rgba(34, 211, 238, 0.8)';
    label.style.transform = 'translate(-50%, -50%)';
    label.style.whiteSpace = 'nowrap';
    tuner.labels.set(name, label);
    tuner.labelLayer.appendChild(label);
  });

  let rawIndex = 0;
  modelPivot.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.name) return;
    const key = `${mesh.name}#${rawIndex}`;
    rawIndex += 1;
    const label = document.createElement('div');
    label.textContent = mesh.name;
    label.style.position = 'absolute';
    label.style.padding = '0.12rem 0.3rem';
    label.style.border = '1px solid rgba(250, 204, 21, 0.75)';
    label.style.borderRadius = '0.35rem';
    label.style.background = 'rgba(24, 12, 2, 0.84)';
    label.style.color = '#fef3c7';
    label.style.font = '800 0.56rem Consolas, monospace';
    label.style.textShadow = '0 0 8px rgba(250, 204, 21, 0.75)';
    label.style.transform = 'translate(-50%, -50%)';
    label.style.whiteSpace = 'nowrap';
    label.style.display = 'none';
    tuner.rawLabels.set(key, { label, mesh });
    tuner.labelLayer.appendChild(label);
  });
}

function updateTunerLabels() {
  if (!tunerEnabled || !tuner.labelLayer || !tuner.labelsVisible) return;

  const rect = canvas.getBoundingClientRect();
  tuner.labels.forEach((label, name) => {
    const mesh = meshMap.get(name);
    if (!mesh) {
      label.style.display = 'none';
      return;
    }

    const point = new THREE.Vector3();
    mesh.getWorldPosition(point);
    point.project(camera);

    const visible = point.z > -1 && point.z < 1;
    label.style.display = visible ? 'block' : 'none';
    if (!visible) return;

    const x = rect.left + (point.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-point.y * 0.5 + 0.5) * rect.height;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  });

  tuner.rawLabels.forEach(({ label, mesh }) => {
    if (!tuner.rawLabelsVisible || !mesh.visible) {
      label.style.display = 'none';
      return;
    }

    const point = new THREE.Vector3();
    mesh.getWorldPosition(point);
    point.project(camera);

    const visible = point.z > -1 && point.z < 1;
    label.style.display = visible ? 'block' : 'none';
    if (!visible) return;

    const x = rect.left + (point.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-point.y * 0.5 + 0.5) * rect.height;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  });
}

function setupTuner() {
  if (!tunerEnabled) return;

  tuner.savedSettings = Object.fromEntries(
    TUNER_PHASES.map((phase) => [phase, getCurrentTunerSetting(phase)])
  );

  const panel = document.createElement('aside');
  panel.style.position = 'fixed';
  panel.style.left = '1rem';
  panel.style.bottom = '1rem';
  panel.style.zIndex = '9999';
  panel.style.width = 'min(28rem, calc(100vw - 2rem))';
  panel.style.maxHeight = '82vh';
  panel.style.overflow = 'auto';
  panel.style.display = 'grid';
  panel.style.gap = '0.75rem';
  panel.style.padding = '0.85rem';
  panel.style.border = '1px solid rgba(125, 211, 252, 0.4)';
  panel.style.borderRadius = '0.65rem';
  panel.style.background = 'rgba(3, 7, 18, 0.92)';
  panel.style.boxShadow = '0 0 32px rgba(34, 211, 238, 0.18)';
  panel.style.color = '#ffffff';
  panel.style.font = '500 0.78rem Inter, system-ui, sans-serif';
  tuner.panel = panel;

  const title = document.createElement('div');
  title.textContent = '3D Auth Tuner';
  title.style.font = '900 1rem Inter, system-ui, sans-serif';

  tuner.status = document.createElement('div');
  tuner.status.style.color = '#bae6fd';
  tuner.status.style.fontSize = '0.72rem';

  const phaseSelect = document.createElement('select');
  TUNER_PHASES.forEach((phase) => {
    const option = document.createElement('option');
    option.value = phase;
    option.textContent = phase === 'assembled' ? 'assembled / default' : phase;
    phaseSelect.appendChild(option);
  });
  phaseSelect.style.padding = '0.35rem';
  phaseSelect.style.borderRadius = '0.45rem';
  phaseSelect.style.background = 'rgba(2, 6, 23, 0.95)';
  phaseSelect.style.color = '#ffffff';
  phaseSelect.addEventListener('change', () => loadTunerEditPhase(phaseSelect.value));
  tuner.inputs.phase = phaseSelect;

  const rotationInputs = [
    createTunerNumber('rotX', 'rot x'),
    createTunerNumber('rotY', 'rot y'),
    createTunerNumber('rotZ', 'rot z'),
    createTunerNumber('rotEase', 'rot ease', '0.005'),
  ];

  const cameraInputs = [
    createTunerNumber('camX', 'cam x'),
    createTunerNumber('camY', 'cam y'),
    createTunerNumber('camZ', 'cam z'),
    createTunerNumber('lookX', 'look x'),
    createTunerNumber('lookY', 'look y'),
    createTunerNumber('lookZ', 'look z'),
    createTunerNumber('camEase', 'cam ease', '0.005'),
  ];

  const deviceInputs = [
    createTunerNumber('rootX', 'root x'),
    createTunerNumber('rootY', 'root y'),
    createTunerNumber('rootZ', 'root z'),
    createTunerNumber('scale', 'scale', '0.01'),
  ];

  const textLayoutInputs = [
    createTunerSelect('textSurface', 'surface', Object.keys(TEXT_LAYOUTS), () => {
      tuner.textSurface = tuner.inputs.textSurface.value;
      syncTextTunerInputs();
    }),
    createTunerNumber('textX', 'text x', '1', applyTextTunerValues),
    createTunerNumber('textY', 'text y', '1', applyTextTunerValues),
    createTunerNumber('textStatusX', 'status x', '1', applyTextTunerValues),
    createTunerNumber('textStatusY', 'status y', '1', applyTextTunerValues),
    createTunerNumber('textSize', 'font size', '1', applyTextTunerValues),
    createTunerNumber('textSecondarySize', 'small size', '1', applyTextTunerValues),
    createTunerNumber('textStatusSize', 'status size', '1', applyTextTunerValues),
    createTunerNumber('textLineGap', 'line gap', '1', applyTextTunerValues),
    createTunerNumber('textWeight', 'weight', '50', applyTextTunerValues),
    createTunerNumber('textRotation', 'rotation deg', '1', applyTextTunerValues),
    createTunerSelect('textAlign', 'align', ['left', 'center', 'right'], applyTextTunerValues),
    createTunerSelect('textMirrorX', 'mirror x', ['off', 'on'], applyTextTunerValues),
    createTunerSelect('textMirrorY', 'mirror y', ['off', 'on'], applyTextTunerValues),
    createTunerText('textColor', 'color'),
    createTunerColor('textColorPalette', 'color palette', 'textColor'),
    createTunerText('textGlow', 'glow'),
    createTunerColor('textGlowPalette', 'glow palette', 'textGlow'),
    createTunerText('textFixed', 'fixed words'),
    createTunerText('textFixedStatus', 'status words'),
    createTunerButton('fit text inside mesh', resetSelectedTextInsideMesh),
    createTunerButton('add / change line', insertFixedTextLineBreak),
    createTunerButton('violet form preset', setVioletFormTextPreset),
    createTunerButton('copy text layouts', writeTextLayoutSettings),
  ];

  tuner.output = document.createElement('textarea');
  tuner.output.rows = 7;
  tuner.output.readOnly = true;
  tuner.output.style.width = '100%';
  tuner.output.style.boxSizing = 'border-box';
  tuner.output.style.padding = '0.5rem';
  tuner.output.style.border = '1px solid rgba(125, 211, 252, 0.35)';
  tuner.output.style.borderRadius = '0.45rem';
  tuner.output.style.background = 'rgba(2, 6, 23, 0.95)';
  tuner.output.style.color = '#e0f2fe';
  tuner.output.style.font = '600 0.68rem Consolas, monospace';

  tuner.editView = document.createElement('div');
  tuner.editView.style.display = 'grid';
  tuner.editView.style.gap = '0.75rem';
  tuner.editView.append(
    createTunerSection('Which view should be edited?', [
      phaseSelect,
      createTunerButton('load selected', () => loadTunerEditPhase(phaseSelect.value)),
    ]),
    createTunerSection('Target rotation', [
      ...rotationInputs,
      createTunerButton('snap now', () => applyTunerValues({ snapRotation: true })),
      createTunerButton('save selected', saveCurrentEditPhase),
    ]),
    createTunerSection('Camera for selected view', cameraInputs),
    createTunerSection('Device placement', deviceInputs),
    createTunerSection('Text layout', textLayoutInputs),
    createTunerSection('Save and copy', [
      createTunerButton('mesh labels', () => {
        tuner.labelsVisible = !tuner.labelsVisible;
        if (tuner.labelLayer) tuner.labelLayer.style.display = tuner.labelsVisible || tuner.rawLabelsVisible ? 'block' : 'none';
      }),
      createTunerButton('all mesh names', () => {
        tuner.rawLabelsVisible = !tuner.rawLabelsVisible;
        tuner.labelsVisible = tuner.labelsVisible || tuner.rawLabelsVisible;
        if (tuner.labelLayer) tuner.labelLayer.style.display = tuner.labelsVisible ? 'block' : 'none';
      }),
      createTunerButton('pick mesh', () => {
        tuner.pickMeshOnce = true;
        writeTunerPayload({
          type: 'auth-3d-pick-mesh-ready',
          instruction: 'Click the exact 3D mesh once. The raw mesh name will appear here.',
        });
      }),
      createTunerButton('copy selected', writeSelectedTunerSetting),
      createTunerButton('copy all saved', writeAllTunerSettings),
      createTunerButton('final preview', enterTunerPreview),
    ])
  );

  tuner.previewView = document.createElement('div');
  tuner.previewView.style.display = 'none';
  tuner.previewView.style.gap = '0.75rem';
  tuner.previewView.append(
    createTunerSection('Final preview', TUNER_PHASES.map((phase) =>
      createTunerButton(phase, () => previewTunerPhase(phase))
    )),
    createTunerSection('Finish', [
      createTunerButton('edit settings', enterTunerEdit),
      createTunerButton('final submit', writeAllTunerSettings),
    ])
  );

  panel.append(
    title,
    tuner.status,
    tuner.editView,
    tuner.previewView,
    tuner.output
  );

  document.body.appendChild(panel);
  setupTunerLabels();
  syncTunerInputs();
  syncTextTunerInputs();

  window.auth3DTuner = {
    snapshot: getTunerSnapshot,
    apply: applyTunerValues,
    sync: syncTunerInputs,
    saveSelected: saveCurrentEditPhase,
    copySelected: writeSelectedTunerSetting,
    copyAll: writeAllTunerSettings,
    finalPreview: enterTunerPreview,
  };
}

function updateTunerStatus() {
  if (!tuner.status) return;
  const saved = TUNER_PHASES.filter((phase) => tuner.savedSettings[phase]).join(', ') || 'none';
  tuner.status.textContent =
    `mode ${tuner.mode} | editing ${tuner.editPhase} | saved ${saved} | live ${state.phase} | rot ${state.currentRotationX.toFixed(2)}, ${state.currentRotationY.toFixed(2)}, ${state.currentRotationZ.toFixed(2)} | camera ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`;
}

function animate() {
  const now = performance.now();
  // Cap delta time to prevent animations from instantly finishing if there's a load pause
  const dt = Math.min(clock.getDelta(), 0.1);

  // Update Blender animation mixer (plays exported exploding/assembly animation)
  if (mixer) mixer.update(dt);

  // Gentle vertical float on Y only — deviceRoot X/Z stay fixed on every side
  if (state.phase !== 'loading' && state.phase !== 'landingAnimationPlaying') {
    deviceBasePosition.lerp(deviceBaseTargetPosition, cameraEase);
    const nextScale = THREE.MathUtils.lerp(deviceRoot.scale.x, deviceScaleTarget, cameraEase);
    deviceRoot.scale.setScalar(nextScale);

    const idle = (now - state.assembledAt) * 0.001;
    deviceRoot.position.x = deviceBasePosition.x;
    deviceRoot.position.z = deviceBasePosition.z;
    deviceRoot.position.y = deviceBasePosition.y + Math.sin(idle * 1.8) * 0.045;
  }

  const goldenRing = meshMap.get(MESH_NAMES.goldenRing);
  if (goldenRing) goldenRing.rotation.z += dt * 1.25;

  if (state.hovered) {
    const hoverAge = (now - state.hoverStartedAt) * 0.001;
    const hoverBase = state.phase === 'assembled' ? 0.045 : 0.16;
    const hoverPulse = hoverBase + (Math.sin(hoverAge * 8) * 0.5 + 0.5) * 0.08;
    setEmissive(state.hovered, '#ff2d7a', hoverPulse);
  }

  // Rotate the intact device between purple, golden, violet, and blue sides.
  if (state.phase !== 'landingAnimationPlaying') {
    state.currentRotationY += (state.targetRotationY - state.currentRotationY) * modelRotationEase;
    state.currentRotationX += (state.targetRotationX - state.currentRotationX) * modelRotationEase;
    state.currentRotationZ += (state.targetRotationZ - state.currentRotationZ) * modelRotationEase;
    modelPivot.rotation.y = state.currentRotationY;
    modelPivot.rotation.x = state.currentRotationX;
    modelPivot.rotation.z = state.currentRotationZ;

    // Re-enable clicks once the whole-device rotation is nearly complete.
    if (
      state.isTransitioning &&
      Math.abs(state.targetRotationY - state.currentRotationY) < 0.04 &&
      Math.abs(state.targetRotationX - state.currentRotationX) < 0.04 &&
      Math.abs(state.targetRotationZ - state.currentRotationZ) < 0.04
    ) {
      state.isTransitioning = false;
      console.log(`Model transition settled — phase: ${state.phase}`);
    }
  }

  // Smoothly fly the camera in close to the device side when focused,
  // and back out to the landing framing when assembled. The look direction
  // stays fixed so the model never shifts position on screen.
  camera.position.lerp(cameraPositionTarget, cameraEase);
  cameraLookAt.lerp(cameraLookTarget, cameraEase);
  camera.lookAt(cameraLookAt);

  // ---------- Dynamic light follow system ----------

  // Keep light target locked to the model center
  lightTarget.position.set(
    deviceRoot.position.x,
    deviceRoot.position.y + 0.15,
    deviceRoot.position.z
  );

  // Slow RGB orbit keeps changing faces readable without washing out the steel.
  const lightTime = now * 0.001;
  const orbit = lightTime * 0.34;

  lights.cyan.position.set(
    deviceRoot.position.x - 2.35 + Math.sin(orbit) * 0.28,
    deviceRoot.position.y + 1.2 + Math.sin(lightTime * 0.55) * 0.18,
    deviceRoot.position.z + 2.0 + Math.cos(orbit) * 0.3
  );
  lights.magenta.position.set(
    deviceRoot.position.x + 2.35 + Math.cos(orbit * 0.9) * 0.28,
    deviceRoot.position.y + 0.9 + Math.cos(lightTime * 0.5) * 0.16,
    deviceRoot.position.z + 1.25 + Math.sin(orbit) * 0.32
  );
  lights.blue.position.set(
    deviceRoot.position.x + Math.sin(orbit * 0.8) * 0.35,
    deviceRoot.position.y + 1.65 + Math.sin(lightTime * 0.45) * 0.16,
    deviceRoot.position.z - 2.25 + Math.cos(orbit * 0.8) * 0.3
  );
  lights.gold.position.y = deviceRoot.position.y - 0.55;

  lights.cyan.intensity = 3.0 + Math.sin(lightTime * 0.75) * 0.22;
  lights.magenta.intensity = 2.7 + Math.sin(lightTime * 0.68 + 2.1) * 0.2;
  lights.blue.intensity = 2.4 + Math.sin(lightTime * 0.62 + 4.2) * 0.18;
  lights.gold.intensity = 1.3 + Math.sin(lightTime * 0.8 + 1.2) * 0.12;

  renderLcd(lcd.purpil);
  renderLcd(lcd.violet);
  renderLcd(lcd.blue);
  updateTunerLabels();
  updateTunerStatus();
  updateButtonLabelPositions();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointerup', endSlideDrag);
canvas.addEventListener('pointercancel', endSlideDrag);
window.addEventListener('keydown', handleTyping);
window.addEventListener('resize', resize);
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  document.body.classList.add('auth-device-error', 'auth-device-fallback');
});

function beginLandingAuthTransition(mode = 'signin') {
  if (state.phase === 'loading' || state.phase === 'landingAnimationPlaying') {
    window.setTimeout(() => beginLandingAuthTransition(mode), 160);
    return;
  }
  if (state.phase !== 'assembled' || state.isTransitioning) return;
  if (document.body.classList.contains('auth-device-summoning')) return;

  state.authMode = mode;
  document.body.classList.add('auth-device-summoning');
  window.setTimeout(() => {
    document.body.classList.remove('auth-device-summoning');
    document.body.classList.add('auth-device-summoned');
    resize();
    window.requestAnimationFrame(() => {
      resize();
      if (state.phase === 'assembled') transitionTo('purple');
      window.requestAnimationFrame(resize);
    });
  }, 950);
}

document.getElementById('auth-hero-login')?.addEventListener('click', () => {
  beginLandingAuthTransition('signin');
});
document.getElementById('auth-focus-login')?.addEventListener('click', () => {
  beginLandingAuthTransition('signin');
});
document.getElementById('auth-hero-signup')?.addEventListener('click', () => {
  beginLandingAuthTransition('signup');
});
document.getElementById('auth-focus-signup')?.addEventListener('click', () => {
  beginLandingAuthTransition('signup');
});

setupTuner();
resize();
loadDevice().catch((error) => {
  window.authDeviceError = error?.message || String(error);
  setDeviceDataset({ Phase: 'error', Error: window.authDeviceError });
  document.body.classList.add('auth-device-error');
  console.error('Unable to load authentication device:', error);
});
requestAnimationFrame(animate);
