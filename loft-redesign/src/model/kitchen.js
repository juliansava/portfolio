// Cucina lungo il tramezzo: basi in ciliegio su gambe, piano in acciaio,
// pensile a vetri satinati, cappa conica nera, frigorifero Miele.

import * as THREE from 'three';
import { S } from '../survey.js';
import { CM, boxAt, boxGeoAt, cylAt, cylGeoAt, rodGeo, tubeGeo, Batch, info, place } from '../lib/geo.js';

const XW = S.mainLength; // 870: filo del tramezzo (rivestito da 2 cm di listelli)
const XB = XW - 2;

export function buildKitchen(M, lamps) {
  const g = new THREE.Group();
  g.name = 'cucina';

  // Pilastrino in mattoni a fine piano
  const pier = boxAt(M.brickNew, XB - 58, 0, 214, XB, 106, 248);
  info(pier, 'Testata in mattoni', 'Chiude il piano di lavoro verso la porta del bagno');
  g.add(pier);

  const z0 = 250;
  const units = [
    { z0: 250, z1: 362, kind: 'sink' },
    { z0: 364, z1: 420, kind: 'door' },
    { z0: 422, z1: 497, kind: 'open' },
  ];
  const b = new Batch();
  for (const u of units) baseUnit(b, M, u);
  const basi = b.build('Basi cucina');
  info(basi, 'Basi della cucina', 'Ciliegio massello su gambe, ripiani a doghe, 247 cm in totale');
  g.add(basi);

  // Piano in acciaio con vasca e alzatina
  const top = new Batch();
  const y0 = 88;
  const y1 = 90;
  const sink = { x0: XB - 50, x1: XB - 12, z0: 270, z1: 334 };
  const xf = XB - 62;
  top.add(boxGeoAt(xf, y0, z0, sink.x0, y1, 497), M.stainless);
  top.add(boxGeoAt(sink.x1, y0, z0, XB, y1, 497), M.stainless);
  top.add(boxGeoAt(sink.x0, y0, z0, sink.x1, y1, sink.z0), M.stainless);
  top.add(boxGeoAt(sink.x0, y0, sink.z1, sink.x1, y1, 497), M.stainless);
  top.add(boxGeoAt(XB - 2, y1, z0, XB, y1 + 9, 497), M.stainless);
  top.add(boxGeoAt(xf - 1, y0 - 4, z0, xf, y1, 497), M.stainless);
  // vasca
  top.add(boxGeoAt(sink.x0, y0 - 18, sink.z0, sink.x1, y0 - 17, sink.z1), M.brushed);
  top.add(boxGeoAt(sink.x0, y0 - 18, sink.z0, sink.x0 + 1, y0, sink.z1), M.brushed);
  top.add(boxGeoAt(sink.x1 - 1, y0 - 18, sink.z0, sink.x1, y0, sink.z1), M.brushed);
  top.add(boxGeoAt(sink.x0, y0 - 18, sink.z0, sink.x1, y0, sink.z0 + 1), M.brushed);
  top.add(boxGeoAt(sink.x0, y0 - 18, sink.z1 - 1, sink.x1, y0, sink.z1), M.brushed);
  // piano cottura a gas
  const hob = { x0: XB - 56, x1: XB - 6, z0: 382, z1: 448 };
  top.add(boxGeoAt(hob.x0, y1, hob.z0, hob.x1, y1 + 1, hob.z1), M.brushed);
  for (const [dx, dz] of [
    [0.3, 0.27],
    [0.3, 0.73],
    [0.72, 0.27],
    [0.72, 0.73],
  ]) {
    const cx = hob.x0 + (hob.x1 - hob.x0) * dx;
    const cz = hob.z0 + (hob.z1 - hob.z0) * dz;
    top.add(cylGeoAt(cx, y1 + 1, cz, 4, 1.5, 16), M.black);
    top.add(boxGeoAt(cx - 10, y1 + 2.5, cz - 0.6, cx + 10, y1 + 3.5, cz + 0.6), M.black);
    top.add(boxGeoAt(cx - 0.6, y1 + 2.5, cz - 10, cx + 0.6, y1 + 3.5, cz + 10), M.black);
  }
  const piano = top.build('Piano');
  info(piano, 'Piano di lavoro', 'Acciaio inox con vasca integrata e piano cottura a 4 fuochi');
  g.add(piano);

  // Miscelatore a collo di cigno
  const faucet = new Batch();
  faucet.add(cylGeoAt(XB - 7, y1, 302, 1.6, 24, 12), M.chrome);
  faucet.add(tubeGeo([[XB - 7, y1 + 22, 302], [XB - 8, y1 + 36, 302], [XB - 18, y1 + 38, 302], [XB - 27, y1 + 28, 302]], 1.1, 24, 8, 0.4), M.chrome);
  faucet.add(rodGeo([XB - 7, y1 + 14, 302], [XB - 7, y1 + 16, 294], 0.6), M.chrome);
  g.add(faucet.build('Miscelatore'));

  // Pensile in ciliegio con ante a vetro satinato
  g.add(wallCabinet(M, XB, 262, 362, 150, 208));

  // Mensolina portaspezie con barattoli
  const sp = new Batch();
  sp.add(boxGeoAt(XB - 11, 146, 366, XB, 148, 400), M.cherry);
  sp.add(boxGeoAt(XB - 11, 146, 366, XB - 9, 158, 400), M.cherry);
  sp.add(boxGeoAt(XB - 2, 146, 366, XB, 162, 368), M.cherry);
  sp.add(boxGeoAt(XB - 2, 146, 398, XB, 162, 400), M.cherry);
  for (let i = 0; i < 6; i++) {
    sp.add(cylGeoAt(XB - 5, 148, 370 + i * 5.6, 2, 8.5, 12), M.ceramic);
    sp.add(cylGeoAt(XB - 5, 156.5, 370 + i * 5.6, 1.4, 1.2, 12), M.velvet);
  }
  g.add(sp.build('Portaspezie'));

  // Cappa conica nera con canna fumaria
  const hood = new THREE.Group();
  const cz = (hob.z0 + hob.z1) / 2;
  const cx = XB - 33;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(9 * CM, 38 * CM, 44 * CM, 40, 1, true), M.steelMatte);
  cone.material = cone.material.clone();
  cone.material.side = THREE.DoubleSide;
  cone.position.set(cx * CM, (168 + 22) * CM, cz * CM);
  hood.add(cone);
  hood.add(cylAt(M.stainless, cx, 166, cz, 38.5, 3, 40));
  hood.add(cylAt(M.brushed, cx, 170, cz, 34, 0.5, 40));
  const flue = new Batch();
  flue.add(cylGeoAt(cx, 212, cz, 8, 88, 20), M.steelMatte);
  flue.add(tubeGeo([[cx, 296, cz], [cx, 302, cz], [cx + 8, 305, cz], [XB + 2, 305, cz]], 8, 16, 16, 0.3), M.steelMatte);
  hood.add(flue.build());
  info(hood, 'Cappa conica', 'Acciaio verniciato nero, Ø 76 cm, canna fumaria Ø 16 cm');
  g.add(hood);

  // Frigorifero combinato in acciaio (Miele)
  const fr = new THREE.Group();
  const f = { x0: 702, x1: 762, z0: 435, z1: 499, h: 186 };
  fr.add(boxAt(M.stainless, f.x0, 1, f.z0, f.x1, f.h, f.z1));
  fr.add(boxAt(M.black, f.x0 + 0.5, 74, f.z0 - 0.3, f.x1 - 0.5, 74.8, f.z0));
  fr.add(boxAt(M.black, f.x0, 0, f.z0 + 3, f.x1, 1, f.z1));
  fr.add(boxAt(M.brushed, f.x0 + 22, 176, f.z0 - 0.3, f.x0 + 38, 178, f.z0));
  info(fr, 'Frigorifero combinato', '60 × 65 × 186 cm, acciaio inox');
  g.add(fr);

  // Setto in mattoni verso ovest: alto accanto al frigo, basso in testa
  const st = S.kitchenStub;
  const stub = new THREE.Group();
  // pilastrino alto solo contro il muro sud (foto 2); il resto è basso (foto 3)
  stub.add(boxAt(M.brickNew, st.x - st.t / 2, 0, 468, st.x + st.t / 2, 182, st.z1));
  stub.add(boxAt(M.brickNew, st.x - st.t / 2, 0, st.z0, st.x + st.t / 2, 112, 468));
  info(stub, 'Setto in mattoni', `Divide la cucina dall'open space, ${st.z1 - st.z0} cm`);
  g.add(stub);

  // Lampade a sospensione in vetro prismatico
  for (const z of [318, 380]) {
    const p = pendant(M);
    place(p, XB - 24, 0, z);
    g.add(p);
    lamps.push({ x: XB - 24, y: 214, z, color: '#ffd29a', power: 1.1, dist: 4 });
    const cable = new THREE.Mesh(rodGeo([XB - 24, 240, z], [XB - 2, 300, z], 0.25, 4), M.black);
    g.add(cable);
  }

  // Lampada ad arco a muro nell'angolo
  const arc = new Batch();
  const ax = 786;
  arc.add(rodGeo([ax, 18, 497], [ax, 232, 497], 0.9), M.steel);
  arc.add(tubeGeo([[ax, 230, 497], [ax, 246, 492], [ax, 244, 480], [ax, 222, 474]], 0.9, 24, 8, 0.5), M.steel);
  arc.add(boxGeoAt(ax - 3, 16, 495, ax + 3, 22, 499), M.steel);
  g.add(arc.build('Lampada ad arco'));
  const sh = shade(M, 13, 11);
  place(sh, ax, 208, 474);
  g.add(sh);
  lamps.push({ x: ax, y: 205, z: 474, color: '#ffcf8f', power: 1.2, dist: 3.5 });

  // Tubo della cappa lungo il muro sud dell'ala est (foto soppalco 2)
  const pipe = new THREE.Mesh(
    tubeGeo(
      [
        [S.mainLength + 30, S.mezzTop + 12, S.depth - 20],
        [1000, S.mezzTop + 12, S.depth - 24],
        [1080, S.mezzTop + 14, S.depth - 40],
        [1085, S.mezzTop + 40, S.depth - 60],
      ],
      9,
      40,
      12,
      0.3,
    ),
    M.steelMatte,
  );
  info(pipe, 'Tubo di aspirazione', "Uscita della cappa, lungo il muro sud dell'ala est");
  pipe.userData.level = 'mezz';
  g.add(pipe);

  return g;
}

function baseUnit(b, M, u) {
  const x0 = XB - 58;
  const x1 = XB - 2;
  const { z0, z1 } = u;
  const H = 86;
  const leg = 4.5;
  for (const [x, z] of [
    [x0, z0],
    [x1 - leg, z0],
    [x0, z1 - leg],
    [x1 - leg, z1 - leg],
  ]) {
    b.add(boxGeoAt(x, 0, z, x + leg, H, z + leg), M.cherry);
  }
  // fianchi a telaio e ripiano a doghe
  b.add(boxGeoAt(x0, H - 16, z0, x1, H, z0 + 2), M.cherry);
  b.add(boxGeoAt(x0, H - 16, z1 - 2, x1, H, z1), M.cherry);
  b.add(boxGeoAt(x0, 8, z0, x0 + leg, 12, z1), M.cherry);
  b.add(boxGeoAt(x1 - leg, 8, z0, x1, 12, z1), M.cherry);
  for (let x = x0 + 5; x < x1 - 5; x += 7.5) b.add(boxGeoAt(x, 11, z0 + 2, x + 5, 13, z1 - 2), M.cherry);
  if (u.kind !== 'sink') b.add(boxGeoAt(x0, H - 2, z0, x1, H, z1), M.cherry);
  const fx = x0 - 0.5;
  if (u.kind === 'sink') {
    const mid = (z0 + z1) / 2;
    drawer(b, M, fx, H - 17, z0 + leg, mid - 0.5);
    drawer(b, M, fx, H - 17, mid + 0.5, z1 - leg);
    // sifone sotto la vasca
    b.add(cylGeoAt(XB - 31, 30, 302, 2.2, 42, 10), M.steelMatte);
  } else if (u.kind === 'door') {
    drawer(b, M, fx, H - 17, z0 + leg, z1 - leg);
    b.add(boxGeoAt(fx, 13, z0 + leg, fx + 2, H - 18, z1 - leg), M.cherry);
    b.add(boxGeoAt(fx - 1.5, 55, z1 - leg - 6, fx, 60, z1 - leg - 4), M.brushed);
  } else {
    const mid = (z0 + z1) / 2;
    drawer(b, M, fx, H - 17, z0 + leg, mid - 0.5);
    drawer(b, M, fx, H - 17, mid + 0.5, z1 - leg);
  }
}

function drawer(b, M, x, y, z0, z1) {
  b.add(boxGeoAt(x, y, z0, x + 2, y + 15, z1), M.cherry);
  const zc = (z0 + z1) / 2;
  b.add(boxGeoAt(x - 1.8, y + 6, zc - 5, x, y + 9, zc + 5), M.brushed);
}

function wallCabinet(M, xw, z0, z1, y0, y1) {
  const g = new THREE.Group();
  const d = 34;
  const x0 = xw - d;
  const b = new Batch();
  b.add(boxGeoAt(x0, y0, z0, xw, y0 + 2, z1), M.cherry);
  b.add(boxGeoAt(x0, y1 - 2, z0, xw, y1, z1), M.cherry);
  b.add(boxGeoAt(x0, y0, z0, xw, y1, z0 + 2), M.cherry);
  b.add(boxGeoAt(x0, y0, z1 - 2, xw, y1, z1), M.cherry);
  const mid = (z0 + z1) / 2;
  for (const [a, c] of [
    [z0, mid - 0.4],
    [mid + 0.4, z1],
  ]) {
    const s = 6;
    b.add(boxGeoAt(x0 - 2, y0, a, x0, y1, a + s), M.cherry);
    b.add(boxGeoAt(x0 - 2, y0, c - s, x0, y1, c), M.cherry);
    b.add(boxGeoAt(x0 - 2, y0, a, x0, y0 + s, c), M.cherry);
    b.add(boxGeoAt(x0 - 2, y1 - s, a, x0, y1, c), M.cherry);
    b.add(cylGeoAt(x0 - 3.5, y0 + 26, a === z0 ? c - 9 : a + 9, 1.2, 1.5, 10), M.brass);
    b.add(boxGeoAt(x0 - 1.2, y0 + s, a + s, x0 - 0.8, y1 - s, c - s), M.frosted);
  }
  // sottopensile in acciaio (luce)
  b.add(boxGeoAt(x0 + 2, y0 - 3, z0 + 2, xw - 2, y0, z1 - 2), M.brushed);
  const m = b.build('Pensile');
  g.add(m);
  info(g, 'Pensile a vetri', `Ciliegio, ante in vetro satinato, ${z1 - z0} × ${y1 - y0} cm`);
  return g;
}

export function marbleTable(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(cylGeoAt(0, 0, 0, 22, 3, 24, 18), M.steelMatte);
  b.add(cylGeoAt(0, 3, 0, 3.2, 66, 16), M.steelMatte);
  b.add(cylGeoAt(0, 69, 0, 12, 4, 20, 4), M.steelMatte);
  b.add(cylGeoAt(0, 73, 0, 40, 2.8, 48), M.marble);
  g.add(b.build('Tavolino'));
  info(g, 'Tavolino tondo', 'Piano in marmo bianco Ø 80 cm, piede in ghisa');
  return g;
}

// Sospensione in vetro prismatico (tipo Holophane)
export function pendant(M) {
  const g = new THREE.Group();
  const pts = [];
  const prof = [
    [1, 26],
    [3, 25],
    [4.2, 22],
    [6, 18],
    [9, 12],
    [12, 6],
    [14, 2],
    [14.5, 0],
  ];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r * CM, y * CM));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), M.lampGlass);
  glass.position.y = 214 * CM;
  g.add(glass);
  g.add(cylAt(M.brass, 0, 240, 0, 1.8, 4, 12));
  g.add(new THREE.Mesh(rodGeo([0, 240, 0], [0, 244, 0], 0.3), M.black));
  const cord = new THREE.Mesh(rodGeo([0, 240, 0], [0, 300, 0], 0.25, 4), M.black);
  cord.visible = false;
  g.add(cord);
  info(g, 'Sospensione in vetro prismatico', 'Ø 29 cm');
  return g;
}

// Paralume in vetro per lampade ad arco
export function shade(M, r = 12, h = 10) {
  const pts = [
    [2, h + 2],
    [3, h],
    [r * 0.55, h * 0.55],
    [r, 0.5],
    [r + 0.5, 0],
  ].map(([a, b]) => new THREE.Vector2(a * CM, b * CM));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), M.lampGlass);
  return m;
}
