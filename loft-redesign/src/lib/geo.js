// Aiuti geometrici. Le funzioni "At" ricevono coordinate in centimetri
// (come il rilievo) e restituiscono mesh in metri.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const CM = 0.01;

// Box con UV in metri: la texture si ripete secondo la sua misura reale.
export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * dims[f][0], uv.getY(idx) * dims[f][1]);
    }
  }
  return g;
}

// Mesh a parallelepipedo tra due spigoli opposti (cm).
export function boxAt(mat, x0, y0, z0, x1, y1, z1) {
  const w = Math.abs(x1 - x0) * CM;
  const h = Math.abs(y1 - y0) * CM;
  const d = Math.abs(z1 - z0) * CM;
  const m = new THREE.Mesh(boxGeo(w, h, d), mat);
  m.position.set(((x0 + x1) / 2) * CM, ((y0 + y1) / 2) * CM, ((z0 + z1) / 2) * CM);
  return m;
}

// Geometria (non mesh) di un box tra due spigoli, già traslata.
export function boxGeoAt(x0, y0, z0, x1, y1, z1) {
  const g = boxGeo(Math.abs(x1 - x0) * CM, Math.abs(y1 - y0) * CM, Math.abs(z1 - z0) * CM);
  g.translate(((x0 + x1) / 2) * CM, ((y0 + y1) / 2) * CM, ((z0 + z1) / 2) * CM);
  return g;
}

// Box con spigoli arrotondati (imbottiti, cuscini), UV in metri.
export function roundBoxGeo(w, h, d, r, seg = 2) {
  const g = new RoundedBoxGeometry(w * CM, h * CM, d * CM, seg, r * CM);
  const uv = g.attributes.uv;
  const n = uv.count / 6;
  const dims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let i = 0; i < uv.count; i++) {
    const f = Math.min(5, Math.floor(i / n));
    uv.setXY(i, uv.getX(i) * dims[f][0] * CM, uv.getY(i) * dims[f][1] * CM);
  }
  return g;
}

export function roundBoxAt(x0, y0, z0, x1, y1, z1, r, seg = 2) {
  const g = roundBoxGeo(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), r, seg);
  g.translate(((x0 + x1) / 2) * CM, ((y0 + y1) / 2) * CM, ((z0 + z1) / 2) * CM);
  return g;
}

// Lastra orizzontale a forma di ovale (stadio) w × d, da y0 a y1, centrata.
export function stadiumGeo(w, d, y0, y1, bevel = 0) {
  const r = Math.min(w, d) / 2;
  const a = (w - 2 * r) / 2;
  const s = new THREE.Shape();
  s.moveTo(-a * CM, -r * CM);
  s.lineTo(a * CM, -r * CM);
  s.absarc(a * CM, 0, r * CM, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-a * CM, r * CM);
  s.absarc(-a * CM, 0, r * CM, Math.PI / 2, (3 * Math.PI) / 2, false);
  const b = Math.min(bevel, (y1 - y0) / 2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: (y1 - y0 - 2 * b) * CM,
    bevelEnabled: b > 0,
    bevelThickness: b * CM,
    bevelSize: b * CM,
    bevelSegments: 3,
    curveSegments: 24,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, (y0 + b) * CM, 0);
  return g;
}

// Disco orizzontale (tavoli tondi) con bordo smussato.
export function discGeo(r, y0, y1, bevel = 0, seg = 48) {
  const s = new THREE.Shape();
  s.absarc(0, 0, (r - bevel) * CM, 0, Math.PI * 2, false);
  const b = Math.min(bevel, (y1 - y0) / 2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: (y1 - y0 - 2 * b) * CM,
    bevelEnabled: b > 0,
    bevelThickness: b * CM,
    bevelSize: b * CM,
    bevelSegments: 3,
    curveSegments: seg,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, (y0 + b) * CM, 0);
  return g;
}

// Fascia ad arco (schienali avvolgenti): corona circolare tra rIn e rOut,
// centrata sulla direzione -z (dietro), ampia 2·half radianti, da y0 a y1.
export function arcBandGeo(rOut, rIn, half, y0, y1, bevel = 0, seg = 24) {
  const a0 = Math.PI / 2 - half;
  const a1 = Math.PI / 2 + half;
  const s = new THREE.Shape();
  s.absarc(0, 0, rOut * CM, a0, a1, false);
  s.absarc(0, 0, rIn * CM, a1, a0, true);
  const b = Math.min(bevel, (y1 - y0) / 2, (rOut - rIn) / 2 - 0.1);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: (y1 - y0 - 2 * b) * CM,
    bevelEnabled: b > 0,
    bevelThickness: b * CM,
    bevelSize: b * CM,
    bevelSegments: 4,
    curveSegments: seg,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, (y0 + b) * CM, 0);
  return g;
}

// Cilindro verticale con base in (x, y0, z), cm.
export function cylAt(mat, x, y0, z, r, h, seg = 24, rTop = r) {
  const g = new THREE.CylinderGeometry(rTop * CM, r * CM, h * CM, seg);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x * CM, (y0 + h / 2) * CM, z * CM);
  return m;
}

export function cylGeoAt(x, y0, z, r, h, seg = 16, rTop = r) {
  const g = new THREE.CylinderGeometry(rTop * CM, r * CM, h * CM, seg);
  g.translate(x * CM, (y0 + h / 2) * CM, z * CM);
  return g;
}

// Cilindro tra due punti qualsiasi (cm).
export function rodGeo(a, b, r, seg = 10) {
  const A = new THREE.Vector3(a[0], a[1], a[2]).multiplyScalar(CM);
  const B = new THREE.Vector3(b[0], b[1], b[2]).multiplyScalar(CM);
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r * CM, r * CM, len, seg, 1, false);
  const dir = B.clone().sub(A).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyQuaternion(q);
  const mid = A.add(B).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

// Tubo lungo una polilinea (cm), con curve morbide.
export function tubeGeo(points, r, segments = 64, radial = 10, tension = 0.1) {
  const pts = points.map((p) => new THREE.Vector3(p[0] * CM, p[1] * CM, p[2] * CM));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', tension);
  return new THREE.TubeGeometry(curve, segments, r * CM, radial, false);
}

// Prisma da un poligono nel piano orizzontale (x, z in cm), da y0 a y1.
export function prismGeo(poly, y0, y1) {
  const shape = new THREE.Shape();
  poly.forEach(([x, z], i) => {
    // la forma è nel piano XY; ruotando di -90° su X, y della forma diventa -z
    if (i === 0) shape.moveTo(x * CM, -z * CM);
    else shape.lineTo(x * CM, -z * CM);
  });
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: (y1 - y0) * CM, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 * CM, 0);
  return g;
}

// Muro da un profilo (u lungo il muro, v in altezza, cm) con fori.
// start/end: [x, z] della faccia interna. Lo spessore va verso l'esterno
// (a destra percorrendo il muro da start a end, visto dall'alto).
export function wallGeo({ start, end, t, profile, holes = [] }) {
  const shape = new THREE.Shape();
  profile.forEach(([u, v], i) => {
    if (i === 0) shape.moveTo(u * CM, v * CM);
    else shape.lineTo(u * CM, v * CM);
  });
  shape.closePath();
  for (const hole of holes) {
    const p = new THREE.Path();
    hole.forEach(([u, v], i) => {
      if (i === 0) p.moveTo(u * CM, v * CM);
      else p.lineTo(u * CM, v * CM);
    });
    p.closePath();
    shape.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: t * CM, bevelEnabled: false, curveSegments: 1 });
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  // asse locale X -> direzione del muro; asse locale Z -> (-uz, ux)
  const m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(ux, 0, uz),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-uz, 0, ux),
  );
  m.setPosition(start[0] * CM, 0, start[1] * CM);
  g.applyMatrix4(m);
  return g;
}

// Contorno di un arco a tutto sesto (cm, coordinate del muro).
export function archOutline(u0, u1, v0, crown, seg = 24) {
  const w = u1 - u0;
  const r = w / 2;
  const spring = crown - r;
  const pts = [
    [u0, v0],
    [u1, v0],
    [u1, spring],
  ];
  for (let i = 1; i < seg; i++) {
    const a = (i / seg) * Math.PI;
    pts.push([u0 + r + Math.cos(a) * r, spring + Math.sin(a) * r]);
  }
  pts.push([u0, spring]);
  return pts;
}

// Accumula geometrie per materiale e le fonde in poche mesh.
export class Batch {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    const g = geo.index ? geo.toNonIndexed() : geo;
    // uniforma gli attributi per il merge
    if (!g.attributes.uv) {
      const n = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    for (const key of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
    }
    g.clearGroups();
    this.map.get(mat).push(g);
    return this;
  }
  build(name = '') {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, geos] of this.map) {
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = name;
      group.add(mesh);
    }
    return group;
  }
}

// Etichetta informativa per il clic.
export function info(obj, name, detail = '') {
  obj.userData.info = { name, detail };
  return obj;
}

// Rotazione attorno all'asse verticale e posizionamento (cm).
export function place(obj, x, y, z, rotY = 0) {
  obj.position.set(x * CM, y * CM, z * CM);
  obj.rotation.y = rotY;
  return obj;
}
