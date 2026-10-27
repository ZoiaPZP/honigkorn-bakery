// Experimental 3D cake preview for the cake builder (three.js, vendored in vendor/three).
// Everything is built from code: a naked layer cake with a slice that glides out onto a small
// plate, piped rosettes with fruit, chocolate drips / nut crumbs and a chocolate plaque.
// three.js is only loaded when WebGL works, "reduce motion" is off and the builder comes near
// the viewport; otherwise (or on any error) the rendered stills from cake-builder.js stay visible.

const preview = document.querySelector('.builder-preview');
const stage = document.querySelector('.cake-stage');
const mount = document.getElementById('cake-3d');
const resetButton = document.getElementById('cake-3d-reset');
const data = window.BakeryData;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const R = 1.3; // cake radius at Ø 26 cm (scene units)
const GAP = 0.9; // width of the slice (radians)
const GAP_CENTER = -0.62; // slice direction: front right (shape angle; world z = -sin)
const MAIN = [GAP_CENTER + GAP / 2, GAP_CENTER - GAP / 2 + Math.PI * 2];
const SLICE = [GAP_CENTER - GAP / 2, GAP_CENTER + GAP / 2];

// Layers bottom → top: sponge, cream, fruit layer (cream with fruit pieces), sponge, top cream.
const SPONGE_H = 0.3;
const CREAM_H = 0.1;
const FRUIT_H = 0.115;
const L_CREAM = SPONGE_H;
const L_FRUIT = L_CREAM + CREAM_H;
const L_SPONGE2 = L_FRUIT + FRUIT_H;
const L_TOP = L_SPONGE2 + SPONGE_H;
const TOP_BEVEL = 0.035;
const CREAM_TOP = L_TOP + TOP_BEVEL * 2 + 0.05;
const ROSETTE_Y = CREAM_TOP - 0.02;
const FRUIT_Y = CREAM_TOP + 0.22; // sits in the top of the rosette

const SMALL_PLATE = { angle: GAP_CENTER - 0.12, dist: 2.62, top: -0.026 }; // top = plate surface

let teardown = null;

// The chosen mode and the reason go to the console, so a fallback is never silent.
function logMode(mode, reason) {
  const text = '[cake-3d] mode: ' + mode + (reason ? ' – ' + reason : '');
  if (mode === 'stills' && !/reduced motion/.test(reason || '')) console.warn(text);
  else console.info(text);
}

// three.js r169 needs WebGL 2. The probe context is handed to the renderer later, so the page
// creates a single context (no throw-away probe that has to be lost again).
const CONTEXT_ATTRIBUTES = { antialias: true, alpha: true, powerPreference: 'high-performance' };
function createContext() {
  const canvas = document.createElement('canvas');
  let status = '';
  canvas.addEventListener('webglcontextcreationerror', function (e) { status = e.statusMessage || ''; });
  try {
    const gl = canvas.getContext('webgl2', CONTEXT_ATTRIBUTES);
    if (gl && !gl.isContextLost()) return { canvas: canvas, gl: gl };
  } catch (e) {
    status = status || String(e);
  }
  // Chrome blocks WebGL for a site after a GPU reset ("…was blocked") until it is restarted,
  // even when chrome://gpu reports hardware acceleration.
  return { error: 'WebGL 2 not available' + (status ? ' (' + status + ')' : '') };
}

function fallback(reason) {
  logMode('stills', reason instanceof Error ? 'error: ' + reason.message : reason);
  if (teardown) teardown();
  teardown = null;
  preview.classList.remove('is-3d', 'is-3d-ready', 'is-3d-touched');
}

function start() {
  if (reduceMotion.matches) {
    logMode('stills', 'reduced motion is on (prefers-reduced-motion: reduce)');
    return;
  }
  const context = createContext();
  if (context.error) {
    logMode('stills', context.error);
    return;
  }
  // Hide the stills right away (display: none keeps their lazy images from loading).
  preview.classList.add('is-3d');
  const io = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    Promise.all([
      import('../vendor/three/three.module.min.js'),
      import('../vendor/three/OrbitControls.js'),
      import('../vendor/three/RoomEnvironment.js')
    ]).then(function (mods) {
      teardown = build(mods[0], mods[1].OrbitControls, mods[2].RoomEnvironment, context);
      logMode('live 3D', 'WebGL 2');
    }).catch(fallback);
  }, { rootMargin: '400px 0px' });
  io.observe(stage);
}

if (preview && stage && mount && data) {
  start();
  reduceMotion.addEventListener('change', function (e) {
    if (e.matches) fallback('reduced motion was switched on');
  });
}

// ---------------------------------------------------------------------------
// Small math helpers

function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutBounce(t) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}
function rand(a, b) { return a + Math.random() * (b - a); }

// ---------------------------------------------------------------------------

function build(THREE, OrbitControls, RoomEnvironment, context) {
  const opts = data.cake;

  // ----- renderer -----
  const renderer = new THREE.WebGLRenderer(Object.assign({ canvas: context.canvas, context: context.gl }, CONTEXT_ATTRIBUTES));
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  mount.appendChild(canvas);

  const scene = new THREE.Scene();
  // Soft studio reflections (used lightly so the warm lights still dominate).
  let envTexture = null;
  function makeEnvironment() {
    // Rendered on the GPU, so it has to be rebuilt after a restored context.
    if (envTexture) envTexture.dispose();
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmrem.dispose();
  }
  makeEnvironment();
  scene.environmentIntensity = 0.38;

  // ----- camera + controls -----
  const camera = new THREE.PerspectiveCamera(30, 1.25, 0.1, 60);
  const TARGET = new THREE.Vector3(0.62, 0.45, 0.45);
  const HOME = new THREE.Spherical(8.7, 1.08, 0.12); // radius, polar, azimuth around TARGET
  camera.position.setFromSpherical(HOME).add(TARGET);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(TARGET);
  controls.enableZoom = false; // a wheel on the canvas must keep scrolling the page
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = 0.62; // never from below or straight from the top
  controls.maxPolarAngle = 1.3;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.update();
  // Vertical swipes scroll the page on phones; horizontal drags rotate the cake.
  canvas.style.touchAction = 'pan-y';

  // Auto-rotation pauses while hovering or dragging and resumes shortly after.
  let hovering = false;
  let dragging = false;
  let resumeTimer = 0;
  function pauseRotation() {
    controls.autoRotate = false;
    window.clearTimeout(resumeTimer);
  }
  function resumeRotationSoon(ms) {
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(function () {
      if (!hovering && !dragging) controls.autoRotate = true;
    }, ms);
  }
  function onEnter(e) { if (e.pointerType === 'mouse') { hovering = true; pauseRotation(); } }
  function onLeave(e) { if (e.pointerType === 'mouse') { hovering = false; resumeRotationSoon(1200); } }
  canvas.addEventListener('pointerenter', onEnter);
  canvas.addEventListener('pointerleave', onLeave);
  controls.addEventListener('start', function () {
    dragging = true;
    pauseRotation();
    preview.classList.add('is-3d-touched');
  });
  controls.addEventListener('end', function () {
    dragging = false;
    if (!hovering) resumeRotationSoon(2500);
  });

  // "↺" – glide back to the starting view.
  const sph = new THREE.Spherical();
  let resetFrom = null;
  let resetT = 1;
  function onReset() {
    sph.setFromVector3(camera.position.clone().sub(controls.target));
    resetFrom = { phi: sph.phi, theta: sph.theta };
    resetT = 0;
    controls.autoRotate = false;
    resumeRotationSoon(1800);
  }
  if (resetButton) resetButton.addEventListener('click', onReset);

  // ----- lights: warm studio key + fill + rim -----
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xd8bfa2, 0.75));
  const key = new THREE.DirectionalLight(0xffeedb, 2.4);
  key.position.set(3.2, 6, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); // "medium" quality – fine on phones
  key.shadow.camera.left = -3.6;
  key.shadow.camera.right = 3.6;
  key.shadow.camera.top = 3.6;
  key.shadow.camera.bottom = -3.6;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 16;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.target.position.set(0.5, 0, 0.4);
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xffe2cc, 0.6);
  fill.position.set(-5, 2.5, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff0dd, 1.2);
  rim.position.set(-1.5, 3.5, -5);
  scene.add(rim);

  // ----- procedural textures -----
  const textures = [];
  // 2D canvases stay on the CPU (willReadFrequently): drawing them on a GPU-backed canvas
  // competes with WebGL for the GPU, and heavy work there can make the browser reset the GPU
  // and block WebGL for the whole site.
  function context2d(c) { return c.getContext('2d', { willReadFrequently: true }); }
  function canvasTexture(w, h, draw, srgb) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(context2d(c), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    textures.push(t);
    return t;
  }

  // Sponge crumb: many small pores (holes) – colour map plus a matching bump map.
  const pores = [];
  for (let i = 0; i < 900; i++) {
    pores.push([Math.random(), Math.random(), 2 + Math.pow(Math.random(), 1.8) * 7, rand(0.6, 1.4), rand(0, Math.PI)]);
  }
  function drawPores(ctx, w, h, hole, rimColor) {
    pores.forEach(function (p) {
      ctx.save();
      ctx.translate(p[0] * w, p[1] * h);
      ctx.rotate(p[4]);
      if (rimColor) {
        ctx.fillStyle = rimColor;
        ctx.beginPath();
        ctx.ellipse(0.6, 0.8, p[2] * 1.25, p[2] * p[3] * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.ellipse(0, 0, p[2], p[2] * p[3], 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  // One blur pass over the finished texture (soft-edged pores read as crumb, not sand).
  // Never set ctx.filter per shape: that is one blur per pore. The texture is tiled 3×3 around
  // the blur so it still repeats seamlessly.
  function soften(ctx, w, h, px) {
    const pad = Math.ceil(px * 3);
    const tmp = document.createElement('canvas');
    tmp.width = w + pad * 2;
    tmp.height = h + pad * 2;
    const t = context2d(tmp);
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) t.drawImage(ctx.canvas, pad + x * w, pad + y * h);
    }
    ctx.filter = 'blur(' + px + 'px)';
    ctx.drawImage(tmp, -pad, -pad);
    ctx.filter = 'none';
  }
  const crumbMap = canvasTexture(512, 512, function (ctx, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    drawPores(ctx, w, h, 'rgba(120,82,48,0.2)', 'rgba(255,255,255,0.5)');
    soften(ctx, w, h, 1.4);
  });
  const crumbBump = canvasTexture(512, 512, function (ctx, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    drawPores(ctx, w, h, '#6a6a6a', null);
    soften(ctx, w, h, 2);
  }, false);
  crumbMap.repeat.set(1.5, 1.5);
  crumbBump.repeat.set(1.5, 1.5);

  // Cream: soft, blotchy unevenness for the bump map.
  const creamBump = canvasTexture(256, 256, function (ctx, w, h) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const r = rand(8, 26);
      const v = Math.random() < 0.5 ? 255 : 0;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(' + v + ',' + v + ',' + v + ',0.10)');
      g.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)');
      ctx.save();
      ctx.translate(Math.random() * w, Math.random() * h);
      ctx.fillStyle = g;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
  }, false);
  creamBump.repeat.set(1.5, 1.5);

  // Strawberry skin with seeds (lathe UV: u around, v from tip to top).
  const berrySkin = canvasTexture(512, 256, function (ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#c41f2e');
    g.addColorStop(0.75, '#da3540');
    g.addColorStop(1, '#ee8f7f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const rows = 9;
    const cols = 14;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + (r % 2) * 0.5) / cols * w;
        const y = (r + 0.6) / rows * h * 0.92;
        ctx.fillStyle = 'rgba(110,15,22,0.55)';
        ctx.beginPath();
        ctx.ellipse(x, y, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f4d47e';
        ctx.beginPath();
        ctx.ellipse(x, y, 3.2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // Soft contact shadows under the plates.
  const blobTex = canvasTexture(256, 256, function (ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(59,38,24,0.38)');
    g.addColorStop(0.6, 'rgba(59,38,24,0.12)');
    g.addColorStop(1, 'rgba(59,38,24,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // ----- materials -----
  const spongeMat = new THREE.MeshStandardMaterial({ map: crumbMap, bumpMap: crumbBump, bumpScale: 0.9, roughness: 0.95 });
  const creamProps = {
    roughness: 0.42, sheen: 0.6, sheenRoughness: 0.55, sheenColor: 0xffffff,
    clearcoat: 0.22, clearcoatRoughness: 0.5, bumpMap: creamBump, bumpScale: 0.35,
    emissive: 0xffffff, emissiveIntensity: 0.05 // keeps whipped cream white in the shade
  };
  const creamMat = new THREE.MeshPhysicalMaterial(creamProps);
  const fruitCreamMat = new THREE.MeshPhysicalMaterial(creamProps);
  const porcelainMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  const chocoMat = new THREE.MeshPhysicalMaterial({ color: 0x3b2015, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const forkMat = new THREE.MeshStandardMaterial({ color: 0xe6e1d8, metalness: 1, roughness: 0.22, envMapIntensity: 2.5 });
  const nutMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const fruitMats = {
    strawberry: new THREE.MeshPhysicalMaterial({ map: berrySkin, bumpMap: berrySkin, bumpScale: 0.5, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x67993a, roughness: 0.5, side: THREE.DoubleSide }),
    raspberry: new THREE.MeshPhysicalMaterial({ color: 0xc4254a, roughness: 0.32, clearcoat: 0.35, sheen: 0.5, sheenColor: 0xff8fa5, sheenRoughness: 0.5 }),
    raspberryCore: new THREE.MeshStandardMaterial({ color: 0x8a1a33, roughness: 0.7 }),
    cherry: new THREE.MeshPhysicalMaterial({ color: 0x9a1424, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }),
    stem: new THREE.MeshStandardMaterial({ color: 0x6f6a2c, roughness: 0.7 })
  };
  const chunkMats = {
    strawberry: new THREE.MeshPhysicalMaterial({ color: 0xe23e48, roughness: 0.3, clearcoat: 0.5 }),
    raspberry: new THREE.MeshPhysicalMaterial({ color: 0xc22a4c, roughness: 0.35, clearcoat: 0.4 }),
    cherry: new THREE.MeshPhysicalMaterial({ color: 0x6e0f1f, roughness: 0.22, clearcoat: 0.9 })
  };

  const target = { sponge: new THREE.Color(), cream: new THREE.Color(), fruitCream: new THREE.Color(), scale: 1 };

  // ----- geometry helpers -----
  // A cake layer as an extruded circle sector (or ring sector when `inner` is set).
  function sector(radius, height, a0, a1, bevel, inner) {
    const shape = new THREE.Shape();
    if (inner) {
      shape.absarc(0, 0, radius, a0, a1, false);
      shape.absarc(0, 0, inner, a1, a0, true);
    } else {
      shape.moveTo(0, 0);
      shape.absarc(0, 0, radius, a0, a1, false);
      shape.lineTo(0, 0);
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      curveSegments: Math.max(6, Math.round(Math.abs(a1 - a0) / (Math.PI * 2) * 96)),
      bevelEnabled: Boolean(bevel),
      bevelThickness: bevel || 0,
      bevelSize: bevel || 0,
      bevelSegments: 4
    });
    geo.rotateX(-Math.PI / 2); // extrusion now points up (+Y)
    return geo;
  }

  function lathe(points, segments) {
    const curve = new THREE.SplineCurve(points.map(function (p) { return new THREE.Vector2(p[0], p[1]); }));
    return new THREE.LatheGeometry(curve.getPoints(28), segments || 32);
  }

  // Merge indexed geometries with position/normal/uv (keeps draw calls down).
  function merge(geos) {
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    let offset = 0;
    geos.forEach(function (g) {
      const gp = g.attributes.position;
      pos.push.apply(pos, gp.array);
      nor.push.apply(nor, g.attributes.normal.array);
      uv.push.apply(uv, g.attributes.uv.array);
      const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx.push(gi[i] + offset);
      offset += gp.count;
      g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.setIndex(idx);
    return out;
  }

  // Slightly displaced icosphere for organic little pieces.
  function lumpy(radius, detail, amount) {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const p = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      v.multiplyScalar(1 + (Math.sin(v.x * 91) * Math.cos(v.y * 77) + Math.sin(v.z * 63)) * amount);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Shape angle → world offset on the cake (see sector(): shape Y becomes -Z).
  function polarX(r, a) { return Math.cos(a) * r; }
  function polarZ(r, a) { return -Math.sin(a) * r; }

  // ----- shared decoration geometry -----
  const rosetteGeo = (function () {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push([0.2 * Math.pow(1 - t, 0.7) * (1 + 0.28 * Math.sin(Math.PI * t)), 0.27 * t]);
    }
    const geo = lathe(pts, 64);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // Star-tip ridges with a twist.
      const x = p.getX(i);
      const z = p.getZ(i);
      const k = 1 + 0.17 * Math.cos(9 * Math.atan2(z, x) + p.getY(i) * 18);
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
    geo.computeVertexNormals();
    return geo;
  })();

  const calyxGeo = (function () {
    const leaf = new THREE.Shape();
    leaf.moveTo(0, 0);
    leaf.quadraticCurveTo(0.05, 0.07, 0, 0.16);
    leaf.quadraticCurveTo(-0.05, 0.07, 0, 0);
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.ShapeGeometry(leaf, 6);
      g.rotateX(-Math.PI / 2 + 0.6); // almost flat, tips lifted so they show
      g.rotateY((i / 7) * Math.PI * 2);
      parts.push(g);
    }
    return merge(parts);
  })();

  const strawberryGeo = lathe([[0, 0], [0.035, 0.02], [0.07, 0.07], [0.098, 0.13], [0.108, 0.18], [0.095, 0.22], [0.06, 0.245], [0, 0.25]], 40);
  strawberryGeo.rotateX(Math.PI); // tip up, calyx resting in the cream
  strawberryGeo.translate(0, 0.25, 0);
  const drupeGeo = new THREE.SphereGeometry(0.026, 10, 8);
  const raspberryCoreGeo = lathe([[0, 0.17], [0.05, 0.165], [0.08, 0.12], [0.085, 0.05], [0.07, 0]], 20);
  const cherryGeo = lathe([[0, 0], [0.055, 0.006], [0.09, 0.035], [0.102, 0.08], [0.095, 0.125], [0.068, 0.155], [0.03, 0.158], [0, 0.146]], 36);
  const stemGeo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0.145, 0), new THREE.Vector3(0.01, 0.32, 0), new THREE.Vector3(0.09, 0.43, 0.02)
  ), 16, 0.008, 6);

  // Parts of one fruit relative to its base point – reused for every berry.
  const M4 = THREE.Matrix4;
  const drupeLocals = (function () {
    const out = [];
    const rings = 6;
    for (let r = 0; r <= rings; r++) {
      const t = r / rings;
      const yy = 0.015 + t * 0.165;
      const rad = 0.09 * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.4))) + 0.012;
      const count = Math.max(1, Math.round((rad * Math.PI * 2) / 0.05));
      for (let k = 0; k < count; k++) {
        const a = (k + (r % 2) * 0.5) / count * Math.PI * 2;
        out.push(new M4().makeScale(1, 1.08, 1).setPosition(Math.cos(a) * rad, yy, Math.sin(a) * rad));
      }
    }
    return out;
  })();
  const FRUIT_PARTS = {
    strawberry: [
      { geo: strawberryGeo, mat: fruitMats.strawberry, locals: [new M4()] },
      { geo: calyxGeo, mat: fruitMats.leaf, locals: [new M4().makeTranslation(0, 0.012, 0)] }
    ],
    raspberry: [
      { geo: raspberryCoreGeo, mat: fruitMats.raspberryCore, locals: [new M4()] },
      { geo: drupeGeo, mat: fruitMats.raspberry, locals: drupeLocals }
    ],
    cherry: [
      { geo: cherryGeo, mat: fruitMats.cherry, locals: [new M4()] },
      { geo: stemGeo, mat: fruitMats.stem, locals: [new M4()] }
    ]
  };

  const chunkGeos = {
    strawberry: (function () { const g = lumpy(0.045, 1, 0.08); g.scale(1, 0.72, 0.85); return g; })(),
    raspberry: lumpy(0.036, 1, 0.14),
    cherry: (function () { const g = new THREE.SphereGeometry(0.038, 14, 10); g.scale(1, 0.85, 1); return g; })()
  };
  const nutGeo = lumpy(0.016, 0, 0.12);
  const dripGeo = new THREE.CapsuleGeometry(0.022, 0.12, 4, 10);
  const DRIP_HALF = 0.022 + 0.06;

  // ----- instanced placement on the cake (follows the size) -----
  // items: { r: radius relative to R, dr: extra radius, a: shape angle, y, rot: Euler, s: scale,
  //          sy: extra y-scale, hang: y is the top of a drip that grows downwards }
  const tmpM = new M4();
  const tmpQ = new THREE.Quaternion();
  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  function placed(geo, mat, items) {
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    let lastKey = '';
    return {
      mesh: mesh,
      update: function (scale, grow) {
        const key = scale.toFixed(4) + '|' + grow.toFixed(3);
        if (key === lastKey) return;
        lastKey = key;
        mesh.visible = grow > 0.001;
        if (!mesh.visible) return;
        items.forEach(function (it, i) {
          const rr = it.r * R * scale + (it.dr || 0);
          const sy = (it.sy || 1) * (it.hang ? grow : 1);
          const s = it.s * (it.hang ? 1 : grow);
          tmpP.set(polarX(rr, it.a), it.hang ? it.y - DRIP_HALF * sy : it.y, polarZ(rr, it.a));
          tmpQ.setFromEuler(it.rot);
          tmpM.compose(tmpP, tmpQ, tmpS.set(s, s * sy, s));
          mesh.setMatrixAt(i, tmpM);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    };
  }

  // Fruits on the rosettes: one InstancedMesh per fruit part (berries × local parts).
  function fruitTop(type, spots) {
    const parts = FRUIT_PARTS[type].map(function (part) {
      const mesh = new THREE.InstancedMesh(part.geo, part.mat, spots.length * part.locals.length);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      return { mesh: mesh, locals: part.locals };
    });
    const tilt = spots.map(function () { return new THREE.Euler(rand(-0.12, 0.12), rand(0, Math.PI * 2), rand(-0.12, 0.12)); });
    const world = new M4();
    const q = new THREE.Quaternion();
    let lastKey = '';
    return {
      parts: parts,
      update: function (scale, drop) {
        const key = scale.toFixed(4) + '|' + drop.toFixed(3);
        if (key === lastKey) return;
        lastKey = key;
        parts.forEach(function (part) { part.mesh.visible = drop >= 0; });
        if (drop < 0) return;
        const k = 0.82 + 0.18 * scale;
        spots.forEach(function (sp, i) {
          // Each berry drops a little after the previous one, with a soft bounce.
          const t = Math.min(1, Math.max(0, drop * 1.6 - i * 0.06));
          const yy = FRUIT_Y + (1 - easeOutBounce(t)) * 0.75;
          q.setFromEuler(tilt[i]);
          world.compose(tmpP.set(polarX(sp.r * R * scale, sp.a), yy, polarZ(sp.r * R * scale, sp.a)), q, tmpS.set(k, k, k));
          parts.forEach(function (part) {
            part.locals.forEach(function (local, j) {
              part.mesh.setMatrixAt(i * part.locals.length + j, tmpM.multiplyMatrices(world, local));
            });
          });
        });
        parts.forEach(function (part) { part.mesh.instanceMatrix.needsUpdate = true; });
      }
    };
  }

  // ----- one cake piece (the cake itself or the slice) -----
  function piece(a0, a1, rosetteCount) {
    const group = new THREE.Group();
    const body = new THREE.Group(); // scaled in X/Z by the size; the height stays the same
    group.add(body);
    const arc = a1 - a0;

    function layer(mat, y, h, radius) {
      const m = new THREE.Mesh(sector(R * radius, h, a0, a1), mat);
      m.position.y = y;
      m.castShadow = true;
      m.receiveShadow = true;
      body.add(m);
      return m;
    }
    layer(spongeMat, 0, SPONGE_H, 1);
    layer(creamMat, L_CREAM, CREAM_H, 1.012);
    layer(fruitCreamMat, L_FRUIT, FRUIT_H, 1.006);
    layer(spongeMat, L_SPONGE2, SPONGE_H, 1);
    const top = new THREE.Mesh(sector(R * 0.985, 0.05, a0, a1, TOP_BEVEL), creamMat);
    top.position.y = L_TOP + TOP_BEVEL;
    top.castShadow = true;
    top.receiveShadow = true;
    body.add(top);

    // Chocolate rim the drips hang from (shown for "Schoko").
    const dripRing = new THREE.Mesh(sector(R * 1.022, 0.055, a0, a1, 0.012, R * 0.975), chocoMat);
    dripRing.position.y = L_TOP + 0.05;
    dripRing.castShadow = true;
    body.add(dripRing);

    // Fruit pieces in the fruit layer: along both cut faces and around the outer side.
    const chunkItems = [];
    const fy0 = L_FRUIT + 0.028;
    const fy1 = L_FRUIT + FRUIT_H - 0.028;
    function chunk(r, a) {
      chunkItems.push({ r: r, a: a, y: rand(fy0, fy1), rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)), s: rand(0.8, 1.2) });
    }
    [a0, a1].forEach(function (edge, side) {
      for (let r = 0.12; r < 0.95; r += 0.085) chunk(r, edge + (side === 0 ? 1 : -1) * (0.012 / (r * R)));
    });
    const outerCount = Math.round((arc * R) / 0.1);
    for (let i = 0; i < outerCount; i++) chunk(0.992, a0 + (i + rand(0.2, 0.8)) / outerCount * arc);
    const chunks = {};
    Object.keys(chunkGeos).forEach(function (type) {
      chunks[type] = placed(chunkGeos[type], chunkMats[type], chunkItems);
      group.add(chunks[type].mesh);
    });

    // Nut crumbs on the lower sides (shown for "Nuss").
    const nutItems = [];
    const nutCount = Math.round(arc * R * 34);
    for (let i = 0; i < nutCount; i++) {
      nutItems.push({ r: 1, dr: 0.004, a: a0 + Math.random() * arc, y: 0.012 + Math.pow(Math.random(), 1.9) * 0.3, rot: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)), s: rand(0.6, 1.5) });
    }
    const nuts = placed(nutGeo, nutMat, nutItems);
    const nutColors = [0xb8844f, 0xd2a46c, 0x9a6a3c, 0xe2bf8a];
    const col = new THREE.Color();
    nutItems.forEach(function (_, i) { nuts.mesh.setColorAt(i, col.set(nutColors[i % nutColors.length])); });
    group.add(nuts.mesh);

    // Chocolate drips hanging from the rim (shown for "Schoko").
    const dripItems = [];
    const dripCount = Math.round((arc * R) / 0.085);
    for (let i = 0; i < dripCount; i++) {
      dripItems.push({ r: 1, dr: 0.012, a: a0 + (i + 0.5) / dripCount * arc, y: L_TOP + 0.09, hang: true, rot: new THREE.Euler(), s: 1, sy: rand(0.45, 1.9) });
    }
    const drips = placed(dripGeo, chocoMat, dripItems);
    group.add(drips.mesh);

    // Rosettes along the top edge, a fruit on each.
    const spots = [];
    const pad = rosetteCount > 1 ? 0.17 : 0;
    for (let i = 0; i < rosetteCount; i++) {
      const t = rosetteCount > 1 ? i / (rosetteCount - 1) : 0.5;
      spots.push({ r: 0.79, a: a0 + pad + (arc - pad * 2) * t });
    }
    const rosettes = placed(rosetteGeo, creamMat, spots.map(function (s) {
      return { r: s.r, a: s.a, y: ROSETTE_Y, rot: new THREE.Euler(0, rand(0, 6), 0), s: 1 };
    }));
    group.add(rosettes.mesh);
    const fruits = {};
    Object.keys(FRUIT_PARTS).forEach(function (type) {
      fruits[type] = fruitTop(type, spots);
      fruits[type].parts.forEach(function (p) { group.add(p.mesh); });
    });

    return { group: group, body: body, chunks: chunks, nuts: nuts, drips: drips, dripRing: dripRing, rosettes: rosettes, fruits: fruits };
  }

  // ----- scene: plates, cake, slice, fork -----
  function plate(radius, rimH) {
    const r = radius;
    const m = new THREE.Mesh(lathe([[0, -rimH], [r * 0.9, -rimH], [r * 0.985, -rimH * 0.55], [r, -rimH * 0.05], [r * 0.95, 0.005], [r * 0.82, 0], [0, 0]], 96), porcelainMat);
    m.receiveShadow = true;
    m.castShadow = true;
    return m;
  }
  function blob(size, x, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, -0.072, z);
    scene.add(m);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.16, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.076;
  ground.receiveShadow = true;
  scene.add(ground);

  scene.add(plate(1.62, 0.07));
  blob(4.2, 0, 0);

  const sp = { x: polarX(SMALL_PLATE.dist, SMALL_PLATE.angle), z: polarZ(SMALL_PLATE.dist, SMALL_PLATE.angle) };
  const smallPlate = plate(0.92, 0.045);
  smallPlate.position.set(sp.x, SMALL_PLATE.top - 0.005, sp.z); // rests on the ground plane
  scene.add(smallPlate);
  blob(2.1, sp.x, sp.z);

  const fork = (function () {
    // Top-view outline (x = length, tines towards +x), extruded thin and laid flat.
    const o = new THREE.Shape();
    o.moveTo(-0.6, -0.045);
    o.quadraticCurveTo(-0.67, 0, -0.6, 0.045);
    o.lineTo(-0.05, 0.018);
    o.quadraticCurveTo(0.06, 0.02, 0.12, 0.0955);
    const TINE = 0.032;
    const GAP = 0.021;
    for (let i = 0; i < 4; i++) {
      const top = 0.0955 - i * (TINE + GAP);
      const bottom = top - TINE;
      o.lineTo(0.34, top);
      o.quadraticCurveTo(0.375, top - TINE / 2, 0.34, bottom);
      if (i < 3) {
        o.lineTo(0.16, bottom);
        o.quadraticCurveTo(0.15, bottom - GAP / 2, 0.16, bottom - GAP);
      }
    }
    o.lineTo(0.12, -0.0955);
    o.quadraticCurveTo(0.06, -0.02, -0.05, -0.018);
    o.lineTo(-0.6, -0.045);
    const geo = new THREE.ExtrudeGeometry(o, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, forkMat);
    m.castShadow = true;
    return m;
  })();
  // Lying on the small plate, in front of the slice.
  function placeSmallPlate(s) {
    // Grows with the cake so the 26 cm slice still fits on the plate.
    const k = 0.75 + 0.3 * s;
    smallPlate.scale.set(k, 1, k);
    fork.position.set(sp.x + 0.1 * k, SMALL_PLATE.top + 0.002, sp.z + 0.58 * k);
  }
  fork.rotation.set(0, 0.25, 0);
  scene.add(fork);

  const cake = piece(MAIN[0], MAIN[1], 10);
  const slice = piece(SLICE[0], SLICE[1], 1);
  scene.add(cake.group, slice.group);
  const pieces = [cake, slice];

  // ----- chocolate plaque with the inscription -----
  const plaque = new THREE.Group(); // turns (yaw) towards the camera so it stays readable
  plaque.visible = false;
  scene.add(plaque);
  const plaqueTilt = new THREE.Group(); // stands up, leaning back a little, pushed into the cream
  plaqueTilt.rotation.x = Math.PI / 2 - 0.28;
  plaque.add(plaqueTilt);
  let plaqueBody = null;
  let plaqueText = null;
  const PX_PER_UNIT = 640;

  function rounded(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }

  function splitLines(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return [text];
    const words = text.split(' ');
    if (words.length < 2) return [text];
    let best = [text];
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const diff = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
      if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
    }
    return best;
  }

  function setInscription(text) {
    plaque.visible = Boolean(text);
    if (!text) return;
    const font = function (px) { return 'italic 400 ' + px + 'px Fraunces, Georgia, serif'; };
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font(100);
    const lines = splitLines(probe, text, 900);
    const widest = Math.max.apply(null, lines.map(function (l) { return probe.measureText(l).width; }));
    const w = Math.min(1.4, Math.max(0.62, widest / 100 * 0.1 + 0.3));
    const h = lines.length === 1 ? 0.32 : 0.48;
    plaqueTilt.position.y = h / 2 - 0.04; // lower edge sits in the cream

    if (plaqueBody) { plaqueBody.geometry.dispose(); plaqueTilt.remove(plaqueBody); }
    if (plaqueText) { plaqueText.geometry.dispose(); plaqueText.material.map.dispose(); plaqueText.material.dispose(); plaqueTilt.remove(plaqueText); }

    const geo = new THREE.ExtrudeGeometry(rounded(w, h, 0.07), { depth: 0.035, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 4, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2);
    plaqueBody = new THREE.Mesh(geo, chocoMat);
    plaqueBody.castShadow = true;
    plaqueTilt.add(plaqueBody);

    const tex = canvasTexture(Math.round(w * PX_PER_UNIT), Math.round(h * PX_PER_UNIT), function (ctx, cw, ch) {
      // Thin piped border, then the inscription in light Fraunces italic.
      const inset = ch * 0.1;
      ctx.strokeStyle = 'rgba(246,227,190,0.55)';
      ctx.lineWidth = Math.max(2, ch * 0.018);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(inset, inset, cw - inset * 2, ch - inset * 2, ch * 0.12);
      else ctx.rect(inset, inset, cw - inset * 2, ch - inset * 2);
      ctx.stroke();
      let px = Math.min(ch * (lines.length === 1 ? 0.46 : 0.32), 120);
      ctx.font = font(px);
      const fit = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }));
      if (fit > cw * 0.8) px *= (cw * 0.8) / fit;
      ctx.font = font(px);
      ctx.fillStyle = '#f7e6c4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach(function (l, i) {
        ctx.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * px * 1.12);
      });
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.45 }));
    label.rotation.x = -Math.PI / 2;
    label.position.y = 0.035 + 0.0145;
    plaqueText = label;
    plaqueTilt.add(label);
  }

  // ----- state driven by the builder -----
  let current = {};
  const anim = {
    fruit: null, fruitDrop: 1,
    chunkType: null, chunk: 1,
    drip: 0, dripTarget: 0,
    nut: 0, nutTarget: 0,
    slice: 0, sliceDir: 0, sliceDelay: 0
  };

  function playSlice(delay) {
    anim.sliceDir = anim.slice > 0 ? -1 : 1; // slide back in first, then out again
    anim.sliceDelay = delay || 0;
  }

  function apply(cfg, initial) {
    if (!cfg) return;
    const sponge = data.findById(opts.sponges, cfg.sponge);
    const cream = data.findById(opts.creams, cfg.cream);
    const filling = data.findById(opts.fillings, cfg.filling);
    if (sponge) target.sponge.set(sponge.color);
    if (cream) target.cream.set(cream.color);
    // The fruit layer is cream with a hint of the fruit's colour.
    target.fruitCream.copy(target.cream);
    if (filling && filling.color) target.fruitCream.lerp(new THREE.Color(filling.color), 0.16);
    target.scale = (Number(cfg.size) || 26) / 26;
    anim.dripTarget = cfg.sponge === 'chocolate' ? 1 : 0;
    anim.nutTarget = cfg.sponge === 'nut' ? 1 : 0;

    if (cfg.filling !== current.filling) {
      anim.fruit = FRUIT_PARTS[cfg.filling] ? cfg.filling : null;
      anim.chunkType = anim.fruit;
      anim.fruitDrop = initial ? 1 : 0;
      anim.chunk = initial ? 1 : 0;
    }
    if (cfg.text !== current.text) setInscription(cfg.text);

    const changed = ['size', 'sponge', 'cream', 'filling'].some(function (k) { return cfg[k] !== current[k]; });
    if (changed && !initial) playSlice(0.25);
    current = Object.assign({}, cfg);
  }

  apply(window.CakeBuilder && window.CakeBuilder.config(), true);
  spongeMat.color.copy(target.sponge);
  creamMat.color.copy(target.cream);
  fruitCreamMat.color.copy(target.fruitCream);
  anim.drip = anim.dripTarget;
  anim.nut = anim.nutTarget;
  let scale = target.scale;
  playSlice(0.6); // first appearance: the slice glides out once the canvas is visible

  function onChange(e) { apply(e.detail, false); }
  document.addEventListener('app:cake-change', onChange);

  // Redraw the plaque once Fraunces is ready (the first draw may use the fallback font).
  if (document.fonts && document.fonts.load) {
    document.fonts.load('italic 400 64px Fraunces').then(function () {
      if (current.text) setInscription(current.text);
    }).catch(function () {});
  }

  // ----- per-frame updates -----
  const SLICE_END_ROT = 0.85;
  const centroid = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  function updateSlice(dt) {
    if (anim.sliceDelay > 0) { anim.sliceDelay -= dt; return; }
    if (anim.sliceDir < 0) {
      anim.slice = Math.max(0, anim.slice - dt / 0.35);
      if (anim.slice === 0) anim.sliceDir = 1;
    } else if (anim.sliceDir > 0) {
      anim.slice = Math.min(1, anim.slice + dt / 1.15);
      if (anim.slice === 1) anim.sliceDir = 0;
    }
    const e = easeInOut(anim.slice);
    // Final pose: turned so a cut face looks at the viewer, centroid over the small plate.
    centroid.set(polarX(0.6 * R * scale, GAP_CENTER), 0, polarZ(0.6 * R * scale, GAP_CENTER)).applyAxisAngle(UP, SLICE_END_ROT);
    const ex = sp.x - centroid.x;
    const ez = sp.z - centroid.z;
    slice.group.position.set(ex * e, SMALL_PLATE.top * e + Math.sin(Math.PI * e) * 0.32, ez * e);
    slice.group.rotation.y = SLICE_END_ROT * e;
  }

  function approach(v, t, dt, rate) {
    return Math.abs(t - v) < 0.002 ? t : v + (t - v) * (1 - Math.exp(-dt * rate));
  }

  const camPos = new THREE.Vector3();
  const camOffset = new THREE.Vector3();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.exp(-dt * 8); // colours settle in ≈ 0.4 s

    spongeMat.color.lerp(target.sponge, k);
    creamMat.color.lerp(target.cream, k);
    fruitCreamMat.color.lerp(target.fruitCream, k);
    scale = approach(scale, target.scale, dt, 5);
    placeSmallPlate(scale);
    anim.drip = approach(anim.drip, anim.dripTarget, dt, 5);
    anim.nut = approach(anim.nut, anim.nutTarget, dt, 6);
    if (anim.chunk < 1) anim.chunk = Math.min(1, anim.chunk + dt / 0.5);
    if (anim.fruitDrop < 1) anim.fruitDrop = Math.min(1, anim.fruitDrop + dt / 1.1);

    pieces.forEach(function (p) {
      p.body.scale.set(scale, 1, scale);
      p.dripRing.visible = anim.drip > 0.01;
      p.dripRing.scale.y = Math.max(anim.drip, 0.001);
      p.drips.update(scale, anim.drip);
      p.nuts.update(scale, anim.nut);
      Object.keys(p.chunks).forEach(function (type) {
        p.chunks[type].update(scale, type === anim.chunkType ? easeOutBounce(anim.chunk) : 0);
      });
      p.rosettes.update(scale, 1);
      Object.keys(p.fruits).forEach(function (type) {
        p.fruits[type].update(scale, type === anim.fruit ? anim.fruitDrop : -1);
      });
    });
    updateSlice(dt);

    if (plaque.visible) {
      camera.getWorldPosition(camPos);
      let diff = Math.atan2(camPos.x, camPos.z) - plaque.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      plaque.rotation.y += diff * (1 - Math.exp(-dt * 3));
      plaque.position.y = CREAM_TOP;
      plaque.scale.setScalar(Math.max(0.86, scale));
    }

    // Camera: reset glide, distance per screen size and (a little) per cake size.
    sph.setFromVector3(camOffset.copy(camera.position).sub(controls.target));
    if (resetT < 1) {
      resetT = Math.min(1, resetT + dt / 0.7);
      const e = easeInOut(resetT);
      let dTheta = HOME.theta - resetFrom.theta;
      dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
      sph.theta = resetFrom.theta + dTheta * e;
      sph.phi = resetFrom.phi + (HOME.phi - resetFrom.phi) * e;
    }
    sph.radius = HOME.radius * (narrow ? 1.04 : 1) * (1 - 0.22 * (1 - scale));
    camera.position.setFromSpherical(sph).add(controls.target);

    controls.update(dt);
    renderer.render(scene, camera);
    watchPerformance(dt);
    if (!preview.classList.contains('is-3d-ready')) preview.classList.add('is-3d-ready');
  }

  // If a phone can't keep up, drop the resolution once (shadows stay on).
  let perfFrames = 0;
  let perfTime = 0;
  function watchPerformance(dt) {
    if (perfFrames < 0) return;
    perfFrames++;
    if (perfFrames > 20) perfTime += dt;
    if (perfFrames === 110) {
      if (perfTime / 90 > 0.024 && pixelRatio > 1.25) {
        pixelRatio = 1.25;
        renderer.setPixelRatio(pixelRatio);
        resize();
      }
      perfFrames = -1;
    }
  }

  // ----- render loop (only while visible and the tab is active) -----
  const clock = new THREE.Clock();
  let running = false;
  let visible = false;
  let narrow = false;

  function resize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    narrow = w < 480;
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) {
      clock.getDelta(); // drop the paused time
      renderer.setAnimationLoop(tick);
    } else {
      renderer.setAnimationLoop(null);
    }
  }
  let disposed = false;
  function sync() { setRunning(!disposed && visible && !document.hidden); }

  const io = new IntersectionObserver(function (entries) {
    visible = entries[entries.length - 1].isIntersecting;
    sync();
  }, { rootMargin: '100px 0px' });
  io.observe(stage);
  document.addEventListener('visibilitychange', sync);
  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  resize();

  // A lost context (GPU reset, driver update, too many contexts) is usually restored by the
  // browser: show the stills meanwhile and only give up if it does not come back.
  let lostTimer = 0;
  function onContextLost(e) {
    e.preventDefault();
    renderer.setAnimationLoop(null);
    running = false;
    preview.classList.remove('is-3d', 'is-3d-ready');
    logMode('stills', 'WebGL context lost' + (e.statusMessage ? ' (' + e.statusMessage + ')' : '') + ', waiting for the browser to restore it');
    lostTimer = window.setTimeout(function () {
      fallback('WebGL context lost and not restored');
    }, 5000);
  }
  function onContextRestored() {
    window.clearTimeout(lostTimer);
    // Re-upload the canvas textures and recompile the materials on the new context.
    textures.forEach(function (t) { t.needsUpdate = true; });
    scene.traverse(function (o) {
      if (o.material) o.material.needsUpdate = true;
    });
    makeEnvironment();
    preview.classList.add('is-3d');
    sync();
    logMode('live 3D', 'WebGL context restored');
  }
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  // ----- cleanup when falling back to the stills -----
  return function dispose() {
    disposed = true;
    setRunning(false);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('app:cake-change', onChange);
    if (resetButton) resetButton.removeEventListener('click', onReset);
    window.clearTimeout(resumeTimer);
    window.clearTimeout(lostTimer);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    controls.dispose();
    scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    textures.forEach(function (t) { t.dispose(); });
    envTexture.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
