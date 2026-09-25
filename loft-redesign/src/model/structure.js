// Struttura in acciaio e soppalco: impalcato, pilastri, travi, parapetti,
// parapetto in mattoni del vano scala e gabbia d'arrivo della scala dal
// piano terra. Nel progetto: ampliamento del soppalco con piano in vetro.

import * as THREE from 'three';
import { S, roofY } from '../survey.js';
import { CM, boxAt, boxGeoAt, cylAt, cylGeoAt, prismGeo, rodGeo, Batch, info } from '../lib/geo.js';

const D = S.depth;
const GX = S.glassExt;

// Contorno dell'impalcato del soppalco (x, z in cm): corridoio a nord della
// scala, soppalco principale fino al filo 212 e ala est sopra i servizi.
export const MEZZ_OUTLINE = [
  [0, 0],
  [S.totalLength, 0],
  [S.totalLength, D],
  [S.mainLength, D],
  [S.mainLength, S.mezzEdgeZ],
  [S.stairOpeningEndX, S.mezzEdgeZ],
  [S.stairOpeningEndX, S.corridorW],
  [0, S.corridorW],
];

// Progetto: lo stesso contorno con l'aggiunta in vetro tra pilastro 2 e ala est.
export const MEZZ_OUTLINE_PROJECT = [
  [0, 0],
  [S.totalLength, 0],
  [S.totalLength, D],
  [S.mainLength, D],
  [S.mainLength, GX.z1],
  [GX.x0, GX.z1],
  [GX.x0, S.mezzEdgeZ],
  [S.stairOpeningEndX, S.mezzEdgeZ],
  [S.stairOpeningEndX, S.corridorW],
  [0, S.corridorW],
];

export const mezzOutline = (scenario) => (scenario === 'project' ? MEZZ_OUTLINE_PROJECT : MEZZ_OUTLINE);

export function buildMezzanine(M) {
  const g = new THREE.Group();
  g.name = 'soppalco';

  // Impalcato: fianchi in acciaio nero, estradosso in parquet
  const slab = new THREE.Mesh(prismGeo(MEZZ_OUTLINE, S.mezzUnder, S.mezzTop), [M.parquet, M.steel]);
  info(slab, 'Soppalco', `Quota calpestio +3,30 m, intradosso +3,07 m, superficie circa ${mezzArea()} m²`);
  g.add(slab);
  // Intradosso intonacato
  const under = new THREE.Mesh(prismGeo(MEZZ_OUTLINE, S.mezzUnder - 0.4, S.mezzUnder - 0.1), M.plasterLight);
  info(under, 'Intradosso del soppalco', 'Intonaco tra travi in acciaio, altezza libera 3,07 m');
  g.add(under);

  // Travi viste all'intradosso (ali inferiori delle IPE)
  const beams = new Batch();
  for (const x of [345, 722]) {
    beams.add(boxGeoAt(x - 5.5, S.mezzUnder - 1.5, 0, x + 5.5, S.mezzUnder, S.mezzEdgeZ), M.steel);
  }
  beams.add(boxGeoAt(0, S.mezzUnder - 1.5, 64, S.mainLength, S.mezzUnder, 75), M.steel);
  beams.add(boxGeoAt(S.stairOpeningEndX, S.mezzUnder - 1.5, 146, S.mainLength, S.mezzUnder, 157), M.steel);
  // Catene sopra il vuoto, dai pilastri al muro sud
  for (const x of [345, 722]) {
    beams.add(boxGeoAt(x - 5.5, S.mezzUnder, S.mezzEdgeZ, x + 5.5, S.mezzUnder + S.beamH, D), M.steel);
  }
  // Trave lungo il muro ovest, sopra il vano scala (foto 7)
  beams.add(boxGeoAt(0, 314, S.mezzEdgeZ, 11, 336, D), M.steel);
  const beamGroup = beams.build('Travi');
  info(beamGroup, 'Travi in acciaio', 'IPE 220 verniciate nere: catene sul vuoto in asse con i pilastri');
  g.add(beamGroup);

  // Pilastri tondi con piastre
  for (const c of S.columns) {
    const col = new THREE.Group();
    const zc = c.z - c.d / 2 + 1;
    col.add(cylAt(M.steel, c.x, 0, zc, c.d / 2, S.mezzUnder, 28));
    col.add(cylAt(M.steel, c.x, 0, zc, c.d, 1.5, 28));
    col.add(cylAt(M.steel, c.x, S.mezzUnder - 4, zc, c.d / 2 + 2.5, 4, 28));
    info(col, 'Pilastro in acciaio', `Ø ${c.d} cm, altezza 3,07 m, in x = ${c.x} cm`);
    col.userData.keep = true; // resta visibile anche nascondendo il soppalco
    g.add(col);
  }

  return g;
}

function mezzArea(poly = MEZZ_OUTLINE) {
  // area del poligono (formula di Gauss), in m²
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    a += x1 * z2 - x2 * z1;
  }
  return (Math.abs(a) / 2 / 10000).toFixed(1).replace('.', ',');
}

// Parapetto a montanti e due correnti (come nelle foto del soppalco).
function railRun(batch, M, a, b, { base = S.mezzTop, h = 100, postEvery = 95, rails = [50], balusters = 0 } = {}) {
  const [ax, az] = a;
  const [bx, bz] = b;
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.round(len / postEvery));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    batch.add(boxGeoAt(x - 2, base, z - 2, x + 2, base + h - 2, z + 2), M.steel);
  }
  // corrimano tondo
  batch.add(rodGeo([ax, base + h, az], [bx, base + h, bz], 2.1, 12), M.steel);
  for (const r of rails) batch.add(rodGeo([ax, base + r, az], [bx, base + r, bz], 0.9, 8), M.steel);
  batch.add(rodGeo([ax, base + 8, az], [bx, base + 8, bz], 0.9, 8), M.steel);
  if (balusters) {
    const m = Math.round(len / balusters);
    for (let i = 1; i < m; i++) {
      const t = i / m;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      batch.add(rodGeo([x, base + 8, z], [x, base + h, z], 0.8, 6), M.steel);
    }
  }
}

// Parapetti del soppalco. Nel progetto il filo sud gira attorno
// all'ampliamento in vetro; lo stile resta quello esistente.
export function buildRailings(M, scenario) {
  const b = new Batch();
  const e = S.mezzEdgeZ - 3;
  const x = S.mainLength;
  if (scenario === 'project') {
    railRun(b, M, [S.stairOpeningEndX + 6, e], [GX.x0 - 3, e]);
    railRun(b, M, [GX.x0 - 3, e], [GX.x0 - 3, GX.z1 - 3]);
    railRun(b, M, [GX.x0 - 3, GX.z1 - 3], [x + 3, GX.z1 - 3]);
    railRun(b, M, [x + 3, GX.z1 - 3], [x + 3, D - 2]);
  } else {
    // filo sud del soppalco principale, dal pilastro 1 all'angolo della cucina
    railRun(b, M, [S.stairOpeningEndX + 6, e], [x - 3, e]);
    // filo ovest dell'ala est, sopra la cucina, fino alla falda
    railRun(b, M, [x + 3, e], [x + 3, D - 2], { postEvery: 95 });
  }
  // lato corridoio del vano scala: bacchette fitte
  railRun(b, M, [0, S.corridorW + 3], [S.stairOpeningEndX, S.corridorW + 3], { rails: [], balusters: 11 });
  const g = b.build('Parapetti');
  info(g, 'Parapetti del soppalco', 'Ferro nero, h 100 cm, corrimano tondo e correnti intermedi');
  g.userData.level = 'mezz';
  return g;
}

// Ampliamento del soppalco (progetto): telaio in acciaio a sbalzo dal
// pilastro 2 e dall'ala est, piano in vetro stratificato calpestabile.
export function buildGlassExtension(M) {
  const g = new THREE.Group();
  g.name = 'ampliamento in vetro';
  const b = new Batch();
  const y0 = S.mezzUnder;
  const y1 = S.mezzTop;
  // travi di bordo e traverso intermedio
  b.add(boxGeoAt(GX.x0 - 5.5, y0, S.mezzEdgeZ, GX.x0 + 5.5, y1 - 3, GX.z1), M.steel);
  b.add(boxGeoAt(GX.x0 - 5.5, y0, GX.z1 - 11, GX.x1, y1 - 3, GX.z1), M.steel);
  b.add(boxGeoAt(GX.x1 - 9, y0, S.mezzEdgeZ, GX.x1, y1 - 3, GX.z1), M.steel);
  const mid = (GX.x0 + GX.x1) / 2;
  b.add(boxGeoAt(mid - 4, y0 + 8, S.mezzEdgeZ, mid + 4, y1 - 3, GX.z1 - 11), M.steel);
  // battuta del vetro
  for (const [a0, c0, a1, c1] of [
    [GX.x0 + 5.5, S.mezzEdgeZ, GX.x1 - 9, S.mezzEdgeZ + 3],
    [GX.x0 + 5.5, GX.z1 - 14, GX.x1 - 9, GX.z1 - 11],
  ]) {
    b.add(boxGeoAt(a0, y1 - 5, c0, a1, y1 - 3, c1), M.steel);
  }
  g.add(b.build('Telaio ampliamento'));
  const glass = boxAt(M.glassFloor, GX.x0 + 5.5, y1 - 3, S.mezzEdgeZ, GX.x1 - 9, y1, GX.z1 - 11);
  glass.userData.noShadow = true;
  g.add(glass);
  info(
    g,
    'Ampliamento del soppalco',
    `${GX.x1 - GX.x0} × ${GX.z1 - GX.z0} cm, telaio in acciaio a sbalzo, vetro stratificato calpestabile; superficie del soppalco ${mezzArea(MEZZ_OUTLINE_PROJECT)} m²`,
  );
  g.userData.level = 'mezz';
  return g;
}

// ---------------------------------------------------------------------------
// Parapetto in mattoni del vano scala e gabbia d'arrivo

export function buildStairEnclosure(M) {
  const g = new THREE.Group();
  g.name = 'recinto scala';
  const p = S.parapet;

  const wall = boxAt(M.brickNew, p.x, 0, p.z0, p.x + p.t, p.h, p.z1);
  info(wall, 'Parapetto in mattoni', `Listelli di laterizio, h ${p.h} cm, lungo ${p.z1 - p.z0} cm: protegge il vano della scala dal piano terra`);
  g.add(wall);
  // scatola degli interruttori sulla testa verso la gabbia (foto 3)
  g.add(boxAt(M.plasticBlack, p.x + p.t, 88, p.z1 - 12, p.x + p.t + 2, 102, p.z1 - 5));
  g.add(boxAt(M.red, p.x + p.t + 2, 93, p.z1 - 10, p.x + p.t + 2.8, 97, p.z1 - 7));

  g.add(buildArrival(M));
  return g;
}

// Gabbia in ferro nell'angolo sud-ovest: chiude lo sbarco della scala dal
// piano terra. Aperta verso nord (vano scala), porta sul lato est.
function buildArrival(M) {
  const l = S.arrival;
  const dr = l.door;
  const g = new THREE.Group();
  g.name = 'gabbia d\'arrivo';
  const b = new Batch();
  const t = 4;
  for (const [x, z] of [
    [l.x1 - t, l.z0],
    [l.x1 - t, l.z1 - t],
    [l.x0, l.z0],
  ]) {
    b.add(boxGeoAt(x, 0, z, x + t, l.h, z + t), M.steel);
  }
  // telaio in alto e cielino
  b.add(boxGeoAt(l.x0, l.h - 6, l.z0, l.x1, l.h, l.z0 + t), M.steel);
  b.add(boxGeoAt(l.x1 - t, l.h - 6, l.z0, l.x1, l.h, l.z1), M.steel);
  b.add(boxGeoAt(l.x0, l.h, l.z0, l.x1, l.h + 4, l.z1), M.steelMatte);
  // lato est: montanti della porta, traverso, soglia
  b.add(boxGeoAt(l.x1 - 3, 0, dr.z0 - 5, l.x1, l.h - 6, dr.z0), M.steel);
  b.add(boxGeoAt(l.x1 - 3, 0, dr.z1, l.x1, l.h - 6, dr.z1 + 5), M.steel);
  b.add(boxGeoAt(l.x1 - 3, 214, dr.z0, l.x1, 220, dr.z1), M.steel);
  // anta aperta verso la stanza, incernierata a sud
  const leaf = new Batch();
  const lw = dr.z1 - dr.z0;
  leaf.add(boxGeoAt(0, 2, -2, lw, 212, 0), M.steel);
  const leafG = leaf.build('Anta');
  const glass = boxAt(M.tinted, 6, 20, -2.4, lw - 6, 200, 0.4);
  leafG.add(glass);
  leafG.add(boxAt(M.brushed, lw - 12, 100, -6, lw - 9, 120, -2));
  leafG.position.set(l.x1 * CM, 0, dr.z1 * CM);
  leafG.rotation.y = 0.09; // aperta di circa 85°, verso la stanza
  g.add(b.build('Gabbia'));
  g.add(leafG);

  // pannelli in lamiera forata: fisso a est e cielino
  const perfE = boxAt(M.perforated, l.x1 - 2, 6, l.z0 + t, l.x1 - 1, l.h - 6, dr.z0 - 5);
  const perfE2 = boxAt(M.perforated, l.x1 - 2, 220, dr.z0, l.x1 - 1, l.h - 6, dr.z1);
  g.add(perfE, perfE2);

  info(g, 'Gabbia d\'arrivo della scala', `${l.x1 - l.x0} × ${l.z1 - l.z0} cm, ferro nero e lamiera forata: si esce dalla porta sul lato est`);
  return g;
}

// Cancelletto curvo su ruote (stato di fatto, foto 3): mobile, davanti al
// parapetto vicino alla gabbia.
export function curvedGate(M) {
  const chord = 64;
  const sag = 16;
  const r = (chord * chord) / 4 / (2 * sag) + sag / 2;
  const half = Math.asin(chord / 2 / r);
  const cx = -(r - sag);
  const h = 100;
  const g = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.CylinderGeometry(r * CM, r * CM, h * CM, 24, 1, true, Math.PI / 2 - half, 2 * half),
    M.perforated,
  );
  const uv = panel.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 2 * half * CM, uv.getY(i) * h * CM);
  panel.position.set(cx * CM, (h / 2 + 10) * CM, 0);
  g.add(panel);
  const frame = new Batch();
  const pts = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 - half + (i / n) * 2 * half;
    pts.push([cx + Math.sin(a) * r, Math.cos(a) * r]);
  }
  for (const y of [10, 10 + h]) {
    for (let i = 0; i < n; i++) frame.add(rodGeo([pts[i][0], y, pts[i][1]], [pts[i + 1][0], y, pts[i + 1][1]], 1, 6), M.steel);
  }
  for (const q of [pts[0], pts[n / 2], pts[n]]) {
    frame.add(rodGeo([q[0], 3, q[1]], [q[0], 10 + h, q[1]], 1.1, 6), M.steel);
    frame.add(cylGeoAt(q[0], 0, q[1], 2.5, 4, 12), M.rubber);
  }
  g.add(frame.build());
  info(g, 'Cancelletto curvo', 'Lamiera forata su ruote, appoggiato al parapetto');
  return g;
}

export { roofY };
