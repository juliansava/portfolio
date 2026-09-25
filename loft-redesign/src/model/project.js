// Progetto di redesign: arredi e finiture su involucro, struttura e cucina
// esistenti. Mattoni, piastrelle, legno e ferro nero restano; si aggiungono
// arredi, tessili, luci e poche opere leggere (servizi riorganizzati,
// ampliamento in vetro del soppalco).
//
// Posizioni dalle piante di progetto (pianta_arredo, pianta_soppalco_arredo),
// riportate alle misure del rilievo.

import * as THREE from 'three';
import { S, roofY } from '../survey.js';
import {
  CM,
  boxAt,
  boxGeoAt,
  cylGeoAt,
  discGeo,
  arcBandGeo,
  rodGeo,
  roundBoxAt,
  roundBoxGeo,
  stadiumGeo,
  tubeGeo,
  Batch,
  info,
  place,
} from '../lib/geo.js';
import { buildRailings, buildGlassExtension } from './structure.js';
import {
  plant,
  canvasArt,
  rugMesh,
  drape,
  sconce,
  readingLamp,
  arcoLamp,
  domePendant,
  pictureLight,
  bookStack,
  vase,
  branchVase,
} from './decor.js';

const MT = S.mezzTop; // 330
const G = S.ground.level; // -380
const X0 = S.rightX0; // 882: servizi
const X1 = S.rightX1; // 1097

// Servizi di progetto (pianta_arredo): antibagno, nicchia doccia, bagno.
export const BATH = {
  wallZ: 186, // muro tra antibagno e bagno (186-196)
  door: { x0: 888, x1: 968, h: 210 },
  niche: { x0: 1002, x1: X1, z0: S.serviceWallZ + 5, z1: 196 }, // muro ovest 1002-1010
  laundryDoor: { x0: 902, x1: 993 },
};

export function buildProject(M, lamps) {
  const root = new THREE.Group();
  root.name = 'progetto';
  root.userData.scenario = 'project';

  const build = new THREE.Group();
  build.name = 'opere di progetto';
  const furniture = new THREE.Group();
  furniture.name = 'arredi di progetto';
  root.add(build, furniture);

  const add = (parent, obj, x, z, rot = 0, y = 0) => {
    place(obj, x, y, z, rot);
    parent.add(obj);
    return obj;
  };
  const f = (obj, x, z, rot = 0, y = 0) => add(furniture, obj, x, z, rot, y);
  const mezz = (obj, x, z, rot = 0, y = MT) => {
    obj.userData.level = 'mezz';
    return add(furniture, obj, x, z, rot, y);
  };

  // --- Soppalco: parapetti e ampliamento in vetro ---------------------------
  build.add(buildRailings(M, 'project'));
  build.add(buildGlassExtension(M));

  // --- Soggiorno (sotto il soppalco, lato nord) -------------------------------
  const LX = 555; // asse del salotto
  f(rugMesh(M.rugLiving, 300, 210, 'Tappeto del soggiorno', '300 × 210 cm, lana annodata a mano dai toni spenti'), LX, 142);
  f(sofa(M), LX, 49);
  f(coffeeTable(M), LX, 158);
  f(bookStack(M, 3, 4), LX + 26, 152, 0.3, 38);
  f(vase(M, { r: 7, h: 20, mat: M.ceramic }), LX - 30, 160, 0, 38);
  f(loungeChair(M), LX - 150, 150, Math.PI / 2 + 0.3);
  f(loungeChair(M), LX + 150, 150, -Math.PI / 2 - 0.3);
  f(mediaConsole(M), 768, 24);
  f(speaker(M), 692, 20, -0.45);
  f(speaker(M), 844, 20, -0.75);
  f(recordCrate(M), 846, 62, -0.1);
  f(plant(M, { kind: 'fig', h: 205, potR: 26, potH: 44, pot: 'stone', seed: 7 }), 385, 42);
  // quadro grande sopra il divano, applique ai lati
  f(canvasArt(M, M.art1, 150, 100, 'Quadro sopra il divano'), LX, 0, 0, 128).userData.side = 'north';
  for (const x of [LX - 118, LX + 118]) {
    f(sconce(M, lamps, [x, 172, 18], { name: 'Applique del soggiorno' }), x, 0, 0, 172).userData.side = 'north';
  }

  // --- Pranzo tra i pilastri, sotto la doppia altezza --------------------------
  const DX = 547;
  const DZ = 322;
  f(diningTable(M), DX, DZ);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const r = 92;
    const x = DX + Math.sin(a) * r;
    const z = DZ - Math.cos(a) * r;
    f(diningChair(M), x, z, Math.atan2(DX - x, DZ - z));
  }
  f(branchVase(M, 9), DX, DZ, 0, 76);
  // lampada ad arco: base vicino al setto della cucina, paralume sul tavolo
  const base = [655, 468];
  const rot = Math.atan2(DX - base[0], DZ - base[1]);
  const reach = Math.hypot(DX - base[0], DZ - base[1]);
  f(arcoLamp(M, lamps, [base[0], 0, base[1]], reach, rot), base[0], base[1], rot);

  // --- Angolo bar contro il muro sud, tra lesena e W2 ------------------------
  f(barCabinet(M), 420, 477, Math.PI);
  f(hexPouf(M), 346, 468);
  f(hexPouf(M), 504, 468, 0.4);
  f(canvasArt(M, M.art2, 90, 112, 'Quadro sopra il bar'), 420, S.depth, Math.PI, 118).userData.side = 'south';
  f(pictureLight(M, lamps, [420, 238, S.depth - 16], 50), 420, S.depth, Math.PI, 238).userData.side = 'south';

  // --- Pianta davanti al parapetto, sul percorso dalla gabbia ------------------
  f(plant(M, { kind: 'olive', h: 250, potR: 34, potH: 50, pot: 'terracotta', seed: 3 }), 222, 308);

  // --- Tende in lino sulle finestre alte ---------------------------------------
  for (const w of S.windows.filter((w) => w.crown > 330)) {
    const top = w.crown + 30 - 2;
    for (const x of [w.x0 - 24, w.x1 + 24]) f(drape(M.linen, 44, top, 7), x, S.depth - 12).userData.side = 'south';
  }

  // --- Servizi: lavanderia, antibagno, nicchia doccia, bagno ---------------------
  build.add(buildServices(M, lamps));

  // --- Soppalco: libreria e lettura nel corridoio --------------------------------
  mezz(bookcase(M, 336, 240), 170, 0);
  mezz(boucleChair(M), 80, 80, 0.5);
  mezz(boucleChair(M), 248, 80, -0.5);
  mezz(sideTable(M), 164, 86);
  mezz(bookStack(M, 2, 11), 164, 86, 0.4, MT + 50);
  mezz(readingLamp(M, lamps, [26, MT, 104]), 26, 104, 0.6);

  // --- Soppalco: armadio a vetri cannettati tra le lesene -------------------------
  mezz(wardrobe(M, 334, 238, 58), 535, 0);

  // --- Soppalco: zona notte ---------------------------------------------------------
  const BX = 910;
  mezz(bed(M), BX, 0);
  mezz(nightstand(M), 780, 24);
  mezz(nightstand(M), 1040, 24);
  mezz(vase(M, { r: 6, h: 18, mat: M.ceramic }), 772, 26, 0, MT + 42);
  mezz(bookStack(M, 3, 21), 1040, 24, 0.2, MT + 42);
  for (const x of [780, 1040]) {
    mezz(sconce(M, lamps, [x, MT + 100, 16], { off: 14, power: 0.55, name: 'Applique da lettura' }), x, 0, 0, MT + 100).userData.side = 'north';
  }
  mezz(bedBench(M), BX, 246);
  mezz(slopedWardrobe(M, 878, 1094, 302, 423), 0, 0, 0, 0);
  mezz(plant(M, { kind: 'bush', h: 90, potR: 20, potH: 34, pot: 'stone', seed: 13 }), 1066, 270);

  // --- Piano terra: ingresso ---------------------------------------------------------
  buildEntrance(M, lamps, f);

  return { root, build, furniture };
}

// ===========================================================================
// Soggiorno

function sofa(M, { w = 236, d = 92 } = {}) {
  const g = new THREE.Group();
  const b = new Batch();
  const mat = M.cognac;
  const legH = 12;
  const armW = 16;
  const backD = 22;
  const seatTop = 44;
  // telaio in ferro nero, arretrato
  b.add(boxGeoAt(-w / 2 + 6, 0, -d / 2 + 6, w / 2 - 6, legH, d / 2 - 6), M.steel);
  // basamento imbottito e braccioli
  b.add(roundBoxAt(-w / 2, legH, -d / 2, w / 2, legH + 18, d / 2, 3), mat);
  b.add(roundBoxAt(-w / 2, legH, -d / 2, -w / 2 + armW, 62, d / 2, 6), mat);
  b.add(roundBoxAt(w / 2 - armW, legH, -d / 2, w / 2, 62, d / 2, 6), mat);
  b.add(roundBoxAt(-w / 2 + armW - 1, legH, -d / 2, w / 2 - armW + 1, 66, -d / 2 + 14, 5), mat);
  const inner = w - 2 * armW;
  const cw = inner / 3;
  for (let i = 0; i < 3; i++) {
    const x0 = -w / 2 + armW + i * cw;
    b.add(roundBoxAt(x0 + 0.4, legH + 18, -d / 2 + backD - 4, x0 + cw - 0.4, seatTop, d / 2 - 1, 7), mat);
    // cuscini dello schienale, leggermente inclinati
    const back = roundBoxGeo(cw - 1, 40, 18, 7);
    back.rotateX(-0.16);
    back.translate((x0 + cw / 2) * CM, (seatTop + 18) * CM, (-d / 2 + 16) * CM);
    b.add(back, mat);
  }
  // cuscini decorativi e plaid
  const p1 = roundBoxGeo(46, 44, 14, 6);
  p1.rotateX(-0.25);
  p1.rotateY(0.25);
  p1.translate((-w / 2 + armW + 26) * CM, (seatTop + 20) * CM, (-d / 2 + 30) * CM);
  b.add(p1, M.oliveVelvet);
  const p2 = roundBoxGeo(44, 42, 14, 6);
  p2.rotateX(-0.25);
  p2.rotateY(-0.2);
  p2.translate((w / 2 - armW - 26) * CM, (seatTop + 19) * CM, (-d / 2 + 30) * CM);
  b.add(p2, M.linen);
  b.add(roundBoxAt(w / 2 - armW - 2, 40, -d / 2 + 10, w / 2 + 1, 64, d / 2 - 18, 2), M.linenCharcoal);
  g.add(b.build('Divano'));
  info(g, 'Divano in cuoio cognac', `${w} × ${d} cm, tre posti, cuscini in velluto oliva e lino`);
  return g;
}

function loungeChair(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const mat = M.oliveVelvet;
  const w = 78;
  const d = 82;
  for (const [x, z] of [
    [-w / 2 + 8, -d / 2 + 8],
    [w / 2 - 8, -d / 2 + 8],
    [-w / 2 + 8, d / 2 - 8],
    [w / 2 - 8, d / 2 - 8],
  ]) {
    b.add(cylGeoAt(x, 0, z, 1.6, 16, 10, 2.2), M.steel);
  }
  b.add(roundBoxAt(-w / 2, 16, -d / 2, w / 2, 38, d / 2, 8), mat);
  b.add(roundBoxAt(-w / 2, 16, -d / 2 + 6, -w / 2 + 15, 60, d / 2, 7), mat);
  b.add(roundBoxAt(w / 2 - 15, 16, -d / 2 + 6, w / 2, 60, d / 2, 7), mat);
  const back = roundBoxGeo(w, 50, 18, 8);
  back.rotateX(-0.2);
  back.translate(0, 55 * CM, (-d / 2 + 10) * CM);
  b.add(back, mat);
  b.add(roundBoxAt(-w / 2 + 14, 36, -d / 2 + 18, w / 2 - 14, 46, d / 2 - 2, 7), mat);
  g.add(b.build('Poltrona'));
  info(g, 'Poltrona lounge', 'Velluto verde oliva, gambe in ferro nero');
  return g;
}

function coffeeTable(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(stadiumGeo(116, 62, 34, 38, 1.2), M.travertine);
  b.add(stadiumGeo(70, 30, 0, 34, 0), M.travertine);
  g.add(b.build('Tavolino'));
  info(g, 'Tavolino ovale in travertino', '116 × 62 cm, h 38 cm, base a colonna');
  return g;
}

function mediaConsole(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const w = 120;
  const d = 44;
  b.add(boxGeoAt(-w / 2 + 3, 0, -d / 2 + 3, -w / 2 + 6, 14, d / 2 - 3), M.steel);
  b.add(boxGeoAt(w / 2 - 6, 0, -d / 2 + 3, w / 2 - 3, 14, d / 2 - 3), M.steel);
  b.add(boxGeoAt(-w / 2, 14, -d / 2, w / 2, 58, d / 2), M.oakSmoked);
  // ante a doghe verticali
  for (let x = -w / 2 + 2; x < w / 2 - 2; x += 4) b.add(boxGeoAt(x, 17, d / 2, x + 3, 55, d / 2 + 0.8), M.oakSmoked);
  // giradischi
  b.add(boxGeoAt(-38, 58, -14, 6, 70, 18), M.walnut);
  b.add(cylGeoAt(-18, 70, 2, 15, 1.4, 40), M.vinyl);
  b.add(cylGeoAt(-18, 71.4, 2, 5, 0.3, 24), M.red);
  b.add(rodGeo([0, 72, -8], [-9, 73, 8], 0.4, 6), M.chrome);
  b.add(cylGeoAt(0, 70, -8, 2, 3, 12), M.chrome);
  // dischi appoggiati
  for (let i = 0; i < 4; i++) b.add(boxGeoAt(22 + i * 1.2, 58, -14, 23 + i * 1.2, 89, 17).rotateZ(0), i % 2 ? M.paper : M.poster);
  g.add(b.build('Madia'));
  info(g, 'Madia con giradischi', 'Rovere affumicato a doghe, 120 × 44 cm, base in ferro');
  return g;
}

function speaker(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-11, 0, -14, 11, 3, 14), M.steel);
  b.add(boxGeoAt(-11, 3, -14, 11, 98, 14), M.walnut);
  b.add(boxGeoAt(-10, 6, 14, 10, 95, 14.8), M.speakerCloth);
  g.add(b.build('Cassa'));
  info(g, 'Diffusore da pavimento', 'Noce, tela nera, h 98 cm');
  return g;
}

function recordCrate(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-17, 0, -17, 17, 2, 17), M.oakNatural);
  for (const s of [-1, 1]) {
    b.add(boxGeoAt(s * 17 - 1, 0, -17, s * 17 + 1, 32, 17), M.oakNatural);
    b.add(boxGeoAt(-17, 0, s * 17 - 1, 17, 26, s * 17 + 1), M.oakNatural);
  }
  for (let i = 0; i < 14; i++) b.add(boxGeoAt(-15, 2, -15 + i * 2.1, 15, 33, -14.4 + i * 2.1), i % 3 ? M.paper : M.poster);
  g.add(b.build('Dischi'));
  info(g, 'Cassetta dei dischi', 'Rovere, vinili');
  return g;
}

// ===========================================================================
// Pranzo e bar

function diningTable(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(discGeo(70, 72, 76, 1), M.oakSmoked);
  b.add(cylGeoAt(0, 3, 0, 19, 69, 32, 14), M.blackOak);
  b.add(discGeo(36, 0, 3, 1), M.blackOak);
  g.add(b.build('Tavolo'));
  info(g, 'Tavolo tondo da pranzo', 'Ø 140 cm, rovere affumicato, piede a colonna in rovere nero: sei posti');
  return g;
}

function diningChair(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const w = 46;
  const d = 48;
  const seat = 45;
  for (const [x, z, h] of [
    [-w / 2 + 3, d / 2 - 3, seat],
    [w / 2 - 3, d / 2 - 3, seat],
    [-w / 2 + 4, -d / 2 + 4, 80],
    [w / 2 - 4, -d / 2 + 4, 80],
  ]) {
    b.add(rodGeo([x * 1.04, 0, z * 1.04], [x, h, z], 1.4, 8), M.blackOak);
  }
  b.add(boxGeoAt(-w / 2 + 2, seat - 5, -d / 2 + 3, w / 2 - 2, seat - 2, d / 2 - 2), M.blackOak);
  b.add(roundBoxAt(-w / 2 + 1, seat - 2, -d / 2 + 2, w / 2 - 1, seat + 3, d / 2 - 1, 2), M.cognac);
  // schienale curvo in cuoio
  const back = arcBandGeo(31, 29, 0.72, 66, 80, 0.8, 16);
  back.translate(0, 0, (-d / 2 + 31 + 1) * CM);
  b.add(back, M.cognac);
  g.add(b.build('Sedia'));
  info(g, 'Sedia da pranzo', 'Rovere nero, seduta e schienale in cuoio cognac');
  return g;
}

function barCabinet(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const w = 100;
  const d = 44;
  for (const [x, z] of [
    [-w / 2 + 5, -d / 2 + 5],
    [w / 2 - 5, -d / 2 + 5],
    [-w / 2 + 5, d / 2 - 5],
    [w / 2 - 5, d / 2 - 5],
  ]) {
    b.add(boxGeoAt(x - 1.5, 0, z - 1.5, x + 1.5, 16, z + 1.5), M.steel);
  }
  b.add(boxGeoAt(-w / 2, 16, -d / 2, w / 2, 86, d / 2), M.oakSmoked);
  b.add(boxGeoAt(-w / 2 - 1, 86, -d / 2 - 1, w / 2 + 1, 89, d / 2 + 1), M.travertine);
  b.add(boxGeoAt(-0.3, 19, d / 2, 0.3, 83, d / 2 + 0.4), M.black);
  for (const x of [-4, 4]) b.add(boxGeoAt(x - 0.7, 40, d / 2 + 0.4, x + 0.7, 64, d / 2 + 2), M.brassSatin);
  // vassoio, bottiglie, bicchieri, secchiello
  b.add(stadiumGeo(46, 26, 89, 90.2, 0), M.brassSatin);
  const bottles = [
    [-16, -4, 30, 3.8, M.amber],
    [-8, -6, 26, 4.2, M.bottleGreen],
    [0, -3, 32, 3.4, M.clearGlass],
    [8, -5, 22, 4.6, M.amber],
  ];
  for (const [x, z, h, r, mat] of bottles) {
    b.add(cylGeoAt(x, 90.2, z, r, h * 0.7, 16), mat);
    b.add(cylGeoAt(x, 90.2 + h * 0.7, z, r * 0.35, h * 0.3, 10, r * 0.3), mat);
  }
  for (const [x, z] of [
    [15, 5],
    [20, -2],
    [-18, 7],
  ]) {
    b.add(cylGeoAt(x, 90.2, z, 3.2, 9, 14), M.clearGlass);
  }
  b.add(cylGeoAt(32, 89, -6, 9, 18, 24, 10), M.brushed);
  g.add(b.build('Mobile bar'));
  info(g, 'Mobile bar', 'Rovere affumicato con piano in travertino, 100 × 44 cm, maniglie in ottone');
  return g;
}

function hexPouf(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(cylGeoAt(0, 0, 0, 22, 40, 6, 22), M.cognac);
  b.add(cylGeoAt(0, 40, 0, 21.5, 3, 6, 19.5), M.cognac);
  g.add(b.build('Pouf'));
  info(g, 'Pouf esagonale', 'Cuoio cognac, Ø 44 cm');
  return g;
}

// ===========================================================================
// Servizi

function buildServices(M, lamps) {
  const g = new THREE.Group();
  g.name = 'servizi di progetto';
  const top = S.mezzUnder;
  const n = BATH.niche;
  const wz = BATH.wallZ;
  const d = BATH.door;
  const walls = new Batch();
  // muro della nicchia doccia (ovest) e muro tra antibagno e bagno con la porta
  walls.add(boxGeoAt(n.x0, 0, n.z0, n.x0 + 8, top, n.z1), M.plaster);
  walls.add(boxGeoAt(X0, 0, wz, d.x0, top, wz + 10), M.plaster);
  walls.add(boxGeoAt(d.x1, 0, wz, n.x0, top, wz + 10), M.plaster);
  walls.add(boxGeoAt(d.x0, d.h, wz, d.x1, top, wz + 10), M.plaster);
  const wm = walls.build('Tramezzi del bagno');
  info(wm, 'Tramezzi di progetto', 'Antibagno, nicchia doccia 87 × 86 cm, porta del bagno 80 × 210 cm');
  g.add(wm);

  // rivestimenti: zellige verde in doccia, piastrelle bianche fatte a mano in bagno
  const tiles = new Batch();
  const H = 220;
  tiles.add(boxGeoAt(n.x0 + 8, 0, n.z0, X1, H, n.z0 + 1), M.zellige);
  tiles.add(boxGeoAt(n.x0 + 8, 0, n.z0, n.x0 + 9, H, n.z1), M.zellige);
  tiles.add(boxGeoAt(X1 - 1, 0, n.z0, X1, H, n.z1), M.zellige);
  tiles.add(boxGeoAt(n.x0 + 8, 0, n.z0 + 1, X1 - 1, 0.6, n.z1), M.zellige);
  tiles.add(boxGeoAt(X1 - 1, 0, n.z1, X1, H, S.depth), M.subway);
  tiles.add(boxGeoAt(X0, 0, 330, X0 + 1, 120, 480), M.subway);
  const tm = tiles.build('Rivestimenti');
  info(tm, 'Rivestimenti', 'Doccia in zellige verde salvia; parete del lavabo in piastrelle bianche fatte a mano');
  g.add(tm);

  // porta del bagno: telaio nero e vetro cannettato, aperta verso il bagno
  const fr = new Batch();
  fr.add(boxGeoAt(d.x0 - 3, 0, wz - 1, d.x0, d.h + 3, wz + 11), M.steel);
  fr.add(boxGeoAt(d.x1, 0, wz - 1, d.x1 + 3, d.h + 3, wz + 11), M.steel);
  fr.add(boxGeoAt(d.x0 - 3, d.h, wz - 1, d.x1 + 3, d.h + 3, wz + 11), M.steel);
  g.add(fr.build('Telaio porta bagno'));
  const leaf = reededLeaf(M, d.x1 - d.x0 - 2, d.h - 2);
  leaf.position.set((d.x0 + 1) * CM, 0, (wz + 10) * CM);
  leaf.rotation.y = -Math.PI / 2; // aperta di 90° lungo il tramezzo
  info(leaf, 'Porta del bagno', 'Ferro nero e vetro cannettato, 80 × 210 cm');
  g.add(leaf);
  // porta scorrevole della lavanderia, lato lavanderia, aperta
  const ld = BATH.laundryDoor;
  const sl = reededLeaf(M, ld.x1 - ld.x0 + 4, 212);
  sl.position.set((ld.x1 + 2) * CM, 0, (S.serviceWallZ - 7) * CM);
  sl.rotation.y = 0;
  info(sl, 'Porta scorrevole della lavanderia', 'Ferro nero e vetro cannettato su binario a vista');
  g.add(sl);
  g.add(boxAt(M.steel, ld.x0 - 4, 214, S.serviceWallZ - 7, ld.x1 + 100, 218, S.serviceWallZ - 5));

  // --- Bagno ---
  const fx = new THREE.Group();
  fx.name = 'sanitari';
  fx.add(place(wallWC(M), X0, 0, 372, Math.PI / 2));
  fx.add(place(bidet(M), X0, 0, 437, Math.PI / 2));
  fx.add(place(vanity(M, 138), X1, 0, 340, -Math.PI / 2));
  const mir = new Batch();
  mir.add(boxGeoAt(X1 - 3, 112, 276, X1 - 1, 196, 404), M.steel);
  const mirror = mir.build('Specchio');
  mirror.add(boxAt(M.mirror, X1 - 3.4, 115, 279, X1 - 3, 193, 401));
  info(mirror, 'Specchio', 'Filo di ferro nero, 128 × 84 cm');
  fx.add(mirror);
  for (const z of [262, 418]) {
    fx.add(place(sconce(M, lamps, [X1 - 16, 170, z], { off: 14, power: 0.45, name: 'Applique del bagno' }), X1, 170, z, -Math.PI / 2));
  }
  fx.add(place(towelRadiator(M), X1, 0, 462, -Math.PI / 2));
  fx.add(place(shower(M), 0, 0, 0));
  fx.add(place(branchVase(M, 17), X1 - 26, 90, 330));
  // lavanderia
  fx.add(place(utilitySink(M), X0 + 30, 0, 42));
  fx.add(place(washerTower(M), 1062, 0, 36));
  const shelf = new Batch();
  shelf.add(boxGeoAt(946, 88, 2, 1028, 92, 58), M.oakNatural);
  for (const y of [150, 185]) shelf.add(boxGeoAt(946, y, 2, 1028, y + 2.5, 30), M.oakNatural);
  for (const x of [950, 1024]) shelf.add(boxGeoAt(x - 1, 0, 50, x + 1, 88, 52), M.steel);
  shelf.add(boxGeoAt(952, 92, 10, 972, 118, 26), M.linenWhite);
  shelf.add(boxGeoAt(976, 152.5, 8, 1000, 170, 24), M.wicker);
  const sm = shelf.build('Piano e mensole');
  info(sm, 'Lavanderia', 'Piano per stirare e mensole in rovere');
  fx.add(sm);
  g.add(fx);
  // luce del bagno e della lavanderia
  g.add(place(domePendant(M, lamps, [990, 262, 52], { r: 18, drop: 42, power: 0.8 }), 990, 262, 52));
  return g;
}

function reededLeaf(M, w, h) {
  const g = new THREE.Group();
  const b = new Batch();
  const p = 4;
  b.add(boxGeoAt(0, 0, -1.5, p, h, 1.5), M.steel);
  b.add(boxGeoAt(w - p, 0, -1.5, w, h, 1.5), M.steel);
  b.add(boxGeoAt(0, 0, -1.5, w, 12, 1.5), M.steel);
  b.add(boxGeoAt(0, h - p, -1.5, w, h, 1.5), M.steel);
  b.add(boxGeoAt(0, h * 0.48, -1.5, w, h * 0.48 + 3, 1.5), M.steel);
  b.add(boxGeoAt(w - 12, 90, 1.5, w - 9, 130, 5), M.steel);
  b.add(boxGeoAt(w - 12, 90, -5, w - 9, 130, -1.5), M.steel);
  g.add(b.build('Anta'));
  const glass = boxAt(M.reeded, p, 12, -0.4, w - p, h - p, 0.4);
  glass.userData.noShadow = true;
  g.add(glass);
  return g;
}

function wallWC(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(roundBoxAt(-18, 26, 2, 18, 42, 54, 8, 3), M.ceramic);
  b.add(roundBoxAt(-17, 42, 4, 17, 44, 53, 6, 2), M.white);
  b.add(boxGeoAt(-12, 98, 0, 12, 114, 1), M.black);
  g.add(b.build('WC'));
  info(g, 'WC sospeso', 'Ceramica bianca, placca di scarico nera');
  return g;
}

function bidet(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(roundBoxAt(-18, 26, 2, 18, 42, 54, 8, 3), M.ceramic);
  b.add(cylGeoAt(0, 42, 12, 1.2, 8, 10), M.black);
  b.add(rodGeo([0, 49, 12], [0, 50, 18], 0.8, 8), M.black);
  g.add(b.build('Bidet'));
  info(g, 'Bidet sospeso', 'Ceramica bianca, rubinetteria nera');
  return g;
}

function vanity(M, len) {
  const g = new THREE.Group();
  const b = new Batch();
  const d = 50;
  b.add(boxGeoAt(-len / 2, 42, 0, len / 2, 84, d), M.oakSmoked);
  for (const x of [-len / 4, len / 4]) b.add(boxGeoAt(x - 20, 62, d, x + 20, 63, d + 1.5), M.brassSatin);
  b.add(boxGeoAt(-len / 2 - 1, 84, 0, len / 2 + 1, 88, d + 2), M.travertine);
  for (const x of [-len / 4, len / 4]) {
    b.add(stadiumGeo(46, 36, 88, 102, 1.5).translate(x * CM, 0, 26 * CM), M.ceramic);
    b.add(rodGeo([x, 120, 1], [x, 120, 12], 1, 10), M.black);
    b.add(rodGeo([x, 120, 12], [x, 116, 13], 0.9, 8), M.black);
  }
  g.add(b.build('Lavabo doppio'));
  info(g, 'Lavabo doppio', `Mobile sospeso in rovere affumicato ${len} cm, piano in travertino, bacinelle in ceramica`);
  return g;
}

function towelRadiator(M) {
  const g = new THREE.Group();
  const b = new Batch();
  for (const x of [-24, 24]) b.add(rodGeo([x, 30, 5], [x, 170, 5], 1.4, 8), M.steel);
  for (let y = 36; y < 170; y += 10) b.add(rodGeo([-24, y, 5], [24, y, 5], 0.8, 6), M.steel);
  b.add(boxGeoAt(-20, 120, 3, 20, 158, 9), M.linenWhite);
  g.add(b.build('Scaldasalviette'));
  info(g, 'Scaldasalviette', 'Ferro nero opaco');
  return g;
}

function shower(M) {
  const n = BATH.niche;
  const g = new THREE.Group();
  const b = new Batch();
  const cx = (n.x0 + 8 + X1) / 2;
  const cz = (n.z0 + n.z1) / 2;
  // soffione a soffitto con braccio dal muro nord, miscelatore, scarico
  b.add(rodGeo([cx, 235, n.z0 + 1], [cx, 235, cz], 1, 10), M.black);
  b.add(cylGeoAt(cx, 229, cz, 15, 3, 32), M.black);
  b.add(boxGeoAt(cx + 14, 92, n.z0 + 1, cx + 30, 108, n.z0 + 2), M.black);
  b.add(boxGeoAt(cx + 20, 97, n.z0 + 2, cx + 24, 103, n.z0 + 6), M.black);
  b.add(boxGeoAt(cx - 20, 0.6, cz - 3, cx + 20, 0.8, cz + 3), M.brushed);
  // nicchia portaoggetti
  b.add(boxGeoAt(X1 - 3, 110, cz - 18, X1 - 1, 111, cz + 18), M.travertine);
  // lastra fissa in vetro con profilo nero
  const x0 = n.x0 + 8;
  const x1 = x0 + 55;
  b.add(boxGeoAt(x0, 0, n.z1 - 3, x1, 2, n.z1 - 1), M.steel);
  b.add(boxGeoAt(x1 - 2, 0, n.z1 - 3, x1, 200, n.z1 - 1), M.steel);
  b.add(boxGeoAt(x0, 198, n.z1 - 3, x1, 200, n.z1 - 1), M.steel);
  b.add(rodGeo([x1 - 1, 200, n.z1 - 2], [x1 - 1, top(), n.z1 - 2], 0.6, 6), M.steel);
  g.add(b.build('Doccia'));
  const glass = boxAt(M.clearGlass, x0, 2, n.z1 - 2.4, x1 - 2, 198, n.z1 - 1.6);
  glass.userData.noShadow = true;
  g.add(glass);
  info(g, 'Doccia in nicchia', 'Soffione a soffitto, rubinetteria nera, vetro fisso con profilo in ferro');
  return g;
}
const top = () => S.mezzUnder;

function utilitySink(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-28, 0, -36, 28, 84, 34), M.oakNatural);
  b.add(boxGeoAt(-29, 84, -37, 29, 88, 35), M.travertine);
  b.add(boxGeoAt(-24, 88, -30, 24, 110, 8), M.ceramic);
  b.add(boxGeoAt(-22, 101, -28, 22, 110.5, 6), M.plasticBlack);
  // asse per lavare a coste
  for (let z = 12; z < 32; z += 4) b.add(boxGeoAt(-22, 88, z, 22, 90, z + 2), M.ceramic);
  b.add(rodGeo([-2, 110, -34], [-2, 128, -34], 1, 10), M.black);
  b.add(rodGeo([-2, 128, -34], [-2, 124, -20], 0.9, 8), M.black);
  g.add(b.build('Lavatoio'));
  info(g, 'Lavatoio', 'Vasca in ceramica con asse a coste, mobile in rovere');
  return g;
}

function washerTower(M) {
  const g = new THREE.Group();
  const b = new Batch();
  for (const y0 of [2, 88]) {
    b.add(roundBoxAt(-30, y0, -30, 30, y0 + 84, 30, 1.5, 1), M.white);
    b.add(cylGeoAt(0, 0, 0, 16, 2, 32).rotateX(Math.PI / 2).translate(0, (y0 + 38) * CM, 30.5 * CM), M.stainless);
    b.add(cylGeoAt(0, 0, 0, 12, 2.2, 32).rotateX(Math.PI / 2).translate(0, (y0 + 38) * CM, 30.6 * CM), M.tinted);
    b.add(boxGeoAt(-28, y0 + 72, 30, 28, y0 + 82, 30.5), M.plasticBlack);
  }
  b.add(boxGeoAt(-30, 0, -30, 30, 2, 30), M.steel);
  g.add(b.build('Lavatrice e asciugatrice'));
  info(g, 'Lavatrice e asciugatrice', 'In colonna, 60 × 60 cm');
  return g;
}

// ===========================================================================
// Soppalco

function bookcase(M, len, h) {
  const g = new THREE.Group();
  const b = new Batch();
  const d = 34;
  const x0 = -len / 2;
  const bays = Math.round(len / 84);
  const bw = len / bays;
  for (let i = 0; i <= bays; i++) b.add(boxGeoAt(x0 + i * bw - 1.5, 0, 1, x0 + i * bw + 1.5, h, d), M.steel);
  const shelves = [0, 38, 78, 118, 158, 198, h - 3];
  for (const y of shelves) b.add(boxGeoAt(x0, y, 1, x0 + len, y + 3, d), M.oakNatural);
  // file di libri con vuoti e qualche oggetto
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let s = 0; s < shelves.length - 1; s++) {
    const y = shelves[s] + 3;
    const room = shelves[s + 1] - y;
    for (let i = 0; i < bays; i++) {
      const bx0 = x0 + i * bw + 2;
      const bx1 = x0 + (i + 1) * bw - 2;
      const gap = rnd();
      if (gap < 0.15) {
        b.add(cylGeoAt((bx0 + bx1) / 2, y, d / 2, 8, 22, 20, 5), s % 2 ? M.ceramic : M.stoneware);
        continue;
      }
      const cut = gap > 0.7 ? bx0 + (bx1 - bx0) * (0.45 + rnd() * 0.2) : bx1;
      b.add(boxGeoAt(bx0, y, 6, cut, y + Math.min(room - 6, 27), d - 1), M.books);
      if (cut < bx1 - 10) {
        // pila orizzontale
        b.add(boxGeoAt(cut + 4, y, 8, bx1 - 3, y + 9, d - 4), M.books);
      }
    }
  }
  g.add(b.build('Libreria'));
  info(g, 'Libreria a tutta parete', `${len} × ${h} cm, montanti in ferro nero e ripiani in rovere`);
  return g;
}

function boucleChair(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(discGeo(30, 0, 5, 1), M.blackOak);
  b.add(discGeo(37, 5, 40, 6), M.boucle);
  b.add(discGeo(32, 38, 48, 5), M.boucle);
  // schienale avvolgente, arrotondato in alto
  b.add(arcBandGeo(38, 24, 1.95, 30, 74, 7, 32), M.boucle);
  g.add(b.build('Poltroncina'));
  info(g, 'Poltroncina in bouclé', 'Lana bouclé color panna, schienale avvolgente, base in rovere nero');
  return g;
}

function sideTable(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(discGeo(24, 46, 49, 0.8), M.travertine);
  b.add(cylGeoAt(0, 0, 0, 5, 46, 16), M.steel);
  b.add(discGeo(16, 0, 1.5, 0.5), M.steel);
  g.add(b.build('Tavolino'));
  info(g, 'Tavolino', 'Ø 48 cm, travertino e ferro');
  return g;
}

function wardrobe(M, len, h, d) {
  const g = new THREE.Group();
  const b = new Batch();
  const x0 = -len / 2;
  b.add(boxGeoAt(x0, 0, 0, x0 + len, 6, d - 2), M.blackOak);
  b.add(boxGeoAt(x0, h - 4, 0, x0 + len, h, d), M.oakNatural);
  b.add(boxGeoAt(x0, 0, 0, x0 + 2, h, d), M.oakNatural);
  b.add(boxGeoAt(x0 + len - 2, 0, 0, x0 + len, h, d), M.oakNatural);
  b.add(boxGeoAt(x0, 6, 0, x0 + len, h - 4, 2), M.oakNatural);
  const doors = 6;
  const dw = (len - 4) / doors;
  const glass = [];
  for (let i = 0; i < doors; i++) {
    const a = x0 + 2 + i * dw;
    const c = a + dw;
    b.add(boxGeoAt(a, 6, d - 3, a + 3, h - 4, d), M.steel);
    b.add(boxGeoAt(c - 3, 6, d - 3, c, h - 4, d), M.steel);
    b.add(boxGeoAt(a, 6, d - 3, c, 9, d), M.steel);
    b.add(boxGeoAt(a, h - 7, d - 3, c, h - 4, d), M.steel);
    const hx = i % 2 ? a + 7 : c - 7;
    b.add(boxGeoAt(hx - 0.8, 90, d, hx + 0.8, 150, d + 3), M.steel);
    glass.push([a + 3, c - 3]);
  }
  g.add(b.build('Armadio'));
  for (const [a, c] of glass) {
    const m = boxAt(M.reeded, a, 9, d - 2, c, h - 7, d - 1);
    m.userData.noShadow = true;
    g.add(m);
  }
  info(g, 'Armadio a tutta parete', `${len} × ${h} cm, ante in ferro nero e vetro cannettato tra le lesene`);
  return g;
}

function bed(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const w = 192;
  const l = 212;
  const z0 = 10; // dietro la testiera
  // basamento arretrato e giroletto in rovere
  b.add(boxGeoAt(-w / 2 + 12, 0, z0 + 12, w / 2 - 12, 10, z0 + l - 12), M.blackOak);
  b.add(roundBoxAt(-w / 2, 10, z0, w / 2, 32, z0 + l, 2), M.oakNatural);
  // materasso, piumino, plaid
  b.add(roundBoxAt(-w / 2 + 5, 32, z0 + 3, w / 2 - 5, 54, z0 + l - 4, 6), M.linenWhite);
  b.add(roundBoxAt(-w / 2 + 1, 50, z0 + 58, w / 2 - 1, 60, z0 + l + 1, 5), M.duvet);
  b.add(roundBoxAt(-w / 2 + 1, 58, z0 + 54, w / 2 - 1, 62, z0 + 70, 3), M.duvet);
  b.add(roundBoxAt(-w / 2 - 2, 57, z0 + l - 52, w / 2 + 2, 63, z0 + l + 3, 2.5), M.linenCharcoal);
  // cuscini
  for (const x of [-w / 4, w / 4]) {
    const p = roundBoxGeo(72, 44, 16, 7);
    p.rotateX(-0.45);
    p.translate(x * CM, 72 * CM, (z0 + 16) * CM);
    b.add(p, M.linen);
    const q = roundBoxGeo(66, 14, 42, 6);
    q.translate(x * CM, 61 * CM, (z0 + 40) * CM);
    b.add(q, M.linenWhite);
  }
  const acc = roundBoxGeo(50, 30, 14, 6);
  acc.rotateX(-0.35);
  acc.translate(0, 70 * CM, (z0 + 32) * CM);
  b.add(acc, M.oliveVelvet);
  // testiera imbottita a canali verticali
  const hw = w + 30;
  const ch = 7;
  for (let i = 0; i < ch; i++) {
    const a = -hw / 2 + (i * hw) / ch;
    b.add(roundBoxAt(a + 0.4, 22, 0, a + hw / ch - 0.4, 122, 10, 4), M.linenCharcoal);
  }
  g.add(b.build('Letto'));
  info(g, 'Letto matrimoniale king size', `${w} × ${l} cm, giroletto in rovere, testiera imbottita in lino`);
  return g;
}

function nightstand(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-24, 0, -18, -22, 30, 18), M.steel);
  b.add(boxGeoAt(22, 0, -18, 24, 30, 18), M.steel);
  b.add(boxGeoAt(-24, 30, -20, 24, 42, 20), M.oakSmoked);
  b.add(boxGeoAt(-8, 35, 20, 8, 36.5, 21.5), M.brassSatin);
  b.add(boxGeoAt(-22, 12, -18, 22, 13.5, 18), M.oakSmoked);
  g.add(b.build('Comodino'));
  info(g, 'Comodino', 'Rovere affumicato e ferro, 48 × 40 cm');
  return g;
}

function bedBench(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(roundBoxAt(-60, 34, -20, 60, 46, 20, 4), M.cognac);
  for (const x of [-54, 54]) b.add(boxGeoAt(x - 2, 0, -18, x + 2, 34, 18), M.steel);
  b.add(boxGeoAt(-54, 8, -1, 54, 10, 1), M.steel);
  g.add(b.build('Panca'));
  info(g, 'Panca ai piedi del letto', 'Cuoio cognac su telaio in ferro, 120 cm');
  return g;
}

// Armadio basso sotto falda nell'ala est: il cielo segue il tetto.
function slopedWardrobe(M, x0, x1, zf, zb) {
  const g = new THREE.Group();
  const yT = (z) => roofY(z) - 6;
  const shape = new THREE.Shape();
  const pts = [
    [zf, MT],
    [zb, MT],
    [zb, yT(zb)],
    [zf, yT(zf)],
  ];
  pts.forEach(([z, y], i) => (i ? shape.lineTo(z * CM, y * CM) : shape.moveTo(z * CM, y * CM)));
  const body = new THREE.ExtrudeGeometry(shape, { depth: (x1 - x0) * CM, bevelEnabled: false });
  // (z, y, x) → (x, y, z)
  body.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  body.translate(x0 * CM, 0, 0);
  flipFaces(body);
  const m = new THREE.Mesh(body, M.builtIn);
  m.userData.noShadow = false;
  g.add(m);
  // ante in rovere sul fronte (z = zf), maniglie a incasso nere
  const b = new Batch();
  const n = 4;
  const dw = (x1 - x0) / n;
  const hFront = yT(zf) - MT;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * dw + 0.6;
    const c = a + dw - 1.2;
    b.add(boxGeoAt(a, MT + 8, zf - 2, c, MT + hFront - 2, zf), M.oakNatural);
    b.add(boxGeoAt(i % 2 ? a + 3 : c - 5, MT + 60, zf - 2.6, i % 2 ? a + 5 : c - 3, MT + 110, zf - 2), M.steel);
  }
  b.add(boxGeoAt(x0, MT, zf - 2, x1, MT + 8, zf), M.blackOak);
  g.add(b.build('Ante'));
  info(g, 'Armadio sotto falda', `${x1 - x0} cm, profondo ${zb - zf} cm, cielo inclinato come il tetto`);
  return g;
}

function flipFaces(g) {
  const idx = g.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
  } else {
    for (const attr of Object.values(g.attributes)) {
      const n = attr.itemSize;
      const arr = attr.array;
      for (let i = 0; i < attr.count; i += 3) {
        for (let c = 0; c < n; c++) {
          const t = arr[(i + 1) * n + c];
          arr[(i + 1) * n + c] = arr[(i + 2) * n + c];
          arr[(i + 2) * n + c] = t;
        }
      }
    }
  }
  g.computeVertexNormals();
}

// ===========================================================================
// Ingresso al piano terra: arredo libero nello stile del loft

function buildEntrance(M, lamps, f) {
  const hall = S.ground.hall;
  // tappeto passatoia dal portoncino
  f(rugMesh(M.runner, 80, 140, 'Passatoia', '80 × 140 cm, kilim a righe'), 60, 424, 0, G);
  // panca e appendiabiti sotto la seconda rampa
  f(entryBench(M), 22, 286, Math.PI / 2, G);
  f(coatRail(M), 0, 286, Math.PI / 2, G + 160).userData.side = 'west';
  // consolle e specchio tondo sul muro dell'atrio
  f(consoleTable(M), hall.x1, 380, -Math.PI / 2, G);
  f(roundMirror(M), hall.x1, 380, -Math.PI / 2, G + 118);
  f(branchVase(M, 29), hall.x1 - 18, 350, 0, G + 80);
  f(bookStack(M, 2, 31), hall.x1 - 16, 410, 0.1, G + 80);
  // quadreria sul muro dell'atrio, tra caldaia e consolle
  const frames = [
    [40, 52, 182, 128],
    [30, 38, 226, 150],
    [44, 32, 268, 126],
    [30, 40, 268, 170],
  ];
  const arts = [M.art3, M.art1, M.art2, M.art3];
  frames.forEach(([w, h, z, y], i) => {
    f(canvasArt(M, arts[i], w, h, 'Fotografia incorniciata'), hall.x1, z, -Math.PI / 2, G + y).userData.side = 'east';
  });
  // pianta alta nell'angolo sud-est e grande sospensione
  f(plant(M, { kind: 'fig', h: 190, potR: 24, potH: 42, pot: 'terracotta', seed: 23 }), 296, 462, 0, G);
  f(umbrellaStand(M), 232, 484, 0, G);
  f(domePendant(M, lamps, [262, G + 285, 330], { r: 30, drop: 55, power: 1.6 }), 262, 330, 0, G + 285).userData.noCollide = true;
}

function entryBench(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-60, 42, -19, 60, 47, 19), M.oakSmoked);
  for (const x of [-54, 54]) {
    b.add(boxGeoAt(x - 1.5, 0, -17, x + 1.5, 42, -14), M.steel);
    b.add(boxGeoAt(x - 1.5, 0, 14, x + 1.5, 42, 17), M.steel);
    b.add(boxGeoAt(x - 1.5, 0, -17, x + 1.5, 3, 17), M.steel);
  }
  b.add(boxGeoAt(-54, 10, -17, 54, 12, 17), M.steel);
  b.add(roundBoxAt(-58, 47, -17, -8, 51, 17, 2), M.cognac);
  b.add(boxGeoAt(10, 12, -12, 38, 26, 12), M.wicker);
  g.add(b.build('Panca'));
  info(g, 'Panca dell\'ingresso', 'Rovere affumicato su telaio in ferro, cuscino in cuoio');
  return g;
}

function coatRail(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(boxGeoAt(-62, -4, 0, 62, 4, 2.5), M.oakSmoked);
  for (let x = -52; x <= 52; x += 26) {
    b.add(rodGeo([x, 0, 2.5], [x, 2, 10], 1, 8), M.brassSatin);
    b.add(cylGeoAt(x, 1, 10, 1.6, 2.5, 12), M.brassSatin);
  }
  // un cappotto e una borsa
  b.add(roundBoxAt(-40, -95, 5, -12, -4, 16, 5), M.linenCharcoal);
  b.add(roundBoxAt(22, -48, 6, 44, -18, 16, 3), M.cognac);
  g.add(b.build('Appendiabiti'));
  info(g, 'Appendiabiti', 'Rovere e pomoli in ottone');
  return g;
}

function consoleTable(M) {
  const g = new THREE.Group();
  const b = new Batch();
  const w = 130;
  const d = 36;
  b.add(boxGeoAt(-w / 2, 76, 0, w / 2, 80, d), M.oakSmoked);
  for (const x of [-w / 2 + 2, w / 2 - 4]) {
    b.add(boxGeoAt(x, 0, 2, x + 2, 76, 4), M.steel);
    b.add(boxGeoAt(x, 0, d - 4, x + 2, 76, d - 2), M.steel);
    b.add(boxGeoAt(x, 0, 2, x + 2, 2, d - 2), M.steel);
  }
  b.add(boxGeoAt(-w / 2 + 2, 20, 2, w / 2 - 2, 22, d - 2), M.steel);
  b.add(boxGeoAt(-40, 22, 6, -10, 34, 30), M.wicker);
  g.add(b.build('Consolle'));
  info(g, 'Consolle', 'Rovere affumicato e ferro, 130 × 36 cm');
  return g;
}

function roundMirror(M) {
  const g = new THREE.Group();
  const ring = new THREE.TorusGeometry(40 * CM, 1.6 * CM, 10, 64);
  ring.translate(0, 40 * CM, 2 * CM);
  g.add(new THREE.Mesh(ring, M.steel));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(39 * CM, 64), M.mirror);
  glass.position.set(0, 40 * CM, 1.6 * CM);
  g.add(glass);
  info(g, 'Specchio tondo', 'Ø 80 cm, cornice in ferro nero');
  return g;
}

function umbrellaStand(M) {
  const g = new THREE.Group();
  const b = new Batch();
  b.add(cylGeoAt(0, 0, 0, 12, 50, 24, 12), M.stoneware);
  b.add(rodGeo([2, 30, 1], [5, 92, 4], 0.9, 6), M.black);
  b.add(tubeGeo([[5, 92, 4], [7, 97, 4], [10, 94, 4]], 0.9, 8, 6, 0.5), M.cognac);
  g.add(b.build('Portaombrelli'));
  info(g, 'Portaombrelli', 'Gres');
  return g;
}

