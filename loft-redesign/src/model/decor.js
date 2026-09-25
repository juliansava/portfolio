// Elementi d'arredo del progetto usati in più stanze: piante, quadri,
// tappeti, tende, lampade, libri e piccoli oggetti.
// Ogni pezzo ha l'origine a terra al centro e il fronte verso +z.

import * as THREE from 'three';
import { mulberry32 } from '../lib/textures.js';
import { CM, boxGeoAt, cylGeoAt, discGeo, rodGeo, tubeGeo, Batch, info } from '../lib/geo.js';

// ---------------------------------------------------------------------------
// Piante

// Vaso tornito (profilo [raggio, quota] in cm) con terra.
function potGeo(r, h, shape = 'cylinder') {
  const prof =
    shape === 'bowl'
      ? [
          [0, 0],
          [r * 0.62, 0],
          [r * 0.9, h * 0.35],
          [r, h * 0.8],
          [r * 0.97, h],
          [r * 0.9, h],
          [r * 0.9, h * 0.92],
          [0, h * 0.92],
        ]
      : [
          [0, 0],
          [r * 0.82, 0],
          [r * 0.9, h * 0.1],
          [r, h],
          [r * 0.93, h],
          [r * 0.93, h * 0.95],
          [0, h * 0.95],
        ];
  return new THREE.LatheGeometry(
    prof.map(([a, b]) => new THREE.Vector2(a * CM, b * CM)),
    28,
  );
}

// Foglia: ellisse piatta orientata lungo la direzione dir, centrata in p.
function leafGeo(p, dir, len, wid, roll) {
  const g = new THREE.CircleGeometry(0.5, 7);
  g.scale(wid * CM, len * CM, 1);
  g.translate(0, (len / 2) * CM, 0);
  // piega lungo la nervatura
  g.rotateY(roll);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  g.applyQuaternion(q);
  g.translate(p.x * CM, p.y * CM, p.z * CM);
  return g;
}

// Pianta in vaso. kind: 'olive' (ulivo), 'fig' (ficus lyrata), 'bush' (cespuglio basso)
export function plant(M, { kind = 'olive', h = 200, potR = 30, potH = 45, pot = 'concrete', seed = 1 } = {}) {
  const g = new THREE.Group();
  const r = mulberry32(seed);
  const b = new Batch();
  const potMat = pot === 'terracotta' ? M.terracotta : pot === 'stone' ? M.stoneware : M.concrete;
  b.add(potGeo(potR, potH, pot === 'stone' ? 'bowl' : 'cylinder'), potMat);
  b.add(cylGeoAt(0, potH * 0.9, 0, potR * 0.9, 1, 24), M.soil);
  const leaves = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  if (kind === 'olive') {
    // tronco nodoso che si apre in tre rami
    const top = potH + (h - potH) * 0.45;
    b.add(tubeGeo([[0, potH * 0.9, 0], [3, potH + 30, 2], [-2, top - 20, 1], [0, top, 0]], 4.2, 20, 8, 0.4), M.bark);
    const crowns = [];
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + r();
      const end = [Math.cos(a) * 26, h - 35 - r() * 25, Math.sin(a) * 26];
      b.add(tubeGeo([[0, top, 0], [end[0] * 0.4, top + 30, end[2] * 0.4], end], 2.2, 12, 6, 0.4), M.bark);
      crowns.push(end);
    }
    crowns.push([0, h - 25, 0]);
    for (const c of crowns) {
      for (let i = 0; i < 260; i++) {
        const u = r() * Math.PI * 2;
        const v = Math.acos(2 * r() - 1);
        const rad = 8 + Math.sqrt(r()) * 26;
        const p = V(c[0] + Math.sin(v) * Math.cos(u) * rad * 1.25, c[1] + Math.cos(v) * rad * 0.75, c[2] + Math.sin(v) * Math.sin(u) * rad * 1.25);
        const dir = V(r() - 0.5, r() * 0.6 - 0.1, r() - 0.5);
        leaves.push([leafGeo(p, dir, 9, 2.2, r() * 3), i % 3 ? M.oliveLeaf : M.plantLeafLight]);
      }
    }
  } else if (kind === 'fig') {
    const stems = 3;
    for (let k = 0; k < stems; k++) {
      const a = (k / stems) * Math.PI * 2 + r();
      const lean = 6 + r() * 10;
      const top = [Math.cos(a) * lean, h - r() * 40, Math.sin(a) * lean];
      b.add(tubeGeo([[0, potH * 0.9, 0], [top[0] * 0.5, (potH + top[1]) / 2, top[2] * 0.5], top], 1.6, 10, 6, 0.4), M.bark);
      const n = 16;
      for (let i = 0; i < n; i++) {
        const t = 0.35 + (i / n) * 0.65;
        const p = V(top[0] * t, potH + (top[1] - potH) * t, top[2] * t);
        const aa = i * 2.4 + a;
        const dir = V(Math.cos(aa), 0.5 + r() * 0.6, Math.sin(aa));
        const len = 20 + r() * 12;
        leaves.push([leafGeo(p, dir, len, len * 0.75, r() * 0.6 - 0.3), i % 2 ? M.plantLeaf : M.plantLeafLight]);
      }
    }
  } else {
    for (let i = 0; i < 160; i++) {
      const u = r() * Math.PI * 2;
      const rad = r() * potR * 1.1;
      const p = V(Math.cos(u) * rad, potH + r() * (h - potH), Math.sin(u) * rad);
      const dir = V(Math.cos(u), 0.8 + r(), Math.sin(u));
      leaves.push([leafGeo(p, dir, 16 + r() * 10, 4, r()), i % 2 ? M.plantLeaf : M.plantLeafLight]);
    }
  }
  for (const [geo, mat] of leaves) b.add(geo, mat);
  const mesh = b.build('Pianta');
  g.add(mesh);
  const names = { olive: 'Ulivo in vaso', fig: 'Ficus lyrata', bush: 'Pianta verde' };
  info(g, names[kind], `h circa ${Math.round(h)} cm, vaso Ø ${2 * potR} cm`);
  return g;
}

// ---------------------------------------------------------------------------
// Quadri, specchi, tappeti, tende

// Tela con cornice a cassetta nera; la faccia +z porta il dipinto.
export function canvasArt(M, mat, w, h, name = 'Quadro') {
  const g = new THREE.Group();
  const edge = M.paper;
  const geo = new THREE.BoxGeometry(w * CM, h * CM, 3.5 * CM);
  const canvas = new THREE.Mesh(geo, [edge, edge, edge, edge, mat, edge]);
  canvas.position.set(0, (h / 2) * CM, 2.5 * CM);
  g.add(canvas);
  const f = new Batch();
  const t = 1.2;
  const gap = 1;
  f.add(boxGeoAt(-w / 2 - gap - t, -gap - t, 0, w / 2 + gap + t, -gap, 5), M.blackOak);
  f.add(boxGeoAt(-w / 2 - gap - t, h + gap, 0, w / 2 + gap + t, h + gap + t, 5), M.blackOak);
  f.add(boxGeoAt(-w / 2 - gap - t, -gap, 0, -w / 2 - gap, h + gap, 5), M.blackOak);
  f.add(boxGeoAt(w / 2 + gap, -gap, 0, w / 2 + gap + t, h + gap, 5), M.blackOak);
  f.add(boxGeoAt(-w / 2 - gap, -gap, 0, w / 2 + gap, h + gap, 0.6), M.blackOak);
  g.add(f.build('Cornice'));
  info(g, name, `Tela ${w} × ${h} cm, cornice a cassetta in rovere nero`);
  return g;
}

// Tappeto: il disegno occupa tutto il piano (UV 0..1).
export function rugMesh(mat, w, d, name = 'Tappeto', detail = '') {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * CM, 1.2 * CM, d * CM), mat);
  m.position.y = 0.6 * CM;
  m.receiveShadow = true;
  const g = new THREE.Group();
  g.add(m);
  info(g, name, detail || `${w} × ${d} cm, lana annodata a mano`);
  g.userData.noCollide = true;
  return g;
}

// Tenda arricciata: telo ondulato dal bastone al pavimento, largo w.
export function drape(mat, w, top, folds = 7) {
  const h = top - 1;
  const geo = new THREE.PlaneGeometry(w * CM, h * CM, folds * 4, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin((x / (w * CM)) * Math.PI * 2 * folds) * 0.04);
  }
  geo.computeVertexNormals();
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * CM, uv.getY(i) * h * CM);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = (h / 2 + 1) * CM;
  const g = new THREE.Group();
  g.add(m);
  info(g, 'Tenda in lino', `Lino naturale, a tutta altezza`);
  g.userData.noCollide = true;
  return g;
}

// ---------------------------------------------------------------------------
// Lampade (registrano una luce puntiforme nella lista lamps)

function lampEntry(lamps, x, y, z, power, color = '#ffd8a8', dist = 4) {
  lamps.push({ x, y, z, color, power, dist, scenario: 'project' });
}

// Applique con braccio nero e globo opalino. (x, y, z) mondo per la luce,
// off: sporgenza del globo dal muro nella direzione +z locale.
export function sconce(M, lamps, world, { off = 18, power = 0.7, name = 'Applique' } = {}) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(new THREE.CylinderGeometry(5.5 * CM, 5.5 * CM, 1.5 * CM, 20).rotateX(Math.PI / 2).translate(0, 0, 0.75 * CM), M.brassSatin);
  b.add(rodGeo([0, 0, 1], [0, 0, off - 6], 0.8, 8), M.steel);
  b.add(rodGeo([0, 0, off - 6], [0, 6, off], 0.8, 8), M.steel);
  g.add(b.build(name));
  const globe = new THREE.Mesh(new THREE.SphereGeometry(8 * CM, 20, 14), M.opal);
  globe.position.set(0, 12 * CM, off * CM);
  g.add(globe);
  if (world) lampEntry(lamps, world[0], world[1] + 12, world[2], power, '#ffd9ae', 3.5);
  info(g, name, 'Braccio in ferro nero, globo in vetro opalino');
  return g;
}

// Lampada da lettura a stelo con paralume in lino.
export function readingLamp(M, lamps, world, { h = 150 } = {}) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(discGeo(14, 0, 2.5, 0.8), M.steel);
  b.add(rodGeo([0, 2, 0], [0, h, 0], 1, 8), M.steel);
  b.add(rodGeo([0, h, 0], [22, h + 8, 0], 0.8, 8), M.brassSatin);
  g.add(b.build('Lampada da lettura'));
  const shadeGeo = new THREE.CylinderGeometry(9 * CM, 15 * CM, 18 * CM, 28, 1, true);
  const shade = new THREE.Mesh(shadeGeo, M.linen);
  shade.position.set(22 * CM, (h - 4) * CM, 0);
  g.add(shade);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(4 * CM, 12, 8), M.bulb).translateX(22 * CM).translateY((h - 6) * CM));
  if (world) lampEntry(lamps, world[0], world[1] + h - 6, world[2], 0.9, '#ffd29e', 3.5);
  info(g, 'Lampada da lettura', 'Stelo nero, braccio in ottone, paralume in lino');
  g.userData.foot = 15;
  return g;
}

// Lampada ad arco con base in marmo: il paralume sta a reach cm lungo +z.
export function arcoLamp(M, lamps, world, reach, rot) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-21, 0, -13, 21, 58, 13), M.marble);
  const top = 245;
  b.add(
    tubeGeo(
      [
        [0, 58, 0],
        [0, 150, 4],
        [0, 215, reach * 0.18],
        [0, top, reach * 0.45],
        [0, top - 6, reach * 0.78],
        [0, 212, reach],
      ],
      1.3,
      80,
      10,
      0.25,
    ),
    M.brushed,
  );
  g.add(b.build('Lampada ad arco'));
  const pts = [
    [1.5, 8],
    [5, 6.5],
    [12, 2],
    [18, -6],
    [19.5, -12],
  ].map(([a, c]) => new THREE.Vector2(a * CM, c * CM));
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), M.chrome);
  dome.position.set(0, 205 * CM, reach * CM);
  g.add(dome);
  const diff = new THREE.Mesh(new THREE.CircleGeometry(17 * CM, 32), M.opal);
  diff.rotation.x = Math.PI / 2;
  diff.position.set(0, 194 * CM, reach * CM);
  g.add(diff);
  if (world) {
    const [x, y, z] = world;
    lampEntry(lamps, x + Math.sin(rot) * reach, y + 188, z + Math.cos(rot) * reach, 1.4, '#ffdcb0', 5);
  }
  info(g, 'Lampada ad arco', `Base in marmo bianco, arco in acciaio, sbraccio ${Math.round(reach)} cm sopra il tavolo`);
  g.userData.foot = 22;
  return g;
}

// Sospensione a cupola smaltata nera (atrio, lavanderia).
export function domePendant(M, lamps, world, { r = 28, drop = 60, power = 1.3 } = {}) {
  const g = new THREE.Group();
  const mat = M.steelMatte.clone();
  mat.side = THREE.DoubleSide;
  const pts = [
    [1.5, 0],
    [4, -2],
    [r * 0.5, -r * 0.3],
    [r * 0.88, -r * 0.55],
    [r, -r * 0.62],
  ].map(([a, c]) => new THREE.Vector2(a * CM, c * CM));
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat);
  g.add(dome);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96 * CM, 40), M.opal);
  inner.rotation.x = Math.PI / 2;
  inner.position.y = -r * 0.6 * CM;
  g.add(inner);
  g.add(new THREE.Mesh(rodGeo([0, 0, 0], [0, drop, 0], 0.35, 4), M.black));
  g.add(new THREE.Mesh(cylGeoAt(0, drop - 2, 0, 6, 2, 16), M.steel));
  if (world) lampEntry(lamps, world[0], world[1] - r * 0.5, world[2], power, '#ffe0b8', 6);
  info(g, 'Sospensione a cupola', `Lamiera smaltata nera, Ø ${2 * r} cm`);
  return g;
}

// Luce da quadro in ottone.
export function pictureLight(M, lamps, world, w = 45) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-3, -3, 0, 3, 3, 2), M.brassSatin);
  b.add(rodGeo([0, 0, 1], [0, 8, 14], 0.6, 6), M.brassSatin);
  b.add(new THREE.CylinderGeometry(2.4 * CM, 2.4 * CM, w * CM, 14).rotateZ(Math.PI / 2).translate(0, 8 * CM, 15 * CM), M.brassSatin);
  g.add(b.build('Luce da quadro'));
  if (world) lampEntry(lamps, world[0], world[1] + 4, world[2], 0.35, '#ffd6a0', 2.2);
  info(g, 'Luce da quadro', 'Ottone satinato');
  return g;
}

// ---------------------------------------------------------------------------
// Piccoli oggetti

export function bookStack(M, n = 3, seed = 3) {
  const r = mulberry32(seed);
  const b = new Batch();
  let y = 0;
  const mats = [M.linenCharcoal, M.cream, M.leatherDark, M.paper, M.teal];
  for (let i = 0; i < n; i++) {
    const w = 20 + r() * 8;
    const d = 15 + r() * 5;
    const t = 2.2 + r() * 1.8;
    const a = (r() - 0.5) * 0.3;
    const geo = boxGeoAt(-w / 2, y, -d / 2, w / 2, y + t, d / 2);
    geo.rotateY(a);
    b.add(geo, mats[Math.floor(r() * mats.length)]);
    y += t;
  }
  const g = b.build('Libri');
  g.userData.noCollide = true;
  return g;
}

export function vase(M, { r = 8, h = 26, mat = null } = {}) {
  const prof = [
    [0, 0],
    [r * 0.7, 0],
    [r, h * 0.3],
    [r * 0.85, h * 0.7],
    [r * 0.4, h * 0.9],
    [r * 0.45, h],
    [r * 0.38, h],
    [r * 0.36, h * 0.95],
  ];
  const m = new THREE.Mesh(
    new THREE.LatheGeometry(
      prof.map(([a, b]) => new THREE.Vector2(a * CM, b * CM)),
      24,
    ),
    mat || M.stoneware,
  );
  const g = new THREE.Group();
  g.add(m);
  g.userData.noCollide = true;
  return g;
}

// Ramo secco in un vaso alto (console, bagno).
export function branchVase(M, seed = 5) {
  const g = vase(M, { r: 9, h: 34, mat: M.ceramic });
  const r = mulberry32(seed);
  const b = new Batch();
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2;
    const tip = [Math.cos(a) * (15 + r() * 15), 90 + r() * 30, Math.sin(a) * (15 + r() * 15)];
    b.add(tubeGeo([[0, 30, 0], [tip[0] * 0.4, 60, tip[2] * 0.4], tip], 0.5, 10, 4, 0.4), M.bark);
  }
  g.add(b.build('Rami'));
  return g;
}

