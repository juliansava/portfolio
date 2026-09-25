// Arredi dello stato di fatto: mobili antichi, bauli, valigie, lampade.
// Posizioni ricavate dalle foto, da considerare indicative.
// Nel redesign questo gruppo viene sostituito, l'involucro resta.

import * as THREE from 'three';
import { S } from '../survey.js';
import { CM, boxAt, boxGeoAt, cylAt, cylGeoAt, rodGeo, tubeGeo, Batch, info, place } from '../lib/geo.js';
import { shade, marbleTable } from './kitchen.js';
import { curvedGate } from './structure.js';

const G = S.ground.level;

export function buildFurniture(M, lamps) {
  const g = new THREE.Group();
  g.name = 'arredi';
  const add = (obj, x, z, rot = 0, y = 0) => {
    place(obj, x, y, z, rot);
    g.add(obj);
    return obj;
  };

  // --- Zona pranzo davanti al parapetto (foto 3 e 4) -------------------------
  add(drawLeafTable(M), 212, 262);
  add(antiqueChair(M), 168, 322, Math.PI);
  add(bistroChair(M), 262, 200, 0);
  add(radiator(M), 118, 300, Math.PI / 2);
  add(chromeUplight(M, lamps, 318, 318), 318, 318);
  add(arcLamp(M, lamps, 140, 372, -0.7), 140, 372, -0.7);
  add(pencilGlass(M), 262, 250, 0, 78);
  add(booklet(M), 215, 266, 0.2, 78);

  // --- Lungo il muro nord, sotto il soppalco ---------------------------------
  add(whiteChest(M), 245, 64);
  add(glassTopDesk(M), 385, 58);
  add(chestOfDrawers(M), 500, 30);
  add(sideTable(M), 612, 44);
  add(hutch(M), 842, 55, -Math.PI / 2);
  add(cardboardBox(M, 70, 34, 80), 790, 60, 0.05);
  add(trunk(M, { w: 82, d: 50, h: 55, bands: true }), 392, 172, 0.12);
  add(trunk(M, { w: 90, d: 52, h: 50, bands: true, dark: true }), 628, 150, -0.05);
  add(cardboardBox(M, 45, 40, 36, true), 628, 152, 0.2, 50);
  add(bag(M), 700, 92);

  // --- Lungo le finestre (foto 1) ---------------------------------------------
  add(velvetArmchair(M), 398, 452, Math.PI + 0.5);
  add(wickerChair(M), 478, 448, Math.PI - 0.35);
  add(gamesTable(M), 572, 418, 0.05);
  add(upholsteredChair(M), 545, 380, 0.3);
  add(upholsteredChair(M), 605, 385, -0.2);
  add(tealTrunk(M), 650, 262, 0.1);
  add(suitcaseStack(M), 648, 412, -0.06);
  add(cardboardBox(M, 48, 40, 40, true), 700, 262, 0.08, 45);
  // dischi e piatti sul davanzale di W1 (foto 1)
  add(records(M), 250, 510, 0, 90).userData.side = 'south';

  // --- Angolo nord-ovest: mensola con abat-jour sopra i gradini neri --------
  const shelf = new Batch();
  shelf.add(boxGeoAt(0, 92, 63, 22, 94, 105), M.walnutLight);
  shelf.add(boxGeoAt(0, 82, 81, 3, 92, 87), M.steel);
  const sh = shelf.build('Mensola');
  sh.userData.side = 'west';
  g.add(sh);
  add(tableLamp(M, lamps, 11, 84, 94), 11, 84, 0, 94);

  // --- Tavolino in marmo in cucina e cancelletto davanti al parapetto ------
  add(marbleTable(M), 748, 318);
  add(curvedGate(M), S.parapet.x + S.parapet.t + 1, 357);

  // Cornici sul muro ovest sopra il parapetto
  for (const [w, h, z, y] of [
    [62, 44, 300, 150],
    [40, 30, 360, 160],
  ]) {
    add(frame(M, w, h), 1, z, Math.PI / 2, y).userData.side = 'west';
  }

  // --- Tende scure sulle finestre alte ----------------------------------------
  for (const w of S.windows.filter((w) => w.crown > 330)) {
    add(curtain(M, w.crown + 30 - 2), w.x0 - 26, S.depth - 12).userData.side = 'south';
  }

  // --- Soppalco: panche basse in ferro lungo il muro nord ---------------------
  add(lowBench(M, 300, 30, 42), 540, 20, 0, S.mezzTop).userData.level = 'mezz';
  add(lowBench(M, 200, 30, 42), 220, 20, 0, S.mezzTop).userData.level = 'mezz';

  // --- Piano terra: atrio come nella foto 6 ---------------------------------
  add(bambooChest(M), 24, 335, Math.PI / 2, G);
  add(wireShelf(M), 0, 290, 0, G).userData.side = 'west';
  for (const z of [420, 468]) add(rodLadder(M), 1, z, 0, G).userData.side = 'west';
  for (const [w, h, z, y] of [
    [34, 44, 250, 185],
    [44, 34, 300, 150],
    [36, 28, 372, 120],
  ]) {
    add(redFrame(M, w, h), 1, z, Math.PI / 2, G + y).userData.side = 'west';
  }
  add(lacquerScreen(M), 268, 318, 0, G);
  add(perforatedFence(M, 125), 268, 425, 0, G);
  const pend = add(enamelPendant(M, 22), 250, 330, 0, G + 262);
  pend.userData.noCollide = true;
  lamps.push({ x: 250, y: G + 262, z: 330, color: '#fff1dc', power: 1.4, dist: 6 });

  return g;
}

// ---------------------------------------------------------------------------
// Pezzi

// Gamba tornita a bulbo (tavolo rinascimentale)
function bulbLeg(h) {
  const prof = [
    [0, 0],
    [3.2, 0],
    [3.6, 2],
    [2.6, 5],
    [3.0, 8],
    [2.2, 11],
    [3.5, 16],
    [6.0, 24],
    [6.8, 32],
    [6.2, 40],
    [4.4, 47],
    [2.8, 51],
    [3.6, 54],
    [2.6, 57],
    [2.6, h - 3],
    [3.4, h - 2],
    [3.4, h],
    [0, h],
  ];
  return new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r * CM, y * CM)),
    20,
  );
}

function drawLeafTable(M) {
  const g = new THREE.Group();
  const L = 180;
  const W = 84;
  const b = new Batch();
  const legH = 66;
  const inset = 14;
  for (const [x, z] of [
    [-L / 2 + inset, -W / 2 + inset],
    [L / 2 - inset, -W / 2 + inset],
    [-L / 2 + inset, W / 2 - inset],
    [L / 2 - inset, W / 2 - inset],
  ]) {
    const leg = bulbLeg(legH);
    leg.translate(x * CM, 0, z * CM);
    b.add(leg, M.walnut);
  }
  // traverse a H vicino a terra
  b.add(boxGeoAt(-L / 2 + inset, 6, -W / 2 + inset - 3, L / 2 - inset, 12, -W / 2 + inset + 3), M.walnut);
  b.add(boxGeoAt(-L / 2 + inset, 6, W / 2 - inset - 3, L / 2 - inset, 12, W / 2 - inset + 3), M.walnut);
  b.add(boxGeoAt(-3, 6, -W / 2 + inset, 3, 12, W / 2 - inset), M.walnut);
  // fascia, prolunghe e piano
  b.add(boxGeoAt(-L / 2 + 8, legH - 12, -W / 2 + 6, L / 2 - 8, legH, W / 2 - 6), M.walnut);
  b.add(boxGeoAt(-L / 2 + 2, legH, -W / 2 + 2, L / 2 - 2, legH + 5, W / 2 - 2), M.walnutLight);
  b.add(boxGeoAt(-L / 2, legH + 5, -W / 2, L / 2, legH + 10, W / 2), M.walnut);
  g.add(b.build('Tavolo'));
  info(g, 'Tavolo allungabile', 'Noce, gambe tornite a bulbo, 180 × 84 cm');
  return g;
}

function antiqueChair(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const w = 44;
  const d = 42;
  for (const [x, z] of [
    [-w / 2, -d / 2],
    [w / 2 - 3.5, -d / 2],
    [-w / 2, d / 2 - 3.5],
    [w / 2 - 3.5, d / 2 - 3.5],
  ]) {
    const back = z > 0;
    b.add(boxGeoAt(x, 0, z, x + 3.5, back ? 98 : 45, z + 3.5), M.walnut);
  }
  b.add(boxGeoAt(-w / 2, 40, -d / 2, w / 2, 45, d / 2), M.walnut);
  b.add(boxGeoAt(-w / 2, 10, -d / 2, w / 2, 13, -d / 2 + 2), M.walnut);
  b.add(boxGeoAt(-w / 2 + 3, 88, d / 2 - 3, w / 2 - 3, 96, d / 2 - 1), M.walnut);
  b.add(boxGeoAt(-6, 50, d / 2 - 2.5, 6, 88, d / 2 - 1.5), M.walnut);
  b.add(boxGeoAt(-w / 2 + 3, 60, d / 2 - 3, w / 2 - 3, 63, d / 2 - 1), M.walnut);
  b.add(boxGeoAt(-w / 2 + 2, 45, -d / 2 + 2, w / 2 - 2, 50, d / 2 - 2), M.cushion);
  g.add(b.build('Sedia'));
  info(g, 'Sedia antica', 'Noce con cuscino in stoffa a pois');
  return g;
}

function bistroChair(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const r = 21;
  for (const [x, z] of [
    [-16, -16],
    [16, -16],
    [-15, 15],
    [15, 15],
  ]) {
    b.add(rodGeo([x * 1.15, 0, z * 1.15], [x, 45, z], 1.4, 8), M.steelMatte);
  }
  b.add(cylGeoAt(0, 44, 0, r, 3, 28), M.steelMatte);
  b.add(cylGeoAt(0, 46.8, 0, r - 2, 0.6, 28), M.wicker);
  b.add(rodGeo([-15, 45, 15], [-17, 92, 19], 1.3, 8), M.steelMatte);
  b.add(rodGeo([15, 45, 15], [17, 92, 19], 1.3, 8), M.steelMatte);
  b.add(tubeGeo([[-17, 92, 19], [0, 96, 23], [17, 92, 19]], 1.3, 16, 8, 0.5), M.steelMatte);
  b.add(tubeGeo([[-16, 70, 18], [0, 73, 21], [16, 70, 18]], 1, 16, 8, 0.5), M.steelMatte);
  const cane = new THREE.TorusGeometry(15 * CM, 1 * CM, 8, 24);
  cane.rotateX(Math.PI / 2);
  cane.translate(0, 20 * CM, 0);
  b.add(cane, M.steelMatte);
  g.add(b.build('Sedia bistrot'));
  info(g, 'Sedia bistrot', 'Legno curvato nero, seduta in paglia di Vienna');
  return g;
}

function radiator(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const n = 11;
  for (let i = 0; i < n; i++) {
    const x = -((n - 1) * 5) / 2 + i * 5;
    b.add(boxGeoAt(x - 1.6, 10, -7, x + 1.6, 64, 7), M.enamel);
    b.add(cylGeoAt(x, 63, 0, 1.6, 1.5, 8), M.enamel);
  }
  b.add(boxGeoAt(-30, 30, -2, 30, 36, 2), M.enamel);
  b.add(boxGeoAt(28, 12, -7.5, 34, 56, 7.5), M.enamel);
  for (const x of [-22, 22]) {
    b.add(boxGeoAt(x - 1, 3, -16, x + 1, 10, 16), M.enamel);
    b.add(cylGeoAt(x, 0, -14, 2.5, 3, 10), M.rubber);
    b.add(cylGeoAt(x, 0, 14, 2.5, 3, 10), M.rubber);
  }
  b.add(boxGeoAt(34, 40, -4, 35, 52, 4), M.red);
  g.add(b.build('Radiatore'));
  info(g, 'Radiatore a olio', 'Elettrico, 11 elementi');
  return g;
}

function chromeUplight(M, lamps, x, z) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(cylGeoAt(0, 0, 0, 14, 3, 32), M.black);
  b.add(cylGeoAt(0, 3, 0, 1.1, 180, 12), M.chrome);
  b.add(cylGeoAt(0, 183, 0, 8, 3, 24, 12), M.chrome);
  g.add(b.build('Lampada da terra'));
  const glow = cylAt(M.bulb, 0, 185.5, 0, 6, 0.6, 20);
  g.add(glow);
  lamps.push({ x, y: 190, z, color: '#fff0d6', power: 1.3, dist: 5 });
  info(g, 'Lampada da terra', 'Stelo cromato, luce indiretta verso il soffitto');
  g.userData.foot = 14;
  return g;
}

function arcLamp(M, lamps, x, z, rot) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(cylGeoAt(0, 0, 0, 13, 2.5, 24), M.steelMatte);
  b.add(rodGeo([0, 2, 0], [0, 150, 0], 0.9), M.steel);
  b.add(tubeGeo([[0, 150, 0], [0, 175, 8], [0, 182, 28], [0, 172, 48], [0, 160, 56]], 0.9, 32, 8, 0.5), M.steel);
  g.add(b.build('Lampada ad arco'));
  const s = shade(M, 12, 10);
  s.position.set(0, 148 * CM, 56 * CM);
  g.add(s);
  const dx = Math.sin(rot) * 56;
  const dz = Math.cos(rot) * 56;
  lamps.push({ x: x + dx, y: 150, z: z + dz, color: '#ffd9a0', power: 1, dist: 3.5 });
  info(g, 'Lampada ad arco', 'Stelo in ferro nero, paralume in vetro');
  g.userData.foot = 13;
  return g;
}

function tableLamp(M, lamps, x, z, y0) {
  const g = new THREE.Group();
  g.add(cylAt(M.brass, 0, 0, 0, 6, 1.5, 16));
  g.add(cylAt(M.brass, 0, 1.5, 0, 1, 16, 8));
  const s = cylAt(M.lampGlass, 0, 16, 0, 11, 16, 24, 8);
  g.add(s);
  lamps.push({ x, y: y0 + 22, z, color: '#ffc47a', power: 0.8, dist: 3 });
  return g;
}

function whiteChest(M) {
  const g = new THREE.Group();
  g.add(boxAt(M.white, -65, 2, -32, 65, 84, 32));
  g.add(boxAt(M.black, -66, 84, -33, 66, 87, 33));
  g.add(boxAt(M.plasticBlack, 12, 70, 32, 28, 76, 33.5));
  g.add(boxAt(M.red, 16, 71, 33.5, 19, 75, 34));
  g.add(boxAt(M.rubber, -65, 0, -32, 65, 2, 32));
  info(g, 'Cassapanca bianca', 'Coperchio in vetro nero, 130 × 64 × 87 cm');
  return g;
}

function glassTopDesk(M) {
  const g = new THREE.Group();
  const b = new Batch();
  for (const [x, z] of [
    [-55, -27],
    [51, -27],
    [-55, 23],
    [51, 23],
  ]) {
    b.add(boxGeoAt(x, 0, z, x + 4, 72, z + 4), M.walnutLight);
  }
  b.add(boxGeoAt(-56, 62, -28, 56, 74, 28), M.walnutLight);
  b.add(boxGeoAt(-58, 74, -30, 58, 77, 30), M.walnut);
  b.add(boxGeoAt(-56, 77, -28, 56, 78, 28), M.clearGlass);
  b.add(boxGeoAt(-20, 64, 28, 20, 72, 29), M.walnut);
  b.add(boxGeoAt(-3, 67, 29, 3, 69, 31), M.brass);
  g.add(b.build('Scrittoio'));
  info(g, 'Scrittoio', 'Noce con piano protetto da vetro, 116 × 60 cm');
  return g;
}

function chestOfDrawers(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-55, 8, -24, 55, 84, 24), M.walnutLight);
  b.add(boxGeoAt(-57, 84, -26, 57, 88, 26), M.walnut);
  for (const [x, z] of [
    [-55, -24],
    [51, -24],
    [-55, 20],
    [51, 20],
  ]) {
    b.add(boxGeoAt(x, 0, z, x + 4, 8, z + 4), M.walnut);
  }
  for (let i = 0; i < 3; i++) {
    const y = 12 + i * 24;
    b.add(boxGeoAt(-52, y, 24, 52, y + 21, 25.5), M.walnut);
    for (const x of [-30, 30]) b.add(cylGeoAt(x, y + 9, 26.5, 1.4, 2, 10), M.brass);
  }
  g.add(b.build('Cassettone'));
  info(g, 'Cassettone', 'Noce a tre cassetti, 114 × 52 × 88 cm');
  return g;
}

function sideTable(M) {
  const g = new THREE.Group();
  const b = new Batch();
  for (const [x, z] of [
    [-38, -22],
    [34, -22],
    [-38, 18],
    [34, 18],
  ]) {
    b.add(boxGeoAt(x, 0, z, x + 4, 72, z + 4), M.walnut);
  }
  b.add(boxGeoAt(-40, 62, -24, 40, 72, 24), M.walnut);
  b.add(boxGeoAt(-42, 72, -26, 42, 76, 26), M.walnutLight);
  b.add(boxGeoAt(-3, 66, 24, 3, 68, 26), M.brass);
  g.add(b.build('Tavolino'));
  info(g, 'Tavolino con cassetto', 'Noce, 84 × 52 cm');
  return g;
}

function hutch(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const W = 120;
  b.add(boxGeoAt(-W / 2, 0, -25, W / 2, 92, 25), M.oakTrunk);
  b.add(boxGeoAt(-W / 2 - 2, 92, -27, W / 2 + 2, 96, 27), M.oakTrunk);
  b.add(boxGeoAt(-W / 2 + 3, 96, -18, W / 2 - 3, 205, 18), M.oakTrunk);
  b.add(boxGeoAt(-W / 2, 205, -21, W / 2, 214, 21), M.oakTrunk);
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -W / 2 + 7 : 1;
    const x1 = s < 0 ? -1 : W / 2 - 7;
    b.add(boxGeoAt(x0, 104, 18, x1, 198, 19), M.clearGlass);
    b.add(boxGeoAt(x0, 12, 25, x1, 82, 26.5), M.oakTrunk);
    b.add(cylGeoAt(s * 4, 50, 27, 1.2, 2, 8), M.brass);
  }
  for (const y of [130, 165]) b.add(boxGeoAt(-W / 2 + 4, y, -16, W / 2 - 4, y + 2, 16), M.oakTrunk);
  g.add(b.build('Credenza'));
  info(g, 'Credenza con vetrina', 'Legno chiaro, 120 × 50 × 214 cm');
  return g;
}

function trunk(M, { w, d, h, bands = true, dark = false }) {
  const g = new THREE.Group();
  const b = new Batch();
  const wood = dark ? M.walnutLight : M.oakTrunk;
  b.add(boxGeoAt(-w / 2, 5, -d / 2, w / 2, h, d / 2), wood);
  if (bands) {
    for (const x of [-w / 2, -w / 4, w / 4 - 3, w / 2 - 3]) b.add(boxGeoAt(x, 5, -d / 2 - 0.6, x + 3, h + 0.6, d / 2 + 0.6), M.steelMatte);
    b.add(boxGeoAt(-w / 2 - 0.6, h - 8, -d / 2 - 0.6, w / 2 + 0.6, h - 5, d / 2 + 0.6), M.steelMatte);
    b.add(boxGeoAt(-w / 2 - 0.6, 5, -d / 2 - 0.6, w / 2 + 0.6, 8, d / 2 + 0.6), M.steelMatte);
  }
  b.add(boxGeoAt(-8, h - 14, d / 2 + 0.6, 8, h - 8, d / 2 + 2), M.brushed);
  for (const [x, z] of [
    [-w / 2 + 6, -d / 2 + 6],
    [w / 2 - 6, -d / 2 + 6],
    [-w / 2 + 6, d / 2 - 6],
    [w / 2 - 6, d / 2 - 6],
  ]) {
    b.add(cylGeoAt(x, 0, z, 2.5, 5, 10), M.rubber);
  }
  g.add(b.build('Baule'));
  info(g, 'Baule', `Legno con reggette in ferro, ${w} × ${d} cm`);
  return g;
}

function tealTrunk(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-45, 0, -27, 45, 42, 27), M.teal);
  b.add(boxGeoAt(-46, 42, -28, 46, 44, 28), M.clearGlass);
  for (const x of [-45, 42]) b.add(boxGeoAt(x, 0, -27.6, x + 3, 42, 27.6), M.brass);
  g.add(b.build('Baule verde'));
  info(g, 'Baule verde acqua', 'Con piano in vetro');
  return g;
}

function suitcaseStack(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const cases = [
    [72, 44, 26],
    [66, 40, 22],
    [60, 38, 20],
    [38, 24, 26],
  ];
  let y = 0;
  cases.forEach(([w, d, h], i) => {
    const off = i % 2 ? 3 : -2;
    b.add(boxGeoAt(-w / 2 + off, y, -d / 2, w / 2 + off, y + h, d / 2), M.cream);
    b.add(boxGeoAt(-w / 2 + off - 0.3, y + h / 2 - 1, -d / 2 - 0.3, w / 2 + off + 0.3, y + h / 2 + 1, d / 2 + 0.3), M.brass);
    for (const x of [-w / 2 + 3, w / 2 - 6]) b.add(boxGeoAt(x + off, y + h / 2 - 4, d / 2, x + off + 3, y + h / 2 + 2, d / 2 + 1), M.brass);
    if (i === 3) b.add(tubeGeo([[-10, y + h, 0], [-8, y + h + 7, 0], [8, y + h + 7, 0], [10, y + h, 0]], 1.2, 12, 6, 0.4), M.cream);
    y += h;
  });
  g.add(b.build('Valigie'));
  info(g, 'Valigie vintage', 'Pila di quattro valigie color crema');
  return g;
}

function velvetArmchair(M) {
  const g = new THREE.Group();
  const b = new Batch();
  // gambe tornite corte
  for (const [x, z] of [
    [-24, -22],
    [24, -22],
    [-22, 20],
    [22, 20],
  ]) {
    b.add(cylGeoAt(x, 0, z, 2, 24, 10, 2.6), M.walnut);
  }
  // seduta imbottita con fascia in noce
  b.add(boxGeoAt(-27, 24, -25, 27, 30, 23), M.walnut);
  const seat = new THREE.CylinderGeometry(27 * CM, 27 * CM, 12 * CM, 24, 1);
  seat.scale(1, 1, 0.95);
  seat.translate(0, 36 * CM, -1 * CM);
  b.add(seat, M.velvet);
  // schienale a medaglione: forma ad arco estrusa
  const sh = new THREE.Shape();
  sh.moveTo(-24 * CM, 0);
  sh.lineTo(24 * CM, 0);
  sh.bezierCurveTo(26 * CM, 30 * CM, 20 * CM, 62 * CM, 0, 66 * CM);
  sh.bezierCurveTo(-20 * CM, 62 * CM, -26 * CM, 30 * CM, -24 * CM, 0);
  const back = new THREE.ExtrudeGeometry(sh, { depth: 9 * CM, bevelEnabled: true, bevelSize: 2 * CM, bevelThickness: 2 * CM, bevelSegments: 3, curveSegments: 16 });
  back.rotateX(-0.12);
  back.translate(0, 40 * CM, 16 * CM);
  b.add(back, M.velvet);
  const rim = new THREE.ExtrudeGeometry(sh, { depth: 3 * CM, bevelEnabled: false, curveSegments: 16 });
  rim.scale(1.08, 1.05, 1);
  rim.rotateX(-0.12);
  rim.translate(0, 38.5 * CM, 25 * CM);
  b.add(rim, M.walnut);
  // braccioli
  for (const s of [-1, 1]) {
    b.add(tubeGeo([[s * 25, 36, -20], [s * 27, 58, -18], [s * 27, 60, 4], [s * 25, 62, 18]], 2, 16, 8, 0.5), M.walnut);
  }
  g.add(b.build('Poltrona'));
  info(g, 'Poltrona Luigi Filippo', 'Velluto arancio, cornice in noce');
  return g;
}

function wickerChair(M) {
  const g = new THREE.Group();
  const prof = [
    [0, 0],
    [24, 0],
    [30, 6],
    [33, 20],
    [34, 40],
  ];
  const shell = new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r * CM, y * CM)),
    32,
    Math.PI * 0.2,
    Math.PI * 1.6,
  );
  const seat = new THREE.Mesh(shell, M.wicker);
  seat.material = M.wicker.clone();
  seat.material.side = THREE.DoubleSide;
  seat.position.y = 30 * CM;
  seat.rotation.x = -0.25;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.SphereGeometry(44 * CM, 24, 16, Math.PI * 0.15, Math.PI * 0.7, 0, Math.PI * 0.5), seat.material);
  back.scale.set(1, 1.5, 0.7);
  back.position.set(0, 58 * CM, 10 * CM);
  back.rotation.y = Math.PI;
  g.add(back);
  g.add(cylAt(M.wicker, 0, 0, 0, 24, 30, 20, 16));
  info(g, 'Poltrona in vimini', 'Schienale alto');
  return g;
}

function gamesTable(M) {
  const g = new THREE.Group();
  const b = new Batch();
  for (const [x, z] of [
    [-33, -24],
    [29, -24],
    [-33, 20],
    [29, 20],
  ]) {
    b.add(boxGeoAt(x, 0, z, x + 4, 72, z + 4), M.walnutLight);
  }
  b.add(boxGeoAt(-35, 62, -26, 35, 72, 26), M.walnutLight);
  b.add(boxGeoAt(-37, 72, -28, 37, 75, 28), M.walnut);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const s = 5;
      const x = -20 + i * s;
      const z = -20 + j * s;
      b.add(boxGeoAt(x, 75, z, x + s, 75.3, z + s), (i + j) % 2 ? M.walnut : M.enamel);
    }
  }
  g.add(b.build('Tavolo da gioco'));
  info(g, 'Tavolo da gioco', 'Intarsio a scacchiera, 74 × 56 cm');
  return g;
}

function upholsteredChair(M) {
  const g = new THREE.Group();
  const b = new Batch();
  for (const [x, z] of [
    [-20, -19],
    [16, -19],
    [-20, 16],
    [16, 16],
  ]) {
    b.add(boxGeoAt(x, 0, z, x + 4, 44, z + 4), M.walnut);
  }
  b.add(boxGeoAt(-21, 40, -20, 21, 48, 21), M.orangeFabric);
  b.add(boxGeoAt(-20, 44, 17, 20, 92, 21), M.walnut);
  b.add(boxGeoAt(-17, 52, 16, 17, 88, 17), M.orangeFabric);
  g.add(b.build('Sedia imbottita'));
  info(g, 'Sedia imbottita', 'Tessuto arancio');
  return g;
}

function cardboardBox(M, w, d, h, tape = false) {
  const g = new THREE.Group();
  g.add(boxAt(M.cardboard, -w / 2, 0, -d / 2, w / 2, h, d / 2));
  if (tape) {
    g.add(boxAt(M.tapeBlue, -3, 0, d / 2, 3, h + 0.2, d / 2 + 0.3));
    g.add(boxAt(M.tapeBlue, -3, h, -d / 2, 3, h + 0.3, d / 2));
  }
  info(g, 'Scatolone', `${w} × ${d} × ${h} cm`);
  return g;
}

function bag(M) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(22 * CM, 14, 10), M.bag);
  m.scale.set(1, 1.2, 0.8);
  m.position.y = 24 * CM;
  g.add(m);
  return g;
}

function records(M) {
  const g = new THREE.Group();
  const b = new Batch();
  for (let i = 0; i < 2; i++) {
    const x = -30 + i * 32;
    b.add(boxGeoAt(x, 0, -24, x + 30, 16 + i * 4, 6), i ? M.paper : M.poster);
  }
  b.add(cylGeoAt(46, 0, -8, 12, 6, 24), M.ceramic);
  g.add(b.build('Dischi'));
  return g;
}

function pencilGlass(M) {
  const g = new THREE.Group();
  g.add(cylAt(M.clearGlass, 0, 0, 0, 5, 12, 16));
  const b = new Batch();
  for (let i = 0; i < 5; i++) b.add(rodGeo([i - 2, 1, 0], [i * 1.5 - 3, 22, i - 2], 0.4, 6), i % 2 ? M.cream : M.teal);
  g.add(b.build());
  return g;
}

function booklet(M) {
  const g = new THREE.Group();
  g.add(boxAt(M.paper, -16, 0, -11, 16, 1.2, 11));
  g.add(boxAt(M.teal, -15, 1.2, -10, 15, 1.5, 10));
  return g;
}

function lowBench(M, length, depth, h) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-length / 2, h - 3, -depth / 2, length / 2, h, depth / 2), M.steel);
  b.add(boxGeoAt(-length / 2 + 4, 8, -depth / 2 + 3, length / 2 - 4, 10, depth / 2 - 3), M.steel);
  const legs = Math.max(2, Math.round(length / 110) + 1);
  for (let i = 0; i < legs; i++) {
    const x = -length / 2 + 3 + (i * (length - 6)) / (legs - 1);
    b.add(boxGeoAt(x - 1.5, 0, -depth / 2 + 2, x + 1.5, h - 3, -depth / 2 + 5), M.steel);
    b.add(boxGeoAt(x - 1.5, 0, depth / 2 - 5, x + 1.5, h - 3, depth / 2 - 2), M.steel);
  }
  g.add(b.build('Panca'));
  info(g, 'Panca in ferro', `${length} × ${depth} cm, h ${h} cm`);
  return g;
}

function frame(M, w, h) {
  const g = new THREE.Group();
  g.add(boxAt(M.black, -w / 2, 0, -1.5, w / 2, h, 0));
  g.add(boxAt(M.poster, -w / 2 + 4, 4, -1.8, w / 2 - 4, h - 4, -1.5));
  info(g, 'Cornice', 'Locandina d\'epoca');
  return g;
}

// Tenda raccolta di lato: pannello ondulato dal bastone al pavimento
function curtain(M, top) {
  const w = 55;
  const h = top - 2;
  const geo = new THREE.PlaneGeometry(w * CM, h * CM, 24, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin((x / (w * CM)) * Math.PI * 7) * 0.035);
  }
  geo.computeVertexNormals();
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * CM, uv.getY(i) * h * CM);
  const m = new THREE.Mesh(geo, M.curtain);
  m.position.y = (h / 2 + 2) * CM;
  const g = new THREE.Group();
  g.add(m);
  info(g, 'Tenda', 'Tessuto paisley scuro');
  return g;
}

// ---------------------------------------------------------------------------
// Atrio del piano terra (foto 6)

function bambooChest(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const w = 100;
  const d = 45;
  const h = 56;
  b.add(boxGeoAt(-w / 2 + 2, 4, -d / 2 + 2, w / 2 - 2, h - 4, d / 2 - 2), M.wicker);
  b.add(boxGeoAt(-w / 2, h - 5, -d / 2, w / 2, h, d / 2), M.wicker);
  for (const [x, z] of [
    [-w / 2 + 2, -d / 2 + 2],
    [w / 2 - 2, -d / 2 + 2],
    [-w / 2 + 2, d / 2 - 2],
    [w / 2 - 2, d / 2 - 2],
  ]) {
    b.add(cylGeoAt(x, 2, z, 2.6, h - 2, 10), M.oakTrunk);
  }
  for (const x of [-w / 4, w / 4]) b.add(boxGeoAt(x - 3, h - 8, -d / 2 - 0.6, x + 3, h - 4, -d / 2), M.black);
  g.add(b.build('Cassapanca'));
  info(g, 'Cassapanca in bambù', `${w} × ${d} × ${h} cm`);
  return g;
}

function wireShelf(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const z0 = -40;
  const z1 = 40;
  for (const y of [95, 128, 158, 188]) b.add(boxGeoAt(0, y, z0, 26, y + 1.2, z1), M.steel);
  for (const z of [z0, z1]) b.add(rodGeo([1, 80, z], [1, 205, z], 0.6, 6), M.steel);
  b.add(boxGeoAt(3, 159, -30, 9, 185, -18), M.tapeBlue);
  b.add(cylGeoAt(14, 129, 18, 8, 12, 16, 9), M.teal);
  g.add(b.build('Mensole a filo'));
  info(g, 'Mensole in filo di ferro', '80 cm, quattro ripiani');
  return g;
}

function rodLadder(M) {
  const g = new THREE.Group();
  const b = new Batch();
  for (const z of [-21, 21]) b.add(rodGeo([2, 0, z], [2, 205, z], 0.9, 6), M.steel);
  for (let y = 22; y < 205; y += 30) b.add(rodGeo([2, y, -21], [2, y, 21], 0.7, 6), M.steel);
  for (const z of [-21, 21]) b.add(rodGeo([2, 203, z], [0, 203, z], 0.9, 6), M.steel);
  g.add(b.build('Scaletta a muro'));
  info(g, 'Scaletta portaoggetti', 'Tondino di ferro nero, a muro');
  return g;
}

function redFrame(M, w, h) {
  const g = new THREE.Group();
  g.add(boxAt(M.red, -w / 2, 0, -1.5, w / 2, h, 0));
  g.add(boxAt(M.paper, -w / 2 + 3, 3, -1.8, w / 2 - 3, h - 3, -1.5));
  g.add(boxAt(M.poster, -w / 2 + 6, 6, -2, w / 2 - 6, h - 6, -1.8));
  info(g, 'Fotografia d\'epoca', 'Cornice rossa');
  return g;
}

function lacquerScreen(M) {
  const g = new THREE.Group();
  const lacquer = new THREE.MeshStandardMaterial({ color: '#c8471f', roughness: 0.3 });
  const panel = 50;
  const a = 0.38;
  const b = new Batch();
  // quattro ante a fisarmonica, centrate sull'origine
  let px = (-4 * panel * Math.cos(a)) / 2;
  let pz = 0;
  for (let i = 0; i < 4; i++) {
    const t = i % 2 === 0 ? a : -a;
    const ex = px + panel * Math.cos(t);
    const ez = pz + panel * Math.sin(t);
    const geo = new THREE.BoxGeometry(panel * CM, 182 * CM, 2.4 * CM);
    geo.rotateY(-t);
    geo.translate(((px + ex) / 2) * CM, 95 * CM, ((pz + ez) / 2) * CM);
    b.add(geo, lacquer);
    px = ex;
    pz = ez;
  }
  g.add(b.build('Paravento'));
  info(g, 'Paravento cinese', 'Lacca rossa dipinta a fiori e aironi, quattro ante');
  return g;
}

function perforatedFence(M, len) {
  const g = new THREE.Group();
  const b = new Batch();
  const h = 112;
  for (const x of [-len / 2, 0, len / 2]) b.add(boxGeoAt(x - 1.5, 0, -1.5, x + 1.5, h, 1.5), M.steel);
  b.add(boxGeoAt(-len / 2, h - 3, -1.5, len / 2, h, 1.5), M.steel);
  b.add(boxGeoAt(-len / 2, 12, -1.5, len / 2, 15, 1.5), M.steel);
  g.add(b.build('Recinto'));
  const perf = boxAt(M.perforated, -len / 2 + 2, 15, -0.5, len / 2 - 2, h - 3, 0.5);
  g.add(perf);
  info(g, 'Recinzione in lamiera forata', `Ferro nero, h ${h} cm`);
  return g;
}

export function enamelPendant(M, r = 22, color = 'white') {
  const g = new THREE.Group();
  const mat = (color === 'black' ? M.steelMatte : M.enamel).clone();
  mat.side = THREE.DoubleSide;
  const pts = [
    [1.2, 0],
    [3, -1],
    [r * 0.45, -r * 0.35],
    [r * 0.85, -r * 0.62],
    [r, -r * 0.7],
  ].map(([a, c]) => new THREE.Vector2(a * CM, c * CM));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 36), mat));
  g.add(cylAt(M.bulb, 0, -r * 0.55, 0, 4, 5, 12));
  g.add(new THREE.Mesh(rodGeo([0, 0, 0], [0, 120, 0], 0.3, 4), M.black));
  info(g, 'Sospensione smaltata', `Ø ${2 * r} cm`);
  return g;
}
