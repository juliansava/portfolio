// Viewer del loft: viste, piante con taglio, sezione, metro, passeggiata.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildScene } from './scene.js';
import { S, roofY } from './survey.js';
import { planCaps, sectionCaps, sectionCapsX, pocheMaterial, pocheLightMaterial } from './viewer/caps.js';
import { setPlaster } from './lib/materials.js';
import { buildAnnotations } from './viewer/annotations.js';
import { MeasureTool } from './viewer/measure.js';
import { Walker } from './viewer/walk.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const STATIC = params.has('static');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

const L = S.totalLength / 100;
const D = S.depth / 100;
const T = S.wallT / 100;
const GL = S.ground.level / 100;

// ---------------------------------------------------------------------------
// Renderer

const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: STATIC });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const labelRenderer = new CSS2DRenderer({ element: $('#labels') });

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 300);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !STATIC;
controls.dampingFactor = 0.12;

// ---------------------------------------------------------------------------
// Viste

const VIEWS = {
  // direzione di osservazione da sud-est, distanza calcolata per inquadrare tutto
  axo: { kind: 'orbit', dir: [0.62, 0.52, 0.59], box: [[-0.5, -4.2, -0.5], [11.45, 6.3, 5.5]], vfov: 36 },
  planEntry: { kind: 'plan', cut: S.ground.level + 140, base: GL },
  planGround: { kind: 'plan', cut: 140, base: 0 },
  planMezz: { kind: 'plan', cut: 450, base: 3.3 },
  section: { kind: 'section', z: 256 },
  sectionX: { kind: 'section', x: 575 },
  // Pose ricavate confrontando i render con le foto (obiettivo grandangolare)
  p1: { kind: 'photo', pos: [2.2, 1.3, 3.95], target: [8.7, 1.5, 2.9], hfov: 100 },
  p2: { kind: 'photo', pos: [7.75, 1.3, 1.8], target: [8.1, 1.15, 5.0], hfov: 100 },
  p3: { kind: 'photo', pos: [7.75, 1.35, 3.55], target: [0, 1.35, 3.55], hfov: 100 },
  p4: { kind: 'photo', pos: [4.0, 1.2, 3.3], target: [0, 1.5, 0.8], hfov: 96 },
  m1: { kind: 'photo', pos: [0.7, 4.9, 0.6], target: [8, 3.6, 3.2], hfov: 108 },
  m2: { kind: 'photo', pos: [8.4, 4.9, 0.6], target: [1, 2.8, 4.2], hfov: 108 },
  // foto 6 (ingresso, piano terra ipotizzato) e foto 7 (posa ricostruita)
  p6: { kind: 'photo', pos: [0.55, GL + 1.55, 4.88], target: [1.45, GL + 1.95, 1.6], hfov: 100 },
  p7: { kind: 'photo', pos: [6.9, 1.75, 2.86], target: [5.91, 1.58, 3.01], hfov: 95 },
};
// nomi usati nelle versioni precedenti
const ALIASES = { plan0: 'planEntry', plan1: 'planGround', plan2: 'planMezz' };

const state = {
  view: 'axo',
  kind: 'orbit',
  toggles: { roof: true, mezz: true, furn: true, labels: false, ao: !coarse },
  scenario: params.get('scenario') === 'current' ? 'current' : 'project',
  light: 'day',
  tool: null, // 'measure' | 'walk'
  hfov: null,
};

let W; // mondo costruito
let tween = null;
let needsRender = true;
const requestRender = () => (needsRender = true);
controls.addEventListener('change', requestRender);

function panelOffset() {
  if (window.__fullFrame) return 0;
  const panel = $('#panel');
  if (state.tool === 'walk' || window.innerWidth <= 720 || panel.hidden) return 0;
  const r = panel.getBoundingClientRect();
  return Math.round((r.right + 8) / 2);
}

function visibleAspect() {
  const w = window.innerWidth - panelOffset() * 2;
  return Math.max(0.3, w / window.innerHeight);
}

function applyProjection() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  const off = panelOffset();
  if (off) camera.setViewOffset(w + 2 * off, h, 0, 0, w, h);
  else camera.clearViewOffset();
  if (state.hfov) {
    const a = visibleAspect();
    const v = (2 * Math.atan(Math.tan((state.hfov * Math.PI) / 360) / a) * 180) / Math.PI;
    camera.fov = Math.min(100, Math.max(45, v));
  }
  camera.updateProjectionMatrix();
  requestRender();
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
  }
  applyProjection();
}

// Occlusione ambientale (GTAO): scurisce angoli e contatti, dà profondità.
let composer = null;
let gtao = null;
function setupComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(W.scene, camera));
  gtao = new GTAOPass(W.scene, camera, window.innerWidth, window.innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.2, thickness: 1.2, scale: 1.1, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
}

function draw() {
  if (state.toggles.ao && composer) composer.render();
  else renderer.render(W.scene, camera);
  labelRenderer.render(W.scene, camera);
}
window.addEventListener('resize', resize);

// Distanza della camera per inquadrare un rettangolo w × h (m).
function fitDistance(w, h, vfov) {
  const t = Math.tan((vfov * Math.PI) / 360);
  return Math.max(h / 2 / t, w / 2 / (t * visibleAspect())) * 1.06;
}

// Distanza per inquadrare un parallelepipedo (m) visto lungo dir, tenendo
// conto del pannello che copre la parte sinistra della vista.
function fitBox(min, max, dir, vfov) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const cam = new THREE.PerspectiveCamera(vfov, w / h, 0.05, 300);
  const off = panelOffset();
  if (off) cam.setViewOffset(w + 2 * off, h, 0, 0, w, h);
  cam.updateProjectionMatrix();
  const target = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  const corners = [];
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners.push(new THREE.Vector3(x, y, z));
  const left = -1 + (4 * off) / w + 0.05;
  const p = new THREE.Vector3();
  let lo = 1;
  let hi = 120;
  for (let i = 0; i < 30; i++) {
    const d = (lo + hi) / 2;
    cam.position.copy(target).addScaledVector(dir, d);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    const ok = corners.every((c) => {
      p.copy(c).project(cam);
      return p.x > left && p.x < 0.95 && Math.abs(p.y) < 0.92;
    });
    if (ok) hi = d;
    else lo = d;
  }
  return { target, d: hi };
}

function setView(name, { animate = true } = {}) {
  const v = VIEWS[name];
  if (!v) return;
  if (state.tool === 'walk') W.walker.exit();
  state.view = name;
  state.kind = v.kind;
  $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  // in piante e sezioni le quote si accendono da sole; tornando al 3D si
  // ripristina la scelta precedente
  const flatView = v.kind === 'plan' || v.kind === 'section';
  if (flatView && !state.toggles.labels) {
    state.toggles.labels = true;
    state.labelsAuto = true;
  } else if (!flatView && state.labelsAuto) {
    state.toggles.labels = false;
    state.labelsAuto = false;
  }
  $('#t-labels').checked = state.toggles.labels;
  configureCut(v);
  configureControls(v.kind);

  let pos;
  let target;
  let fov = camera.fov;
  state.hfov = v.hfov || null;
  if (v.kind === 'plan') {
    fov = 30;
    const narrow = window.innerWidth <= 720;
    const d = fitDistance(L + (narrow ? 3.4 : 3.0), D + 2.3, fov);
    target = new THREE.Vector3(L / 2, v.base, D / 2);
    pos = new THREE.Vector3(L / 2, v.base + d, D / 2 + 0.0001);
  } else if (v.kind === 'section' && v.x) {
    fov = 24;
    const d = fitDistance(D + 3.8, 11.8, fov);
    target = new THREE.Vector3(v.x / 100, 1.1, D / 2 + 0.5);
    pos = new THREE.Vector3(v.x / 100 + d, 1.1, D / 2 + 0.5);
  } else if (v.kind === 'section') {
    fov = 24;
    const d = fitDistance(L + 6.2, 11.2, fov);
    target = new THREE.Vector3(L / 2 - 1.4, 1.1, v.z / 100);
    pos = new THREE.Vector3(L / 2 - 1.4, 1.1, v.z / 100 + d);
  } else if (v.dir) {
    fov = v.vfov;
    const dir = new THREE.Vector3(...v.dir).normalize();
    const fit = fitBox(new THREE.Vector3(...v.box[0]), new THREE.Vector3(...v.box[1]), dir, fov);
    target = fit.target;
    pos = target.clone().add(dir.multiplyScalar(fit.d));
  } else {
    pos = new THREE.Vector3(...v.pos);
    target = new THREE.Vector3(...v.target);
    if (v.kind === 'photo') {
      // bersaglio vicino: trascinando ci si guarda intorno
      target = pos.clone().add(target.sub(pos).normalize().multiplyScalar(1));
    }
    fov = v.vfov || camera.fov;
  }
  const instant = !animate || reduceMotion || STATIC || v.kind === 'plan' || v.kind === 'section';
  if (instant) {
    tween = null;
    camera.position.copy(pos);
    controls.target.copy(target);
    if (!state.hfov) camera.fov = fov;
    applyProjection();
    controls.update();
  } else {
    tween = {
      t: 0,
      dur: 0.9,
      p0: camera.position.clone(),
      p1: pos,
      q0: controls.target.clone(),
      q1: target,
      f0: camera.fov,
      f1: fov,
    };
    if (state.hfov) {
      applyProjection();
      tween.f1 = camera.fov;
      camera.fov = tween.f0;
      camera.updateProjectionMatrix();
    }
  }
  refreshVisibility();
  updateHint();
  requestRender();
}

function configureControls(kind) {
  const flat = kind === 'plan' || kind === 'section';
  controls.enableRotate = !flat;
  controls.enableZoom = kind !== 'photo';
  controls.mouseButtons = {
    LEFT: flat ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = { ONE: flat ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.rotateSpeed = kind === 'photo' ? 0.45 : 0.8;
  controls.minDistance = kind === 'photo' ? 0.2 : 1;
  controls.maxDistance = 90;
  controls.maxPolarAngle = kind === 'orbit' ? Math.PI * 0.49 : Math.PI;
  controls.screenSpacePanning = true;
}

// Rotella nelle viste fotografiche: cambia l'obiettivo invece di avanzare.
canvas.addEventListener(
  'wheel',
  (e) => {
    if (state.kind !== 'photo' || !state.hfov) return;
    e.preventDefault();
    state.hfov = Math.min(115, Math.max(30, state.hfov * (1 + Math.sign(e.deltaY) * 0.06)));
    applyProjection();
  },
  { passive: false },
);

// ---------------------------------------------------------------------------
// Tagli, campiture, visibilità

let caps = null;
function configureCut(v) {
  if (caps) {
    W.scene.remove(caps);
    caps.traverse((o) => o.geometry?.dispose());
    caps = null;
  }
  const sc = state.scenario;
  if (v.kind === 'plan') {
    renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), v.cut / 100)];
    caps = planCaps(v.cut, W.poche, W.pocheLight, sc);
  } else if (v.kind === 'section' && v.x) {
    renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), v.x / 100)];
    caps = sectionCapsX(v.x, W.poche, W.pocheLight, sc);
  } else if (v.kind === 'section') {
    renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), v.z / 100)];
    caps = sectionCaps(v.z, W.poche, W.pocheLight, sc);
  } else {
    renderer.clippingPlanes = [];
  }
  if (caps) W.scene.add(caps);
}

function cameraInside() {
  const p = camera.position;
  return p.x > 0 && p.x < L && p.z > 0 && p.z < D && p.y < roofY(p.z * 100) / 100;
}

function refreshVisibility() {
  if (!W) return;
  const { toggles } = state;
  const kind = state.kind;
  const p = camera.position;
  const cut = kind === 'plan' || kind === 'section';
  // lati: nascosti se l'osservatore sta fuori da quel lato (vista a casa di bambola)
  const outside = {
    north: p.z < -T,
    south: p.z > D + T,
    west: p.x < -T,
    east: p.x > L + T,
  };
  for (const [side, objs] of Object.entries(W.sided)) {
    const vis = cut || kind === 'walk' || !outside[side];
    for (const o of objs) o.visible = vis;
  }
  let roof = toggles.roof;
  if (kind === 'plan') roof = false;
  else if (!cut && !cameraInside()) roof = false;
  W.roof.visible = roof;
  W.roofTop.visible = roof && !cameraInside();
  for (const c of W.layers.mezzanine.children) c.visible = toggles.mezz || c.userData.keep;
  for (const o of W.scenarioObjs) o.visible = o.userData.scenario === state.scenario;
  W.layers.currentFurniture.visible = toggles.furn;
  W.layers.projectFurniture.visible = toggles.furn;
  for (const o of W.mezzFurniture) o.visible = toggles.mezz;
  // etichette
  const A = W.ann;
  const lab = toggles.labels;
  const proj = state.scenario === 'project';
  const v = state.view;
  const main = lab && v !== 'planMezz' && v !== 'planEntry' && kind !== 'section';
  A.rooms.visible = main && !proj;
  A.roomsProject.visible = main && proj;
  const up = lab && toggles.mezz && v !== 'planGround' && v !== 'planEntry' && kind !== 'section';
  A.upper.visible = up && !proj;
  A.upperProject.visible = up && proj;
  A.ground.visible = lab && (v === 'planEntry' || (kind !== 'plan' && kind !== 'section'));
  A.planEntry.visible = lab && v === 'planEntry';
  A.planGround.visible = lab && state.view === 'planGround';
  A.planMezz.visible = lab && state.view === 'planMezz';
  A.section.visible = lab && state.view === 'section';
  A.sectionX.visible = lab && state.view === 'sectionX';
  requestRender();
}

// ---------------------------------------------------------------------------
// Luce

function setLight(mode) {
  state.light = mode;
  $$('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === mode)));
  const { lights, M, scene } = W;
  const eve = mode === 'evening';
  lights.hemi.intensity = eve ? 0.06 : 0.52;
  lights.hemi.color.set(eve ? '#7d8aa6' : '#f3e7da');
  lights.sun.intensity = eve ? 0 : 2.3;
  lights.sun.castShadow = !eve;
  for (const a of lights.windows) a.intensity = eve ? 0.15 : a.userData.day;
  // di giorno le lampade restano accese piano, come nelle foto; si accendono
  // solo quelle dello scenario mostrato
  for (const b of lights.bulbs) {
    b.visible = !b.userData.scenario || b.userData.scenario === state.scenario;
    b.intensity = b.userData.power * (eve ? 1 : 0.35);
  }
  scene.environmentIntensity = eve ? 0.12 : 0.35;
  M.windowGlass.color.set(eve ? '#141a24' : '#eef3f6');
  M.windowGlass.emissive.set(eve ? '#1c2740' : '#e9f0f5');
  M.windowGlass.emissiveIntensity = eve ? 0.6 : 0.85;
  M.lampGlass.emissiveIntensity = eve ? 2.4 : 1.2;
  M.bulb.emissiveIntensity = eve ? 4 : 2;
  const ground = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() || '#d6cfc5';
  scene.background.set(eve ? '#15171c' : ground);
  renderer.toneMappingExposure = eve ? 1.15 : 0.95;
  requestRender();
}

// ---------------------------------------------------------------------------
// Selezione, informazioni, metro

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function pick(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(W.model, true);
  const planes = renderer.clippingPlanes;
  for (const h of hits) {
    if (planes.some((pl) => pl.distanceToPoint(h.point) < -0.001)) continue;
    let o = h.object;
    let ok = true;
    let infoObj = null;
    while (o) {
      if (!o.visible || o.userData.noPick) {
        ok = false;
        break;
      }
      if (!infoObj && o.userData.info) infoObj = o;
      o = o.parent;
    }
    if (!ok) continue;
    if (h.object.material?.transparent && h.object.material.opacity < 0.5) continue;
    return { point: h.point, info: infoObj?.userData.info };
  }
  return null;
}

function showInfo(hit) {
  const card = $('#info');
  if (!hit || !hit.info) {
    card.hidden = true;
    return;
  }
  $('#info-title').textContent = hit.info.name;
  $('#info-detail').textContent = hit.info.detail || '';
  const p = hit.point;
  $('#info-coords').textContent = `x ${Math.round(p.x * 100)} · z ${Math.round(p.z * 100)} · h ${Math.round(p.y * 100)} cm`;
  card.hidden = false;
}
$('#info-close').addEventListener('click', () => ($('#info').hidden = true));

let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener('pointerup', (e) => {
  if (!down || !W || state.tool === 'walk') return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const quick = performance.now() - down.t < 500;
  down = null;
  if (moved > 6 || !quick) return;
  const hit = pick(e.clientX, e.clientY);
  if (state.tool === 'measure') {
    if (hit) {
      const step = W.measure.click(hit.point);
      $('#tool-note').textContent =
        step === 'a' ? 'Ora clicca il secondo punto.' : 'Misura fatta. Clicca di nuovo per una nuova misura, Esc per chiudere.';
      requestRender();
    }
    return;
  }
  showInfo(hit);
});
let hoverQueued = false;
canvas.addEventListener('pointermove', (e) => {
  if (state.tool !== 'measure' || !W.measure.a || W.measure.b || hoverQueued) return;
  hoverQueued = true;
  requestAnimationFrame(() => {
    hoverQueued = false;
    const hit = pick(e.clientX, e.clientY);
    if (hit) {
      W.measure.hover(hit.point);
      requestRender();
    }
  });
});

function setTool(tool) {
  const prev = state.tool;
  state.tool = tool;
  if (prev === 'walk' && tool !== 'walk') W.walker.exit();
  $('#b-measure').setAttribute('aria-pressed', String(tool === 'measure'));
  $('#b-walk').setAttribute('aria-pressed', String(tool === 'walk'));
  if (tool !== 'measure' && prev === 'measure') W.measure.clear();
  $('#tool-note').textContent =
    tool === 'measure' ? 'Clicca il primo punto sul modello.' : 'Tocca un elemento per leggerne le misure.';
  canvas.style.cursor = tool === 'measure' ? 'crosshair' : '';
  updateHint();
  requestRender();
}

$('#b-measure').addEventListener('click', () => setTool(state.tool === 'measure' ? null : 'measure'));
$('#b-walk').addEventListener('click', () => {
  if (state.tool === 'walk') return W.walker.exit();
  startWalk();
});

function startWalk() {
  $('#info').hidden = true;
  tween = null;
  setTool('walk');
  state.kind = 'walk';
  state.hfov = null;
  $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  configureCut({ kind: 'walk' });
  controls.enabled = false;
  if (window.innerWidth > 720) $('#panel').hidden = true;
  else $('#panel').dataset.collapsed = 'true';
  $('#walkpad').hidden = !coarse;
  $('#crosshair').hidden = coarse;
  configureWalker();
  W.walker.enter();
  applyProjection();
  refreshVisibility();
}

function endWalk() {
  state.tool = null;
  controls.enabled = true;
  $('#panel').hidden = false;
  $('#walkpad').hidden = true;
  $('#crosshair').hidden = true;
  $('#b-walk').setAttribute('aria-pressed', 'false');
  $('#tool-note').textContent = 'Tocca un elemento per leggerne le misure.';
  // continua in vista libera dal punto raggiunto
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  controls.target.copy(camera.position).add(dir.multiplyScalar(1));
  state.kind = 'photo';
  state.view = null;
  state.hfov = 100;
  configureControls('photo');
  applyProjection();
  controls.update();
  refreshVisibility();
  updateHint();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state.tool === 'measure') setTool(null);
  if (e.code === 'Escape') $('#info').hidden = true;
});

// pulsanti di movimento su touch
for (const b of $$('[data-walk]')) {
  const k = b.dataset.walk;
  if (k === 'exit') {
    b.addEventListener('click', () => W.walker.exit());
    continue;
  }
  const set = (v) => (e) => {
    e.preventDefault();
    W.walker.pad[k] = v;
  };
  b.addEventListener('pointerdown', set(true));
  b.addEventListener('pointerup', set(false));
  b.addEventListener('pointerleave', set(false));
  b.addEventListener('pointercancel', set(false));
}

// ---------------------------------------------------------------------------
// Suggerimenti

function updateHint() {
  const h = $('#hint');
  const k = (s) => `<kbd>${s}</kbd>`;
  let html;
  if (state.tool === 'walk') {
    html = coarse
      ? 'Trascina per guardarti intorno, tieni premuto Avanti per camminare.'
      : `${k('W')} ${k('A')} ${k('S')} ${k('D')} per camminare · ${k('Maiusc')} per correre · la scala si sale camminando · ${k('Esc')} per uscire`;
  } else if (state.tool === 'measure') {
    html = `Metro: clicca due punti sul modello · ${k('Esc')} per chiudere`;
  } else if (state.kind === 'plan' || state.kind === 'section') {
    html = 'Trascina per spostare · rotella o pizzico per ingrandire · clic su un elemento per le misure';
  } else if (state.kind === 'photo') {
    html = 'Trascina per guardarti intorno · rotella per cambiare obiettivo · clic su un elemento per le misure';
  } else {
    html = 'Trascina per ruotare · tasto destro per spostare · rotella per ingrandire · clic su un elemento per le misure';
  }
  h.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Comandi del pannello

$$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$$('[data-scenario]').forEach((b) => b.addEventListener('click', () => setScenario(b.dataset.scenario)));

// ---------------------------------------------------------------------------
// Scenario: stato di fatto o progetto

function setScenario(s) {
  state.scenario = s;
  $$('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scenario === s)));
  $('#eyebrow').textContent = s === 'project' ? 'Progetto · redesign degli interni' : 'Stato di fatto · rilievo 3D';
  if (!W) return;
  setPlaster(W.M, s);
  configureWalker();
  if (state.kind === 'plan' || state.kind === 'section') configureCut(VIEWS[state.view]);
  setLight(state.light);
  refreshVisibility();
}

// Gruppi i cui pezzi fanno ingombro nella passeggiata
function configureWalker() {
  if (!W) return;
  const Lr = W.layers;
  const cur = state.scenario === 'current';
  const groups = [Lr.kitchen, cur ? Lr.currentFixtures : W.projectFixtures];
  if (state.toggles.furn) groups.push(cur ? Lr.currentFurniture : Lr.projectFurniture);
  W.walker.configure(state.scenario, groups);
}
$$('[data-light]').forEach((b) => b.addEventListener('click', () => setLight(b.dataset.light)));
const bindToggle = (id, key) =>
  $(id).addEventListener('change', (e) => {
    state.toggles[key] = e.target.checked;
    if (key === 'labels') state.labelsAuto = false;
    if (key === 'furn') configureWalker();
    refreshVisibility();
  });
bindToggle('#t-roof', 'roof');
bindToggle('#t-mezz', 'mezz');
bindToggle('#t-furn', 'furn');
bindToggle('#t-labels', 'labels');
bindToggle('#t-ao', 'ao');
$('#t-ao').checked = state.toggles.ao;

$('#sheet-toggle').addEventListener('click', () => {
  $('#panel').dataset.collapsed = 'false';
});
if (window.innerWidth <= 720) $('#panel').dataset.collapsed = 'true';
// su telefono il pannello si chiude dopo aver scelto una vista
$$('#panel [data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    if (window.innerWidth <= 720) $('#panel').dataset.collapsed = 'true';
  }),
);

// ---------------------------------------------------------------------------
// Ciclo di disegno

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (W) {
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const e = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - (-2 * tween.t + 2) ** 3 / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      controls.target.lerpVectors(tween.q0, tween.q1, e);
      camera.fov = tween.f0 + (tween.f1 - tween.f0) * e;
      camera.updateProjectionMatrix();
      if (tween.t >= 1) tween = null;
      needsRender = true;
    }
    if (state.tool === 'walk') {
      if (W.walker.update(dt)) needsRender = true;
    } else {
      controls.update();
    }
    if (needsRender) {
      refreshVisibility();
      draw();
      needsRender = false;
    }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Avvio: costruzione dopo il primo disegno della pagina

function build() {
  const world = buildScene(renderer);
  const sided = { north: [], south: [], west: [], east: [] };
  const mezzFurniture = [];
  const scenarioObjs = [];
  world.model.traverse((o) => {
    if (o.userData.side && sided[o.userData.side]) sided[o.userData.side].push(o);
    if (o.userData.level === 'mezz') mezzFurniture.push(o);
    if (o.userData.scenario) scenarioObjs.push(o);
  });
  const projectFixtures = world.layers.project.getObjectByName('sanitari');
  const roof = world.layers.shell.getObjectByName('tetto');
  let roofTop = null;
  roof.traverse((o) => {
    if (o.userData.roofTop) roofTop = o;
  });
  for (const a of world.lights.windows) a.userData.day = a.intensity;
  const ann = buildAnnotations();
  for (const g of Object.values(ann)) world.scene.add(g);
  const measure = new MeasureTool(world.scene);
  const walker = new Walker(camera, canvas, {
    onExit: () => endWalk(),
    onMove: requestRender,
  });
  walker.lock.addEventListener('change', requestRender);
  W = {
    ...world,
    sided,
    mezzFurniture,
    scenarioObjs,
    projectFixtures,
    roof,
    roofTop,
    ann,
    measure,
    walker,
    poche: pocheMaterial(),
    pocheLight: pocheLightMaterial(),
  };
  setupComposer();

  resize();
  setScenario(state.scenario);
  setLight('day');
  const asked = ALIASES[params.get('view')] || params.get('view');
  const start = VIEWS[asked] ? asked : 'axo';
  setView(start, { animate: false });
  $('#loading').hidden = true;

  // accesso per i test automatici
  window.__loft = {
    THREE,
    ...W,
    camera,
    controls,
    state,
    setView,
    setLight,
    setScenario,
    look(pos, target, fov = 60) {
      tween = null;
      state.hfov = null;
      state.kind = 'photo';
      camera.position.set(...pos);
      controls.target.set(...target);
      camera.fov = fov;
      applyProjection();
      controls.update();
      refreshVisibility();
    },
    snapshot() {
      refreshVisibility();
      draw();
      return renderer.domElement.toDataURL('image/png');
    },
    ready: true,
  };
}

// lo sfondo della scena segue il tema chiaro/scuro della pagina
const retheme = () => W && setLight(state.light);
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', retheme);
new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

resize();
updateHint();
requestAnimationFrame(() =>
  setTimeout(() => {
    try {
      build();
    } catch (err) {
      $('#loading').textContent = `Il modello non si è caricato: ${err.message}`;
      throw err;
    }
    requestAnimationFrame(frame);
  }, 30),
);
