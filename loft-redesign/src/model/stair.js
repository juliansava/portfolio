// Scala a spina centrale in ferro nero: rampa al piede lungo il muro ovest
// (verso nord), tre gradini a ventaglio nell'angolo, rampa superiore verso
// est fino al soppalco. 18 alzate da 18,3 cm.

import * as THREE from 'three';
import { S } from '../survey.js';
import { CM, boxGeoAt, cylGeoAt, prismGeo, rodGeo, tubeGeo, Batch, info } from '../lib/geo.js';

const R = S.mezzTop / S.stair.risers; // 18,33 cm
const W = S.stair.width; // 85
const Z_START = S.stair.lowerFlightStartZ; // 389
const Z_TURN = S.mezzEdgeZ; // 212
const Z_NORTH = S.corridorW; // 130
const X_END = S.stairOpeningEndX; // 340
const LOWER = 6;
const WINDERS = 3;
const UPPER = S.stair.risers - 1 - LOWER - WINDERS; // 8
const LOWER_GOING = (Z_START - Z_TURN) / LOWER; // 29,5
const UPPER_GOING = (X_END - W) / UPPER; // 31,9
const P = [W, Z_TURN]; // perno dei gradini a ventaglio
const THICK = 4;

// Poligoni (x, z) dei gradini e centro della spina per ciascuno.
export function stairSteps() {
  const steps = [];
  for (let i = 1; i <= LOWER; i++) {
    const z1 = Z_START - LOWER_GOING * (i - 1);
    const z0 = z1 - LOWER_GOING;
    steps.push({
      i,
      poly: [
        [3, z0],
        [W - 2, z0],
        [W - 2, z1 + 2],
        [3, z1 + 2],
      ],
      c: [W / 2, (z0 + z1) / 2],
    });
  }
  // ventaglio: tre settori da 30° attorno al perno P
  const ray = (deg) => {
    const a = (deg * Math.PI) / 180;
    return [-Math.cos(a), -Math.sin(a)];
  };
  const hitWall = (deg) => {
    const [dx, dz] = ray(deg);
    const tx = dx < 0 ? P[0] / -dx : Infinity; // fino a x = 0
    const tz = dz < 0 ? (P[1] - Z_NORTH) / -dz : Infinity; // fino a z = 130
    const t = Math.min(tx, tz);
    return [P[0] + dx * t, P[1] + dz * t];
  };
  const corner = [0, Z_NORTH];
  const sectors = [
    [P, [0, Z_TURN], hitWall(30)],
    [P, hitWall(30), corner, hitWall(60)],
    [P, hitWall(60), [W, Z_NORTH]],
  ];
  sectors.forEach((poly, k) => {
    const deg = 15 + 30 * k;
    const [dx, dz] = ray(deg);
    steps.push({ i: LOWER + 1 + k, poly: inset(poly, 1), c: [P[0] + dx * (W / 2), P[1] + dz * (W / 2)] });
  });
  for (let k = 0; k < UPPER; k++) {
    const x0 = W + UPPER_GOING * k;
    const x1 = x0 + UPPER_GOING;
    steps.push({
      i: LOWER + WINDERS + 1 + k,
      poly: [
        [x0 - 2, Z_NORTH + 2],
        [x1, Z_NORTH + 2],
        [x1, Z_TURN - 2],
        [x0 - 2, Z_TURN - 2],
      ],
      c: [(x0 + x1) / 2, (Z_NORTH + Z_TURN) / 2],
    });
  }
  return steps;
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
    b.add(prismGeo(s.poly, top - THICK, top), M.steel);
  }

  // Spina: un cilindro per gradino più un braccio verso il successivo
  let prev = null;
  for (const s of steps) {
    const top = s.i * R - THICK;
    const bottom = s.i === 1 ? 0 : (s.i - 1) * R - 12;
    b.add(cylGeoAt(s.c[0], bottom, s.c[1], 5.5, top - bottom, 16), M.steel);
    if (prev) {
      const y0 = (s.i - 1) * R - 12;
      b.add(beamBetween(prev, s.c, y0, y0 + 8, 7), M.steel);
    }
    // piastra sotto il gradino
    b.add(cylGeoAt(s.c[0], top - 1.5, s.c[1], 9, 1.5, 16), M.steel);
    prev = s.c;
  }
  // aggancio al bordo del soppalco
  const y17 = (S.stair.risers - 1) * R - 12;
  b.add(beamBetween(prev, [X_END, prev[1]], y17, y17 + 8, 7), M.steel);
  b.add(cylGeoAt(steps[0].c[0], 0, steps[0].c[1], 11, 1.5, 16), M.steel);

  // Sostegni a terra (foto 3 e 4)
  for (const k of [5, 15]) {
    const s = steps[k];
    b.add(cylGeoAt(s.c[0], 0, s.c[1], 3.2, (s.i - 1) * R - 12, 12), M.steel);
    b.add(cylGeoAt(s.c[0], 0, s.c[1], 8, 1.2, 12), M.steel);
  }

  // Bacchette e corrimano sul lato aperto
  const rail = [];
  const H = 90;
  for (const s of steps) {
    const top = s.i * R;
    if (s.i <= LOWER) {
      if (s.i < 3) continue;
      const zc = s.c[1];
      for (const dz of [-7, 7]) b.add(rodGeo([W - 3, top, zc + dz], [W - 3, top + H - (dz > 0 ? 0 : 5), zc + dz], 0.75, 6), M.steel);
      rail.push([W - 3, top + H - 4, zc]);
    } else if (s.i <= LOWER + WINDERS) {
      if (s.i === LOWER + 2) rail.push([W + 1, top + H, Z_TURN + 1]);
    } else {
      const xc = s.c[0];
      for (const dx of [-8, 8]) b.add(rodGeo([xc + dx, top, Z_TURN - 3], [xc + dx, top + H - (dx < 0 ? 5 : 0), Z_TURN - 3], 0.75, 6), M.steel);
      rail.push([xc, top + H - 4, Z_TURN - 3]);
    }
  }
  // montante d'angolo sul perno
  b.add(rodGeo([W + 1, LOWER * R, Z_TURN + 1], [W + 1, (LOWER + 2) * R + H, Z_TURN + 1], 1.4, 8), M.steel);
  rail.push([X_END + 4, S.mezzTop + 100, Z_TURN - 3]);
  const handrail = new THREE.Mesh(tubeGeo(rail, 2.3, 160, 10, 0.2), M.steel);

  const g = b.build('Scala');
  g.add(handrail);
  info(
    g,
    'Scala a spina centrale',
    `${S.stair.risers} alzate da ${R.toFixed(1).replace('.', ',')} cm, larghezza ${W} cm, gradini in ferro nero`,
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

// Quota del piano di calpestio sulla scala (cm), per la passeggiata.
// Restituisce null fuori dall'ingombro della scala.
export function stairHeightAt(x, z) {
  const top = S.mezzTop;
  if (x >= 0 && x <= W && z >= Z_TURN && z <= Z_START + 20) {
    const t = Math.min(1, Math.max(0, (Z_START - z) / (Z_START - Z_TURN)));
    return t * LOWER * R;
  }
  if (x >= 0 && x <= W && z >= Z_NORTH && z < Z_TURN) {
    const a = Math.atan2(P[1] - z, P[0] - x); // 0 = ovest, π/2 = nord
    const t = Math.min(1, Math.max(0, a / (Math.PI / 2)));
    return (LOWER + t * WINDERS) * R;
  }
  if (x > W && x <= X_END && z >= Z_NORTH && z <= Z_TURN) {
    const t = (x - W) / (X_END - W);
    return (LOWER + WINDERS) * R + t * (top - (LOWER + WINDERS) * R);
  }
  return null;
}

export { R as RISER };
