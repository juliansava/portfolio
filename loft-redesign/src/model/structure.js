// Struttura in acciaio e soppalco: impalcato, pilastri, travi, parapetti,
// parapetto in mattoni della scala, cancelletto e ascensore.

import * as THREE from 'three';
import { S, roofY } from '../survey.js';
import { CM, boxAt, boxGeoAt, cylAt, cylGeoAt, prismGeo, rodGeo, Batch, info } from '../lib/geo.js';

const D = S.depth;

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
  // Trave lungo il muro ovest (regge la puleggia dell'ascensore)
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

  // Parapetti del soppalco
  g.add(buildRailings(M));
  return g;
}

function mezzArea() {
  // area del poligono (formula di Gauss), in m²
  let a = 0;
  for (let i = 0; i < MEZZ_OUTLINE.length; i++) {
    const [x1, z1] = MEZZ_OUTLINE[i];
    const [x2, z2] = MEZZ_OUTLINE[(i + 1) % MEZZ_OUTLINE.length];
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

function buildRailings(M) {
  const b = new Batch();
  const e = S.mezzEdgeZ - 3;
  // filo sud del soppalco principale, dal pilastro 1 all'angolo della cucina
  railRun(b, M, [S.stairOpeningEndX + 6, e], [S.mainLength - 3, e]);
  // filo ovest dell'ala est, sopra la cucina, fino alla falda
  railRun(b, M, [S.mainLength + 3, e], [S.mainLength + 3, D - 2], { postEvery: 95 });
  // lato corridoio del vano scala: bacchette fitte
  railRun(b, M, [0, S.corridorW + 3], [S.stairOpeningEndX, S.corridorW + 3], { rails: [], balusters: 11 });
  const g = b.build('Parapetti');
  info(g, 'Parapetti del soppalco', 'Ferro nero, h 100 cm, corrimano tondo e correnti intermedi');
  return g;
}

// ---------------------------------------------------------------------------
// Parapetto in mattoni, cancelletto curvo, ascensore

export function buildStairEnclosure(M) {
  const g = new THREE.Group();
  g.name = 'recinto scala';
  const p = S.parapet;

  const wall = boxAt(M.brickNew, p.x, 0, p.z0, p.x + p.t, p.h, p.z1);
  info(wall, 'Parapetto in mattoni', `Listelli di laterizio, h ${p.h} cm, lungo ${p.z1 - p.z0} cm`);
  g.add(wall);
  const pier = boxAt(M.brickNew, p.x - 2, 0, p.z0 - 12, p.x + 24, p.h + 8, p.z0 + 12);
  info(pier, 'Pilastrino in mattoni', 'Testa del parapetto verso il soppalco');
  g.add(pier);
  // pulsantiera di chiamata ascensore sulla testa sud del parapetto
  g.add(boxAt(M.plasticBlack, p.x + p.t, 88, p.z1 - 10, p.x + p.t + 2, 102, p.z1 - 3));
  g.add(boxAt(M.red, p.x + p.t + 2, 93, p.z1 - 8, p.x + p.t + 2.8, 97, p.z1 - 5));

  g.add(buildGate(M));
  g.add(buildLift(M));
  return g;
}

function buildGate(M) {
  // Cancelletto curvo chiuso tra la testa del parapetto e l'ascensore (foto 3):
  // corda 64 cm, freccia 16 cm verso la stanza.
  const p = S.parapet;
  const z0 = p.z1;
  const z1 = S.lift.z0;
  const chord = z1 - z0;
  const sag = 16;
  const r = (chord * chord) / 4 / (2 * sag) + sag / 2;
  const half = Math.asin(chord / 2 / r);
  const cx = p.x + p.t - (r - sag);
  const cz = (z0 + z1) / 2;
  const h = 100;
  const g = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.CylinderGeometry(r * CM, r * CM, h * CM, 24, 1, true, Math.PI / 2 - half, 2 * half),
    M.perforated,
  );
  const uv = panel.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 2 * half * CM, uv.getY(i) * h * CM);
  panel.position.set(cx * CM, (h / 2 + 10) * CM, cz * CM);
  g.add(panel);
  const frame = new Batch();
  const pts = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 - half + (i / n) * 2 * half;
    pts.push([cx + Math.sin(a) * r, cz + Math.cos(a) * r]);
  }
  for (const y of [10, 10 + h]) {
    for (let i = 0; i < n; i++) frame.add(rodGeo([pts[i][0], y, pts[i][1]], [pts[i + 1][0], y, pts[i + 1][1]], 1, 6), M.steel);
  }
  for (const q of [pts[0], pts[n / 2], pts[n]]) {
    frame.add(rodGeo([q[0], 3, q[1]], [q[0], 10 + h, q[1]], 1.1, 6), M.steel);
    frame.add(cylGeoAt(q[0], 0, q[1], 2.5, 4, 12), M.rubber); // ruotine
  }
  g.add(frame.build());
  info(g, 'Cancelletto curvo', 'Lamiera forata su ruote: chiude il varco del primo gradino (accesso da verificare)');
  return g;
}

function buildLift(M) {
  const l = S.lift;
  const g = new THREE.Group();
  g.name = 'ascensore';
  const b = new Batch();
  const t = 4;
  // montanti e traversi del telaio
  for (const [x, z] of [
    [l.x1 - t, l.z0],
    [l.x1 - t, l.z1 - t],
    [l.x0, l.z0],
  ]) {
    b.add(boxGeoAt(x, 0, z, x + t, l.h, z + t), M.steel);
  }
  b.add(boxGeoAt(l.x0, l.h - 6, l.z0, l.x1, l.h, l.z0 + t), M.steel);
  b.add(boxGeoAt(l.x1 - t, l.h - 6, l.z0, l.x1, l.h, l.z1), M.steel);
  b.add(boxGeoAt(l.x0, 0, l.z0, l.x1, 6, l.z0 + t), M.steel);
  // tetto della cabina
  b.add(boxGeoAt(l.x0, l.h, l.z0, l.x1, l.h + 14, l.z1), M.steelMatte);
  // porta sul lato est: telaio, vetro, maniglia
  const dz0 = l.z0 + 30;
  b.add(boxGeoAt(l.x1 - 3, 6, dz0, l.x1, l.h - 6, dz0 + 5), M.steel);
  b.add(boxGeoAt(l.x1 - 3, 6, l.z1 - 9, l.x1, l.h - 6, l.z1 - 4), M.steel);
  b.add(boxGeoAt(l.x1 - 3, 110, dz0 + 5, l.x1, 116, l.z1 - 9), M.steel);
  b.add(boxGeoAt(l.x1, 100, l.z1 - 22, l.x1 + 3, 118, l.z1 - 18), M.brushed);
  // guide e puleggia sopra la cabina, fino alla trave
  for (const z of [l.z0 + 20, l.z1 - 20]) b.add(boxGeoAt(l.x1 - 30, l.h + 14, z - 2, l.x1 - 26, 314, z + 2), M.steel);
  g.add(b.build('Ascensore'));

  // pannelli: lamiera forata a nord e nel fisso est, vetro nella porta
  const perfN = boxAt(M.perforated, l.x0 + t, 6, l.z0 + 1, l.x1 - t, l.h - 6, l.z0 + 2);
  const perfE = boxAt(M.perforated, l.x1 - 2, 6, l.z0 + t, l.x1 - 1, l.h - 6, dz0);
  const glass = boxAt(M.tinted, l.x1 - 2, 6, dz0 + 5, l.x1 - 1, l.h - 6, l.z1 - 9);
  g.add(perfN, perfE, glass);

  const wheel = new THREE.Mesh(new THREE.TorusGeometry(15 * CM, 3 * CM, 10, 32), M.steel);
  wheel.position.set((l.x1 - 28) * CM, 300 * CM, ((l.z0 + l.z1) / 2) * CM);
  wheel.rotation.y = Math.PI / 2;
  g.add(wheel);
  const hub = cylAt(M.steel, l.x1 - 28, 297, (l.z0 + l.z1) / 2, 4, 6, 12);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  const cable = new THREE.Mesh(rodGeo([l.x1 - 28, l.h + 14, (l.z0 + l.z1) / 2 + 15], [l.x1 - 28, 300, (l.z0 + l.z1) / 2 + 15], 0.4, 6), M.steel);
  g.add(cable);

  info(g, 'Ascensore', `Cabina ${l.x1 - l.x0} × ${l.z1 - l.z0} cm con porta vetrata, telaio in ferro e lamiera forata`);
  return g;
}

export { roofY };
