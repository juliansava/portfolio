// Nomi degli ambienti e quote, come nel rilievo.

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { S, roofY } from '../survey.js';
import { CM } from '../lib/geo.js';

const fmt = (cm) => `${Math.round(cm)}`;
const fmtM = (cm) => (cm / 100).toFixed(2).replace('.', ',');

function tag(text, sub, cls = 'tag') {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  if (sub) {
    const s = document.createElement('span');
    s.textContent = sub;
    el.appendChild(s);
  }
  return new CSS2DObject(el);
}

function at(obj, x, y, z) {
  obj.position.set(x * CM, y * CM, z * CM);
  return obj;
}

// Linea di quota tra a e b (cm) con testo al centro.
function dimLine(a, b, text, color = '#9c4b30') {
  const g = new THREE.Group();
  const A = new THREE.Vector3(...a).multiplyScalar(CM);
  const B = new THREE.Vector3(...b).multiplyScalar(CM);
  const dir = B.clone().sub(A).normalize();
  // trattini obliqui alle estremità, come nei disegni
  const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(dir, up).normalize();
  const tick = side.clone().add(dir).multiplyScalar(0.08);
  const pts = [A, B, A.clone().sub(tick), A.clone().add(tick), B.clone().sub(tick), B.clone().add(tick)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true });
  const lines = new THREE.LineSegments(geo, mat);
  lines.renderOrder = 10;
  g.add(lines);
  const label = tag(text, null, 'dim');
  label.position.copy(A.clone().add(B).multiplyScalar(0.5));
  g.add(label);
  return g;
}

export function buildAnnotations() {
  const L = S.totalLength;
  const D = S.depth;

  // Nomi degli ambienti (piano principale)
  const rooms = new THREE.Group();
  rooms.name = 'nomi';
  rooms.add(at(tag('Open space', 'h 3,07 · doppia altezza verso le finestre'), 520, 20, 340));
  rooms.add(at(tag('Cucina'), 770, 20, 390));
  rooms.add(at(tag('Bagno', `${S.rightWidth} × 390 cm`), 985, 20, 330));
  rooms.add(at(tag('Ripostiglio'), 985, 20, 52));
  rooms.add(at(tag('Scala', '18 alzate'), 42, 20, 300));
  rooms.add(at(tag('Ascensore'), 48, 20, 445));

  // Nomi al livello del soppalco
  const upper = new THREE.Group();
  upper.name = 'nomi soppalco';
  upper.add(at(tag('Soppalco', 'h 2,83 → 2,07 sotto falda'), 600, S.mezzTop + 20, 100));
  upper.add(at(tag('Corridoio', `${S.corridorW} cm`), 170, S.mezzTop + 20, 62));
  upper.add(at(tag('Ala est', 'h 2,83 → 1,00'), 985, S.mezzTop + 20, 300));
  upper.add(at(tag('Vuoto a doppia altezza'), 520, S.mezzTop + 20, 360));

  // Quote della pianta del piano principale
  const planGround = new THREE.Group();
  planGround.name = 'quote pianta';
  const yq = 125; // sotto il piano di taglio (140)
  planGround.add(dimLine([0, yq, -95], [S.mainLength, yq, -95], `${fmt(S.mainLength)} cm`));
  planGround.add(dimLine([S.rightX0, yq, -95], [L, yq, -95], `${fmt(S.rightWidth)}`));
  planGround.add(dimLine([-95, yq, 0], [-95, yq, D], `${fmt(D)} cm`));
  planGround.add(dimLine([0, yq, D + 95], [345, yq, D + 95], '345'));
  planGround.add(dimLine([345, yq, D + 95], [722, yq, D + 95], '377'));
  planGround.add(dimLine([722, yq, D + 95], [S.mainLength, yq, D + 95], '148'));

  // Quote della pianta del soppalco
  const planMezz = new THREE.Group();
  planMezz.name = 'quote soppalco';
  const ym = S.mezzTop + 105; // sotto il piano di taglio (450)
  planMezz.add(dimLine([0, ym, -95], [S.stairOpeningEndX, ym, -95], `${S.stairOpeningEndX}`));
  planMezz.add(dimLine([S.stairOpeningEndX, ym, -95], [S.mainLength, ym, -95], `${S.mainLength - S.stairOpeningEndX} cm`));
  planMezz.add(dimLine([S.mainLength, ym, -95], [L, ym, -95], `${S.rightWidth}`));
  planMezz.add(dimLine([-95, ym, 0], [-95, ym, S.corridorW], `${S.corridorW}`));
  planMezz.add(dimLine([-95, ym, S.corridorW], [-95, ym, S.mezzEdgeZ], `${S.mezzEdgeZ - S.corridorW}`));
  planMezz.add(dimLine([L + 95, ym, 0], [L + 95, ym, D], `${D} cm`));

  // Quote altimetriche della sezione (lato ovest)
  const section = new THREE.Group();
  section.name = 'quote sezione';
  const zs = 250; // appena dietro il piano di sezione (256)
  const xs = -120;
  const lev = [
    [0, '±0,00'],
    [S.mezzUnder - 6, `+${fmtM(S.mezzUnder)} intradosso`],
    [S.mezzTop + 6, `+${fmtM(S.mezzTop)} soppalco`],
    [roofY(zs), `+${fmtM(roofY(zs))} falda`],
  ];
  for (const [y, text] of lev) {
    const l = tag(text, null, 'dim');
    at(l, xs, y, zs);
    l.center.set(1, 0.5);
    section.add(l);
    section.add(dimLine([xs + 10, y, zs], [-50, y, zs], ''));
  }
  section.add(dimLine([L + 80, 0, zs], [L + 80, S.mezzUnder, zs], `${S.mezzUnder}`));
  section.add(dimLine([L + 80, S.mezzUnder, zs], [L + 80, S.mezzTop, zs], `${S.mezzTop - S.mezzUnder}`));
  section.add(dimLine([L + 80, S.mezzTop, zs], [L + 80, roofY(zs), zs], `${fmt(roofY(zs) - S.mezzTop)}`));
  section.traverse((o) => {
    if (o.isCSS2DObject && o.element.textContent === '') o.visible = false;
  });

  // Sezione trasversale in asse alla finestra W2, vista verso ovest
  const sectionX = new THREE.Group();
  sectionX.name = 'quote sezione trasversale';
  const xq = 560;
  const lvx = [
    [0, '±0,00'],
    [S.mezzUnder, `+${fmtM(S.mezzUnder)}`],
    [S.mezzTop, `+${fmtM(S.mezzTop)} soppalco`],
    [S.roofAtSouth, `+${fmtM(S.roofAtSouth)} imposta falda`],
  ];
  for (const [y, text] of lvx) {
    const l = tag(text, null, 'dim');
    at(l, xq, y, D + 130);
    l.center.set(0, 0.5);
    sectionX.add(l);
  }
  const top = tag(`+${fmtM(roofY(0))} filo muro nord`, null, 'dim');
  at(top, xq, roofY(0) + 40, -60);
  sectionX.add(top);
  sectionX.add(dimLine([xq, S.mezzTop + 12, 0], [xq, S.mezzTop + 12, S.mezzEdgeZ], `${S.mezzEdgeZ}`));
  sectionX.add(dimLine([xq, 12, S.mezzEdgeZ], [xq, 12, D], `${D - S.mezzEdgeZ} doppia altezza`));
  const w2 = S.windows[1];
  sectionX.add(dimLine([xq, w2.sill, D + 70], [xq, w2.crown, D + 70], `${w2.crown - w2.sill}`));
  sectionX.add(dimLine([xq, 0, D + 70], [xq, w2.sill, D + 70], `${w2.sill}`));
  sectionX.add(dimLine([xq, S.mezzTop, -80], [xq, roofY(0), -80], `${Math.round(roofY(0) - S.mezzTop)}`));

  return { rooms, upper, planGround, planMezz, section, sectionX };
}
