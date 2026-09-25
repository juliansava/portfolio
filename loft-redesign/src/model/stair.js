// Scale in ferro nero.
//
// Soppalco: due gradini neri nell'angolo nord-ovest (foto 7), quattro gradini a
// ventaglio attorno al perno (85, 130) e rampa a spina centrale verso est
// fino al filo 340. 18 alzate da 18,3 cm.
//
// Piano terra (ipotesi, manca la pianta): scala a U in lamiera mandorlata.
// Prima rampa verso nord accanto alla seconda, pianerottolo sotto l'angolo
// nord-ovest, seconda rampa verso sud nel vano dietro il parapetto, sbarco
// nella gabbia in ferro. 21 alzate da 18,1 cm.

import * as THREE from 'three';
import { S, groundRiserH } from '../survey.js';
import { CM, boxGeo, boxGeoAt, cylGeoAt, prismGeo, rodGeo, tubeGeo, Batch, info } from '../lib/geo.js';

const R = S.mezzTop / S.stair.risers; // 18,33 cm
const W = S.stair.width; // 85
const [PX, PZ] = S.stair.pivot; // perno dei ventagli (85, 130)
const Z_EDGE = S.mezzEdgeZ; // 212: lato sud della rampa
const X_END = S.stairOpeningEndX; // 340
const BLK = S.stair.block;
const WINDERS = 4;
const FIRST_FLIGHT = 3 + WINDERS; // primo gradino della rampa: 6
const FLIGHT = S.stair.risers - FIRST_FLIGHT; // 12 pedate
const GOING = (X_END - PX) / FLIGHT; // 21,25 cm
const THICK = 4;
const SPINE_R = W / 2; // linea di passo dei ventagli
const SPINE_Z = (PZ + Z_EDGE) / 2; // 171: spina della rampa

// Raggio dal perno: angolo 0 verso ovest, π/2 verso sud.
function ray(a) {
  return [-Math.cos(a), Math.sin(a)];
}
function hitBoundary(a) {
  const [dx, dz] = ray(a);
  const tx = dx < -1e-6 ? PX / -dx : Infinity; // muro ovest
  const tz = dz > 1e-6 ? (Z_EDGE - PZ) / dz : Infinity; // filo sud
  const t = Math.min(tx, tz);
  return [PX + dx * t, PZ + dz * t];
}

// Gradini: poligono (x, z), quota del piano, centro sulla spina.
export function stairSteps() {
  const steps = [];
  // gradini a blocco (lastre spesse su gambe)
  steps.push({ i: 1, poly: rect(BLK.xMid, BLK.z0, BLK.x1, BLK.z1), c: [(BLK.xMid + BLK.x1) / 2, (BLK.z0 + BLK.z1) / 2], block: true });
  steps.push({ i: 2, poly: rect(0.5, BLK.z0, BLK.xMid, BLK.z1), c: [BLK.xMid / 2, (BLK.z0 + BLK.z1) / 2], block: true });
  // ventagli da 22,5°
  const step = Math.PI / 2 / WINDERS;
  for (let k = 0; k < WINDERS; k++) {
    const a0 = k * step;
    const a1 = (k + 1) * step;
    const poly = [[PX, PZ], hitBoundary(a0)];
    const corner = Math.atan2(Z_EDGE - PZ, PX); // spigolo sud-ovest (0, 212)
    if (corner > a0 && corner < a1) poly.push([0, Z_EDGE]);
    poly.push(hitBoundary(a1));
    const [dx, dz] = ray((a0 + a1) / 2);
    steps.push({ i: 3 + k, poly: inset(poly, 0.8), c: [PX + dx * SPINE_R, PZ + dz * SPINE_R], winder: true });
  }
  // rampa verso est
  for (let k = 0; k < FLIGHT; k++) {
    const x0 = PX + GOING * k;
    const x1 = x0 + GOING;
    steps.push({
      i: FIRST_FLIGHT + k,
      poly: rect(x0 - 2, PZ + 2, x1, Z_EDGE - 2),
      c: [(x0 + x1) / 2, SPINE_Z],
    });
  }
  return steps;
}

function rect(x0, z0, x1, z1) {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

function inset(poly, d) {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return poly.map(([x, z]) => {
    const len = Math.hypot(x - cx, z - cz) || 1;
    return [x - ((x - cx) / len) * d, z - ((z - cz) / len) * d];
  });
}

export function buildStair(M) {
  const b = new Batch();
  const steps = stairSteps();

  for (const s of steps) {
    const top = s.i * R;
    if (s.block) {
      // lastra di 8 cm su quattro gambe quadre
      b.add(prismGeo(s.poly, top - 8, top), M.steel);
      const [[x0, z0], , [x1, z1]] = s.poly;
      for (const [x, z] of [
        [x0 + 4, z0 + 4],
        [x1 - 4, z0 + 4],
        [x0 + 4, z1 - 4],
        [x1 - 4, z1 - 4],
      ]) {
        b.add(boxGeoAt(x - 2, 0, z - 2, x + 2, top - 8, z + 2), M.steel);
      }
    } else {
      b.add(prismGeo(s.poly, top - THICK, top), M.steel);
    }
  }

  // Spina: un cilindro per gradino più un braccio verso il successivo
  const spine = steps.filter((s) => !s.block);
  let prev = null;
  for (const s of spine) {
    const top = s.i * R - THICK;
    const bottom = prev ? (s.i - 1) * R - 12 : 0;
    b.add(cylGeoAt(s.c[0], bottom, s.c[1], 5.5, top - bottom, 16), M.steel);
    if (prev) {
      const y0 = (s.i - 1) * R - 12;
      b.add(beamBetween(prev, s.c, y0, y0 + 8, 7), M.steel);
    }
    b.add(cylGeoAt(s.c[0], top - 1.5, s.c[1], 9, 1.5, 16), M.steel);
    prev = s.c;
  }
  // aggancio al bordo del soppalco e piastra a terra
  const yTop = (S.stair.risers - 1) * R - 12;
  b.add(beamBetween(prev, [X_END, prev[1]], yTop, yTop + 8, 7), M.steel);
  b.add(cylGeoAt(spine[0].c[0], 0, spine[0].c[1], 11, 1.5, 16), M.steel);

  // Sostegni a terra: uno sulla spina (dietro il parapetto), uno sul filo
  // sud della rampa (foto 7)
  for (const [x, z, k] of [
    [spine[4].c[0], SPINE_Z, spine[4].i],
    [255, Z_EDGE - 6, 14],
  ]) {
    const y = (k - 1) * R - 12;
    b.add(cylGeoAt(x, 0, z, 3.2, y, 12), M.steel);
    b.add(cylGeoAt(x, 0, z, 8, 1.2, 12), M.steel);
    if (z !== SPINE_Z) b.add(beamBetween([x, z], [x, SPINE_Z], y, y + 5, 4), M.steel);
  }

  // Parapetto lato sud: bacchette doppie per gradino e corrimano tondo,
  // dal muro ovest (sopra il vano della scala del piano terra) al soppalco
  const H = 90;
  const zr = Z_EDGE - 3;
  const rail = [];
  const baluster = (x, top) => b.add(rodGeo([x, top, zr], [x, top + H, zr], 0.75, 6), M.steel);
  for (const s of steps) {
    if (s.block) continue;
    const top = s.i * R;
    if (s.winder) {
      // tratto del ventaglio affacciato sul filo sud
      const xs = s.poly.filter(([, z]) => z > Z_EDGE - 3).map(([x]) => x);
      if (xs.length < 2) continue;
      const a = Math.min(...xs);
      const c = Math.max(...xs);
      for (let x = a + 6; x < c - 3; x += 14) baluster(x, top);
      rail.push([(a + c) / 2, top + H, zr]);
    } else {
      for (const dx of [-GOING / 4, GOING / 4]) baluster(s.c[0] + dx, top);
      rail.push([s.c[0], top + H, zr]);
    }
  }
  // montante al muro e arrivo sul parapetto del soppalco
  rail.unshift([1.5, 4 * R + H, zr]);
  rail.push([X_END + 4, S.mezzTop + 100, zr]);
  const handrail = new THREE.Mesh(tubeGeo(rail, 2.3, 160, 10, 0.2), M.steel);
  b.add(rodGeo([1.5, 4 * R - 6, zr], [1.5, 4 * R + H, zr], 1.4, 8), M.steel);

  const g = b.build('Scala');
  g.add(handrail);
  info(
    g,
    'Scala a spina centrale',
    `${S.stair.risers} alzate da ${R.toFixed(1).replace('.', ',')} cm: 2 gradini a blocco, 4 a ventaglio, rampa di ${FLIGHT} pedate da ${GOING.toFixed(1).replace('.', ',')} cm`,
  );
  return g;
}

// Trave orizzontale a sezione quadra tra due punti del piano.
function beamBetween(a, c, y0, y1, w) {
  const dx = c[0] - a[0];
  const dz = c[1] - a[1];
  const len = Math.hypot(dx, dz);
  const g = new THREE.BoxGeometry(len * CM, (y1 - y0) * CM, w * CM);
  g.rotateY(-Math.atan2(dz, dx));
  g.translate(((a[0] + c[0]) / 2) * CM, ((y0 + y1) / 2) * CM, ((a[1] + c[1]) / 2) * CM);
  return g;
}

// ---------------------------------------------------------------------------
// Scala del piano terra

const G = S.ground.level; // -380
const GR = groundRiserH(); // 18,1
const F1 = S.groundStair.first;
const F2 = S.groundStair.second;
const LD = S.groundStair.landing;
const G1 = (F1.zStart - F1.zEnd) / (F1.risers - 1); // pedata prima rampa
const G2 = (F2.zEnd - F2.zStart) / (F2.risers - 1); // pedata seconda rampa
const Y_LANDING = G + F1.risers * GR;

export function buildGroundStair(M) {
  const b = new Batch();
  const plate = M.diamond;

  // Prima rampa: gradini chiusi in lamiera piegata, cosciali a C
  for (let k = 1; k < F1.risers; k++) {
    const z1 = F1.zStart - (k - 1) * G1;
    const z0 = z1 - G1;
    const top = G + k * GR;
    b.add(boxGeoAt(F1.x0, top - 0.8, z0, F1.x1, top, z1 + 2.5), plate);
    b.add(boxGeoAt(F1.x0, top - 4, z1 + 2, F1.x1, top - 0.8, z1 + 2.5), M.steel);
    b.add(boxGeoAt(F1.x0, top - GR, z1 + 1.5, F1.x1, top - 4, z1 + 2.2), M.steelMatte);
  }
  for (const x of [F1.x0 - 2.5, F1.x1]) {
    b.add(stringer(x, x + 2.5, F1.zStart + 0.6 * G1, G + 8, F1.zEnd - 1, Y_LANDING - 10, 26), M.steel);
  }

  // Pianerottolo su telaio, con piano in lamiera mandorlata
  b.add(boxGeoAt(LD.x0 + 0.5, Y_LANDING - 0.8, LD.z0, LD.x1, Y_LANDING, LD.z1), plate);
  b.add(boxGeoAt(LD.x0 + 0.5, Y_LANDING - 14, LD.z0, LD.x1, Y_LANDING - 0.8, LD.z0 + 5), M.steel);
  b.add(boxGeoAt(LD.x0 + 0.5, Y_LANDING - 14, LD.z1 - 5, LD.x1, Y_LANDING - 0.8, LD.z1), M.steel);
  b.add(boxGeoAt(LD.x1 - 5, Y_LANDING - 14, LD.z0, LD.x1, Y_LANDING - 0.8, LD.z1), M.steel);
  b.add(boxGeoAt(LD.x0 + 0.5, Y_LANDING - 3.5, LD.z0 + 5, LD.x1 - 5, Y_LANDING - 0.8, LD.z1 - 5), M.steelMatte);
  for (const [x, z] of [
    [LD.x1 - 4, LD.z1 - 4],
    [LD.x1 - 4, LD.z0 + 4],
  ]) {
    b.add(boxGeoAt(x - 3, G, z - 3, x + 3, Y_LANDING - 14, z + 3), M.steel);
  }

  // Seconda rampa: pedate a giorno fino al solaio del piano principale
  for (let k = 1; k < F2.risers; k++) {
    const z0 = F2.zStart + (k - 1) * G2;
    const z1 = z0 + G2;
    const top = Y_LANDING + k * GR;
    b.add(boxGeoAt(F2.x0 + 2.5, top - 0.8, z0 - 2.5, F2.x1 - 2.5, top, z1), plate);
    b.add(boxGeoAt(F2.x0 + 2.5, top - 4, z0 - 2.5, F2.x1 - 2.5, top - 0.8, z0 - 1.8), M.steel);
  }
  for (const x of [F2.x0, F2.x1 - 2.5]) {
    b.add(stringer(x, x + 2.5, F2.zStart - 3, Y_LANDING - 4, F2.zEnd, -12, 26), M.steel);
  }

  // Corrimano: lato est della prima rampa, bordo del pianerottolo, seconda rampa
  const H = 92;
  const posts = [];
  const r1 = [];
  for (let k = 1; k < F1.risers; k += 2) {
    const z = F1.zStart - (k - 0.5) * G1;
    const top = G + k * GR;
    posts.push([F1.x1 + 3, top, z]);
    r1.push([F1.x1 + 3, top + H, z]);
  }
  r1.push([F1.x1 + 3, Y_LANDING + H, LD.z0 + 30]);
  r1.push([F1.x1 + 3, Y_LANDING + H, LD.z0 + 3]);
  posts.push([F1.x1 + 3, Y_LANDING, LD.z0 + 30], [F1.x1 + 3, Y_LANDING, LD.z0 + 3]);
  const r2 = [];
  for (let k = 1; k < F2.risers; k += 2) {
    const z = F2.zStart + (k - 0.5) * G2;
    const top = Y_LANDING + k * GR;
    posts.push([F2.x1 + 1, top, z]);
    r2.push([F2.x1 + 1, top + H, z]);
  }
  r2.unshift([F2.x1 + 1, Y_LANDING + H, F2.zStart - 6]);
  posts.push([F2.x1 + 1, Y_LANDING, F2.zStart - 6]);
  for (const [x, y, z] of posts) b.add(rodGeo([x, y, z], [x, y + H, z], 1.1, 8), M.steel);
  // bacchette tra i montanti
  const fill = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay, az] = pts[i];
      const [cx, cy, cz] = pts[i + 1];
      const n = Math.max(1, Math.round(Math.abs(cz - az) / 12));
      for (let j = 1; j < n; j++) {
        const t = j / n;
        const y = ay + (cy - ay) * t;
        b.add(rodGeo([ax, y - H + 4, az + (cz - az) * t], [ax, y - 4, az + (cz - az) * t], 0.6, 6), M.steel);
      }
    }
  };
  fill(r1);
  fill(r2);

  const g = b.build('Scala piano terra');
  g.add(new THREE.Mesh(tubeGeo(r1, 2.2, 80, 10, 0.15), M.steel));
  g.add(new THREE.Mesh(tubeGeo(r2, 2.2, 60, 10, 0.15), M.steel));
  info(
    g,
    'Scala del piano terra',
    `A U in lamiera mandorlata, ${S.groundStair.risers} alzate da ${GR.toFixed(1).replace('.', ',')} cm (ipotesi dalla foto 6)`,
  );
  return g;
}

// Cosciale inclinato: piatto di profondità depth centrato sulla retta
// (z0, y0) → (z1, y1), largo in x da xa a xb.
function stringer(xa, xb, z0, y0, z1, y1, depth) {
  const dz = z1 - z0;
  const dy = y1 - y0;
  const len = Math.hypot(dz, dy);
  const g = boxGeo((xb - xa) * CM, depth * CM, len * CM);
  g.rotateX(-Math.atan2(dy, dz));
  g.translate(((xa + xb) / 2) * CM, ((y0 + y1) / 2) * CM, ((z0 + z1) / 2) * CM);
  return g;
}

// ---------------------------------------------------------------------------
// Quote di calpestio per la passeggiata (cm). Ogni scala dà la quota del
// punto (x, z) se il punto sta nel suo ingombro; chi cammina sceglie quella
// più vicina alla quota a cui si trova.

export function stairHeights(x, z) {
  const out = [];
  // gradini a blocco
  if (z >= BLK.z0 && z <= BLK.z1) {
    if (x >= BLK.xMid && x <= BLK.x1) out.push(R);
    else if (x >= 0 && x < BLK.xMid) out.push(2 * R);
  }
  // ventagli: rampa sull'angolo attorno al perno
  if (x >= 0 && x <= PX && z > PZ && z <= Z_EDGE) {
    const a = Math.atan2(z - PZ, PX - x);
    const t = Math.min(1, Math.max(0, a / (Math.PI / 2)));
    out.push(3 * R + t * (WINDERS - 1) * R);
  }
  // rampa verso est
  if (x > PX && x <= X_END && z > PZ && z <= Z_EDGE) {
    const t = (x - PX) / (X_END - PX);
    out.push(FIRST_FLIGHT * R + t * (S.mezzTop - FIRST_FLIGHT * R));
  }
  // piano terra: prima rampa, pianerottolo, seconda rampa
  if (x >= F1.x0 && x <= F1.x1 && z > F1.zEnd && z <= F1.zStart + 12) {
    const t = Math.min(1, Math.max(0, (F1.zStart + G1 / 2 - z) / (F1.zStart + G1 / 2 - F1.zEnd)));
    out.push(G + t * F1.risers * GR);
  }
  if (x >= LD.x0 && x <= LD.x1 && z >= LD.z0 && z <= LD.z1) out.push(Y_LANDING);
  if (x >= F2.x0 && x <= F2.x1 && z > F2.zStart && z < F2.zEnd + 4) {
    const t = Math.min(1, Math.max(0, (z - F2.zStart) / (F2.zEnd - F2.zStart)));
    out.push(Y_LANDING + t * (F2.risers * GR));
  }
  return out;
}

export { R as RISER, Y_LANDING };
