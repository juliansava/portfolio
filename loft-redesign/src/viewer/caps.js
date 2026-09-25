// Campiture delle parti tagliate (poché) per piante e sezioni.
// Ogni solido è descritto dall'ingombro in pianta e dall'estensione
// verticale; il taglio produce una lastra sottile scura sul piano di taglio.

import * as THREE from 'three';
import { S, roofY } from '../survey.js';
import { boxGeoAt, Batch } from '../lib/geo.js';

const L = S.totalLength;
const D = S.depth;
const T = S.wallT;

function solids() {
  const list = [];
  const box = (x0, x1, z0, z1, y0, y1, holes = []) => list.push({ x0, x1, z0, z1, y0, y1, holes });
  box(-T, L + T, -T, 0, 0, roofY(0) + 25);
  box(
    -T,
    L + T,
    D,
    D + T,
    0,
    roofY(D + T) + 24,
    S.windows.map((w) => ({ a0: w.x0, a1: w.x1, y0: w.sill, y1: w.crown, axis: 'x' })),
  );
  // testate: altezza variabile con z
  list.push({ x0: -T, x1: 0, z0: -T, z1: D + T, y0: 0, gable: true, holes: [] });
  list.push({ x0: L, x1: L + T, z0: -T, z1: D + T, y0: 0, gable: true, holes: [] });
  const d = S.bathDoor;
  box(S.mainLength, S.rightX0, 0, D, 0, S.mezzUnder, [{ a0: d.z0, a1: d.z1, y0: 0, y1: d.h, axis: 'z' }]);
  box(S.rightX0, L, S.serviceWallZ - 5, S.serviceWallZ + 5, 0, S.mezzUnder, [
    { a0: S.rightX0 + 20, a1: S.rightX0 + 111, y0: 0, y1: 210, axis: 'x' },
  ]);
  const ch = S.chimney;
  box(ch.x0, ch.x1, 0, ch.depth, 0, S.mezzUnder);
  for (const p of S.northPilasters) box(p.x0, p.x1, 0, p.depth, S.mezzTop, roofY(p.depth));
  for (const x of S.southPilasters) box(x - 25, x + 25, D - 5, D, 0, S.roofAtSouth);
  const st = S.kitchenStub;
  box(st.x - st.t / 2, st.x + st.t / 2, 468, st.z1, 0, 182);
  box(st.x - st.t / 2, st.x + st.t / 2, st.z0, 468, 0, 112);
  const p = S.parapet;
  box(p.x, p.x + p.t, p.z0, p.z1, 0, p.h);
  box(p.x - 2, p.x + 24, p.z0 - 12, p.z0 + 12, 0, p.h + 8);
  box(S.mainLength - 60, S.mainLength - 2, 214, 248, 0, 106);
  for (const c of S.columns) {
    const zc = c.z - c.d / 2 + 1;
    box(c.x - c.d / 2, c.x + c.d / 2, zc - c.d / 2, zc + c.d / 2, 0, S.mezzUnder);
  }
  const l = S.lift;
  box(l.x0, l.x1, l.z0, l.z0 + 4, 0, l.h + 14);
  box(l.x1 - 4, l.x1, l.z0, l.z1, 0, l.h + 14);
  return list;
}

// Pianta: taglio orizzontale alla quota y (cm).
export function planCaps(y, mat) {
  const b = new Batch();
  const y0 = y - 1.2;
  const y1 = y - 0.2;
  for (const s of solids()) {
    let { z0, z1 } = s;
    if (s.gable) {
      // la testata esiste dove roofY(z) + 24 > y
      const zmax = (S.roofAtNorth + 24 - y) / ((S.roofAtNorth - S.roofAtSouth) / D);
      if (zmax <= z0) continue;
      z1 = Math.min(z1, zmax);
    } else if (!(s.y0 < y && s.y1 > y)) continue;
    // fori tagliati dal piano
    const cuts = s.holes.filter((h) => h.y0 < y && h.y1 > y);
    const axis = cuts[0]?.axis;
    const segs = splitSegments(axis === 'z' ? [z0, z1] : [s.x0, s.x1], cuts);
    for (const [a, c] of segs) {
      if (axis === 'z') b.add(boxGeoAt(s.x0, y0, a, s.x1, y1, c), mat);
      else b.add(boxGeoAt(a, y0, z0, c, y1, z1), mat);
    }
  }
  return b.build('Campiture pianta');
}

// Sezione: taglio verticale al piano z (cm), vista da sud.
export function sectionCaps(z, mat) {
  const b = new Batch();
  const zA = z - 1.2;
  const zB = z - 0.2;
  for (const s of solids()) {
    if (!(s.z0 < z && s.z1 > z)) continue;
    const top = s.gable ? roofY(z) + 24 : s.y1;
    const cuts = s.holes.filter((h) => h.axis === 'z' && h.a0 < z && h.a1 > z);
    if (cuts.length) {
      for (const h of cuts) if (h.y1 < top) b.add(boxGeoAt(s.x0, h.y1, zA, s.x1, top, zB), mat);
    } else {
      b.add(boxGeoAt(s.x0, s.y0 ?? 0, zA, s.x1, top, zB), mat);
    }
  }
  // soppalco: tratti di impalcato attraversati dal piano
  const spans = z < S.corridorW ? [[0, L]] : z < S.mezzEdgeZ ? [[S.stairOpeningEndX, L]] : [[S.mainLength, L]];
  for (const [a, c] of spans) b.add(boxGeoAt(a, S.mezzUnder, zA, c, S.mezzTop, zB), mat);
  // catene e trave lungo il muro ovest
  if (z > S.mezzEdgeZ) {
    for (const x of [345, 722]) b.add(boxGeoAt(x - 5.5, S.mezzUnder, zA, x + 5.5, S.mezzUnder + S.beamH, zB), mat);
    b.add(boxGeoAt(0, 314, zA, 11, 336, zB), mat);
  }
  // copertura: tavolato + pacchetto, travetti tagliati
  const r = roofY(z);
  b.add(boxGeoAt(-T - 30, r, zA, L + T + 30, r + 25, zB), mat);
  const n = Math.round(L / 90);
  const step = (L - 80) / (n - 1);
  for (let i = 0; i < n; i++) {
    const cx = 40 + i * step;
    b.add(boxGeoAt(cx - 5, r - 15, zA, cx + 5, r, zB), mat);
  }
  // solaio e fondazione
  b.add(boxGeoAt(-T - 20, -40, zA, L + T + 20, 0, zB), mat);
  return b.build('Campiture sezione');
}

// Sezione trasversale: taglio al piano x (cm), vista verso ovest.
export function sectionCapsX(x, mat) {
  const b = new Batch();
  const xA = x - 1.2;
  const xB = x - 0.2;
  for (const s of solids()) {
    if (s.gable || !(s.x0 < x && s.x1 > x)) continue;
    const cuts = s.holes.filter((h) => h.axis === 'x' && h.a0 < x && h.a1 > x);
    let ranges = [[s.y0, s.y1]];
    for (const h of cuts) {
      ranges = ranges.flatMap(([a, c]) => {
        const out = [];
        if (h.y0 > a) out.push([a, Math.min(c, h.y0)]);
        if (h.y1 < c) out.push([Math.max(a, h.y1), c]);
        return out;
      });
    }
    for (const [a, c] of ranges) b.add(boxGeoAt(xA, a, s.z0, xB, c, s.z1), mat);
  }
  // soppalco (fino al filo o per tutta la profondità nell'ala est)
  const zEdge = x > S.mainLength ? D : x > S.stairOpeningEndX ? S.mezzEdgeZ : S.corridorW;
  b.add(boxGeoAt(xA, S.mezzUnder, 0, xB, S.mezzTop, zEdge), mat);
  // falda: lastra inclinata
  const rise = S.roofAtNorth - S.roofAtSouth;
  const angle = Math.atan2(rise, D);
  const len = Math.hypot(rise, D) + 2 * T + 60;
  const roof = new THREE.BoxGeometry(0.01, 0.25, len / 100);
  roof.rotateX(angle);
  roof.translate((x - 0.7) / 100, (roofY(D / 2) + 12.5) / 100, D / 2 / 100);
  b.add(roof, mat);
  b.add(boxGeoAt(xA, -40, -T - 20, xB, 0, D + T + 20), mat);
  return b.build('Campiture sezione trasversale');
}

function splitSegments([a, c], cuts) {
  const segs = [];
  let cur = a;
  for (const h of [...cuts].sort((p, q) => p.a0 - q.a0)) {
    if (h.a0 > cur) segs.push([cur, h.a0]);
    cur = Math.max(cur, h.a1);
  }
  if (cur < c) segs.push([cur, c]);
  return segs;
}

export function pocheMaterial() {
  return new THREE.MeshBasicMaterial({ color: '#2b2522' });
}
