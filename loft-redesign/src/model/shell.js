// Involucro: murature, solai, falda del tetto, finestre, tramezzi e
// atrio d'ingresso al piano terra.

import * as THREE from 'three';
import { S, roofY } from '../survey.js';
import { CM, boxAt, boxGeoAt, cylGeoAt, prismGeo, wallGeo, archOutline, Batch, info, rodGeo } from '../lib/geo.js';

const L = S.totalLength; // 1097
const D = S.depth; // 500
const T = S.wallT;
const G = S.ground.level; // -380
const BASE = G - 20; // piede dei muri
const HALL = S.ground.hall;
const DOOR = S.ground.door;
// Finestra dell'atrio sotto W1 (ipotesi)
export const GROUND_WINDOW = { id: 'W0', x0: 170, x1: 280, sill: G + 95, crown: G + 300 };
// Contorno del solaio del piano principale: tacca del vano scala sul muro ovest
const SW = S.stairwell;
export const SLAB_OUTLINE = [
  [0, 0],
  [L, 0],
  [L, D],
  [0, D],
  [0, SW.z1],
  [SW.x1, SW.z1],
  [SW.x1, SW.z0],
  [0, SW.z0],
];

export function buildShell(M) {
  const shell = new THREE.Group();
  shell.name = 'involucro';

  const walls = new THREE.Group();
  walls.name = 'muri';
  shell.add(walls);
  // un gruppo per lato: nella vista assonometrica si nasconde il lato
  // rivolto verso l'osservatore
  const sides = {};
  for (const side of ['north', 'south', 'west', 'east']) {
    sides[side] = new THREE.Group();
    sides[side].name = `lato ${side}`;
    sides[side].userData.side = side;
    walls.add(sides[side]);
  }

  // --- Muro nord (intonaco) -------------------------------------------------
  const topN = roofY(0) + 25;
  const north = new THREE.Mesh(
    wallGeo({
      start: [L + T, 0],
      end: [-T, 0],
      t: T,
      profile: [
        [0, BASE],
        [L + 2 * T, BASE],
        [L + 2 * T, topN],
        [0, topN],
      ],
    }),
    [M.plaster, M.plaster],
  );
  north.userData.side = 'north';
  info(north, 'Muro nord', 'Muratura intonacata, altezza al colmo circa 6,19 m');
  sides.north.add(north);

  // --- Muro sud (mattoni a vista, finestre ad arco) -------------------------
  const topS = roofY(D + T) + 24;
  const holes = [...S.windows, GROUND_WINDOW].map((w) => archOutline(w.x0 + T, w.x1 + T, w.sill, w.crown, 28));
  holes.push([
    [DOOR.x0 + T, G],
    [DOOR.x1 + T, G],
    [DOOR.x1 + T, G + DOOR.h],
    [DOOR.x0 + T, G + DOOR.h],
  ]);
  const south = new THREE.Mesh(
    wallGeo({
      start: [-T, D],
      end: [L + T, D],
      t: T,
      profile: [
        [0, BASE],
        [L + 2 * T, BASE],
        [L + 2 * T, topS],
        [0, topS],
      ],
      holes,
    }),
    [M.brickOld, M.plaster],
  );
  south.userData.side = 'south';
  info(south, 'Muro sud', 'Mattoni pieni a vista, imposta della falda a 4,30 m; al piano terra portoncino d\'ingresso');
  sides.south.add(south);

  // --- Muri di testata (seguono la falda) -----------------------------------
  const gable = (z) => roofY(z) + 24;
  const west = new THREE.Mesh(
    wallGeo({
      start: [0, -T],
      end: [0, D + T],
      t: T,
      profile: [
        [0, BASE],
        [D + 2 * T, BASE],
        [D + 2 * T, gable(D + T)],
        [0, gable(-T)],
      ],
    }),
    [M.plaster, M.plaster],
  );
  west.userData.side = 'west';
  info(west, 'Muro ovest', 'Testata intonacata, segue la pendenza della falda');
  sides.west.add(west);

  const east = new THREE.Mesh(
    wallGeo({
      start: [L, D + T],
      end: [L, -T],
      t: T,
      profile: [
        [0, BASE],
        [D + 2 * T, BASE],
        [D + 2 * T, gable(-T)],
        [0, gable(D + T)],
      ],
    }),
    [M.plaster, M.plaster],
  );
  east.userData.side = 'east';
  info(east, 'Muro est', 'Testata intonacata sopra la fascia servizi');
  sides.east.add(east);

  // Lesene intonacate sul muro sud, in asse con i pilastri
  for (const x of S.southPilasters) {
    const hw = S.southPilasterW / 2;
    const p = boxAt(M.plaster, x - hw, 0, D - 5, x + hw, S.roofAtSouth, D);
    info(p, 'Lesena intonacata', `Larghezza ${S.southPilasterW} cm, in asse con il pilastro`);
    sides.south.add(p);
  }

  // Finestre, davanzali e bastoni delle tende
  for (const w of S.windows) sides.south.add(buildWindow(M, w));
  sides.south.add(buildWindow(M, GROUND_WINDOW));
  sides.south.add(buildEntryDoor(M));

  // Cassonetto / canna fumaria sul muro nord
  const ch = S.chimney;
  const chimney = boxAt(M.plaster, ch.x0, G, 0, ch.x1, S.mezzUnder, ch.depth);
  info(chimney, 'Cassonetto a muro', `${ch.x1 - ch.x0} × ${ch.depth} cm, dal piano terra al soppalco`);
  sides.north.add(chimney);

  // Lesene del muro nord al livello del soppalco
  for (const p of S.northPilasters) {
    const top = roofY(p.depth) + 10;
    const m = boxAt(M.plaster, p.x0, S.mezzTop, 0, p.x1, top, p.depth);
    info(m, 'Lesena muro nord (soppalco)', `${p.x1 - p.x0} × ${p.depth} cm`);
    sides.north.add(m);
  }

  // Griglia di ripresa dell'aria sul muro nord
  const grille = new Batch();
  grille.add(boxGeoAt(425, 262, 0, 505, 294, 2.5), M.steelMatte);
  for (let y = 266; y < 292; y += 4) grille.add(boxGeoAt(428, y, 2.5, 502, y + 1.4, 3.2), M.brushed);
  const g = grille.build('Griglia aria');
  info(g, 'Griglia di ripresa aria', '80 × 32 cm');
  sides.north.add(g);

  // --- Solaio del piano principale e pavimenti ----------------------------
  const floor = new THREE.Mesh(prismGeo(SLAB_OUTLINE, -4, 0), M.tiles);
  floor.name = 'pavimento';
  info(floor, 'Pavimento', 'Gres porcellanato 60 × 60 cm grigio chiaro');
  shell.add(floor);
  const slab = new THREE.Mesh(prismGeo(SLAB_OUTLINE, -S.ground.slab, -4), [M.plasterLight, M.steelMatte]);
  info(slab, 'Solaio del piano principale', `Spessore ${S.ground.slab} cm, foro del vano scala ${SW.x1 - SW.x0} × ${SW.z1 - SW.z0} cm`);
  shell.add(slab);

  // --- Piano terra -------------------------------------------------------------
  shell.add(buildGround(M, sides));

  // --- Tramezzo tra open space e servizi ------------------------------------
  shell.add(buildPartition(M));

  // --- Falda del tetto ---------------------------------------------------------
  shell.add(buildRoof(M));

  return shell;
}

// ---------------------------------------------------------------------------
// Piano terra: atrio d'ingresso (ipotesi) e resto del piano come volume

function buildGround(M, sides) {
  const g = new THREE.Group();
  g.name = 'piano terra';
  const top = -S.ground.slab;
  const hallFloor = boxAt(M.tiles, HALL.x0, G - 4, HALL.z0, HALL.x1, G, HALL.z1);
  info(hallFloor, 'Pavimento dell\'atrio', 'Gres 60 × 60 cm come al piano principale (ipotesi)');
  g.add(hallFloor);
  // muro tra atrio e resto del piano terra
  const wall = boxAt(M.plaster, HALL.x1, G, 0, HALL.x1 + 25, top, D);
  info(wall, 'Muro dell\'atrio', 'Separa l\'ingresso dal resto del piano terra (ipotesi)');
  wall.userData.side = 'east';
  sides.east.add(wall);
  // resto del piano terra: volume neutro, non rilevato
  const mass = boxAt(M.massing, HALL.x1 + 25, G, 0, L, top, D);
  mass.userData.massing = true;
  mass.userData.noShadow = true;
  info(mass, 'Resto del piano terra', 'Altre unità, non rilevate: volume indicativo');
  g.add(mass);
  // locale caldaia: gabbia in lamiera forata nell'angolo nord-est (foto 6)
  g.add(boilerCage(M));
  // fondazione, visibile nelle sezioni
  const base = boxAt(M.massingBase, -T - 20, BASE - 20, -T - 20, L + T + 20, G - 4, D + T + 20);
  base.userData.noPick = true;
  g.add(base);
  return g;
}

export const BOILER = { x0: 240, x1: HALL.x1, z0: 30, z1: 150 };

function boilerCage(M) {
  const c = BOILER;
  const g = new THREE.Group();
  g.name = 'caldaia';
  const top = -S.ground.slab;
  const b = new Batch();
  for (const [x, z] of [
    [c.x0, c.z0],
    [c.x0, c.z1 - 4],
    [c.x1 - 4, c.z1 - 4],
  ]) {
    b.add(boxGeoAt(x, G, z, x + 4, top, z + 4), M.steel);
  }
  for (const y of [G + 1, G + 220, top - 5]) {
    b.add(boxGeoAt(c.x0, y, c.z1 - 4, c.x1, y + 4, c.z1), M.steel);
    b.add(boxGeoAt(c.x0, y, c.z0, c.x0 + 4, y + 4, c.z1), M.steel);
  }
  // caldaia murale e canne fumarie fino al solaio
  b.add(boxGeoAt(c.x1 - 36, G + 130, 62, c.x1 - 2, G + 215, 108), M.white);
  for (const z of [72, 98]) b.add(cylGeoAt(c.x1 - 20, G + 215, z, 5, top - G - 215, 14), M.steelMatte);
  b.add(cylGeoAt(c.x1 - 26, G, 50, 6, 150, 14), M.steelMatte);
  g.add(b.build('Locale caldaia'));
  g.add(boxAt(M.perforated, c.x0 + 1, G + 5, c.z0 + 4, c.x0 + 2, top - 5, c.z1 - 4));
  g.add(boxAt(M.perforated, c.x0 + 4, G + 5, c.z1 - 2.5, c.x1 - 4, top - 5, c.z1 - 1.5));
  info(g, 'Locale caldaia', 'Gabbia in ferro e lamiera forata, caldaia murale e canne fumarie (foto 6)');
  return g;
}

// Portoncino d'ingresso in ferro e vetro, con sopraluce.
function buildEntryDoor(M) {
  const g = new THREE.Group();
  g.name = 'Portoncino';
  const b = new Batch();
  const z0 = D + 20;
  const z1 = D + 26;
  const { x0, x1, h } = DOOR;
  const p = 6;
  b.add(boxGeoAt(x0, G, z0, x0 + p, G + h, z1), M.steel);
  b.add(boxGeoAt(x1 - p, G, z0, x1, G + h, z1), M.steel);
  b.add(boxGeoAt(x0, G + h - p, z0, x1, G + h, z1), M.steel);
  b.add(boxGeoAt(x0 + p, G + 205, z0, x1 - p, G + 211, z1), M.steel);
  b.add(boxGeoAt(x0 + p, G, z0, x1 - p, G + 12, z1), M.steel);
  b.add(boxGeoAt(x0 + p, G + 100, z0 - 0.5, x1 - p, G + 104, z1), M.steel);
  b.add(boxGeoAt(x1 - 16, G + 95, z0 - 6, x1 - 13, G + 125, z0 - 1), M.brushed);
  g.add(b.build());
  const glass = boxAt(M.windowGlass, x0 + p, G + 12, z0 + 2.5, x1 - p, G + h - p, z0 + 3.5);
  glass.userData.noShadow = true;
  g.add(glass);
  info(g, 'Portoncino d\'ingresso', `${x1 - x0} × ${h} cm, ferro e vetro con sopraluce (posizione ipotizzata)`);
  return g;
}

// ---------------------------------------------------------------------------

function buildWindow(M, w) {
  const g = new THREE.Group();
  g.name = `Finestra ${w.id}`;
  const width = w.x1 - w.x0;
  const zFrame = D + 24; // telaio arretrato di 24 cm dal filo interno
  const prof = 5; // larghezza profilo in ferro
  const depth = 5;

  // Telaio perimetrale: anello tra contorno esterno e contorno interno
  const outer = archOutline(w.x0, w.x1, w.sill, w.crown, 32);
  const inner = archOutline(w.x0 + prof, w.x1 - prof, w.sill + prof, w.crown - prof, 32);
  const shape = new THREE.Shape(outer.map(([u, v]) => new THREE.Vector2(u * CM, v * CM)));
  shape.holes.push(new THREE.Path(inner.map(([u, v]) => new THREE.Vector2(u * CM, v * CM)).reverse()));
  const frameGeo = new THREE.ExtrudeGeometry(shape, { depth: depth * CM, bevelEnabled: false, curveSegments: 1 });
  frameGeo.translate(0, 0, zFrame * CM);
  const frame = new THREE.Mesh(frameGeo, M.steel);
  frame.castShadow = true;
  g.add(frame);

  // Montante centrale e traversi
  const bars = new Batch();
  const mid = (w.x0 + w.x1) / 2;
  bars.add(boxGeoAt(mid - 2.5, w.sill + prof, zFrame, mid + 2.5, w.crown - prof, zFrame + depth), M.steel);
  const spring = w.crown - width / 2;
  const transoms = w.crown > 330 ? [w.sill + 92, spring - 28] : [w.sill + 92];
  for (const y of transoms) bars.add(boxGeoAt(w.x0 + prof, y - 2, zFrame, w.x1 - prof, y + 2, zFrame + depth), M.steel);
  bars.add(boxGeoAt(w.x0 + prof, spring - 2, zFrame, w.x1 - prof, spring + 2, zFrame + depth), M.steel);
  // maniglie a leva
  bars.add(boxGeoAt(mid + 4, w.sill + 110, zFrame - 3, mid + 6, w.sill + 128, zFrame), M.steel);
  g.add(bars.build());

  // Vetro: luminoso, non proietta ombra così la luce entra
  const glassShape = new THREE.Shape(inner.map(([u, v]) => new THREE.Vector2(u * CM, v * CM)));
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(glassShape), M.windowGlass);
  glass.position.z = (zFrame + 2.5) * CM;
  glass.castShadow = false;
  glass.userData.noShadow = true;
  info(glass, `Finestra ${w.id}`, `Ad arco a tutto sesto, ${width} × ${w.crown - w.sill} cm, davanzale a ${w.sill} cm`);
  g.add(glass);

  // Davanzale interno in pietra
  const sill = boxAt(M.stoneSill, w.x0 - 3, w.sill - 4, D - 3, w.x1 + 3, w.sill, zFrame);
  g.add(sill);

  // Bastone per tende sopra le finestre alte
  if (w.crown > 330) {
    const rodY = w.crown + 30;
    const rod = new THREE.Mesh(rodGeo([w.x0 - 30, rodY, D - 12], [w.x1 + 30, rodY, D - 12], 1.2), M.steel);
    g.add(rod);
    for (const x of [w.x0 - 26, w.x1 + 26]) g.add(new THREE.Mesh(rodGeo([x, rodY, D - 12], [x, rodY, D], 0.8), M.steel));
  }
  return g;
}

// ---------------------------------------------------------------------------

function buildPartition(M) {
  const g = new THREE.Group();
  g.name = 'tramezzo';
  const x = S.mainLength;
  const t = S.partitionT;
  const d = S.bathDoor;
  // u = 500 - z, estrusione verso est
  const wall = new THREE.Mesh(
    wallGeo({
      start: [x, D],
      end: [x, 0],
      t,
      profile: [
        [0, 0],
        [D, 0],
        [D, S.mezzUnder],
        [0, S.mezzUnder],
      ],
      holes: [
        [
          [D - d.z1, 0.01],
          [D - d.z0, 0.01],
          [D - d.z0, d.h],
          [D - d.z1, d.h],
        ],
      ],
    }),
    [M.plaster, M.plaster],
  );
  info(wall, 'Tramezzo servizi', `Spessore ${t} cm, porta bagno ${d.z1 - d.z0} × ${d.h} cm`);
  g.add(wall);

  // Rivestimento in listelli di mattone sul lato cucina
  const clad = boxAt(M.brickNew, x - 2, 0, S.mezzEdgeZ + 3, x, S.mezzUnder, D);
  info(clad, 'Parete cucina', 'Listelli in laterizio a vista');
  g.add(clad);

  // Telaio nero della porta del bagno
  const frame = new Batch();
  frame.add(boxGeoAt(x - 1.5, 0, d.z0 - 4, x + t + 1.5, d.h + 4, d.z0), M.steel);
  frame.add(boxGeoAt(x - 1.5, 0, d.z1, x + t + 1.5, d.h + 4, d.z1 + 4), M.steel);
  frame.add(boxGeoAt(x - 1.5, d.h, d.z0 - 4, x + t + 1.5, d.h + 4, d.z1 + 4), M.steel);
  const fr = frame.build('Telaio porta');
  info(fr, 'Porta del bagno', 'Telaio in ferro nero, anta scorrevole a scomparsa');
  g.add(fr);

  // Fascia servizi: muro che separa ripostiglio (nord) e bagno (sud)
  const zc = S.serviceWallZ;
  const x0 = S.rightX0;
  const x1 = S.rightX1;
  g.add(boxAt(M.plaster, x0, 0, zc - 5, x0 + 20, S.mezzUnder, zc + 5));
  g.add(boxAt(M.plaster, x0 + 20, 210, zc - 5, x0 + 111, S.mezzUnder, zc + 5));
  g.add(boxAt(M.plaster, x0 + 111, 0, zc - 5, x1, S.mezzUnder, zc + 5));
  // anta scorrevole del ripostiglio, aperta davanti al muro
  const leaf = boxAt(M.white, x0 + 114, 1, zc + 5, x0 + 205, 209, zc + 8);
  info(leaf, 'Porta scorrevole ripostiglio', '90 × 210 cm');
  leaf.userData.scenario = 'current';
  g.add(leaf);
  // soffitto dei servizi (intradosso del soppalco sopra la fascia est)
  return g;
}

// ---------------------------------------------------------------------------

function buildRoof(M) {
  const g = new THREE.Group();
  g.name = 'tetto';
  const x0 = -T;
  const x1 = L + T;
  const rise = S.roofAtNorth - S.roofAtSouth;
  const run = D;
  const angle = Math.atan2(rise, run); // pendenza verso sud
  const slope = Math.hypot(rise, run);

  // Tavolato di abete (intradosso visibile), tavole est-ovest
  const boardsT = 3;
  const boards = new THREE.Mesh(
    new THREE.BoxGeometry((x1 - x0) * CM, boardsT * CM, (slope + 2 * T) * CM),
    [M.pine, M.pine, M.steelMatte, M.pine, M.pine, M.pine],
  );
  fixBoxUV(boards.geometry, (x1 - x0) * CM, boardsT * CM, (slope + 2 * T) * CM);
  boards.rotation.x = angle;
  const midZ = D / 2;
  boards.position.set(((x0 + x1) / 2) * CM, (roofY(midZ) + boardsT / 2) * CM, midZ * CM);
  info(boards, 'Tetto in legno', 'Perlinato di abete su travetti, pendenza 20,7° (37,7%)');
  g.add(boards);

  // Pacchetto di copertura (coppi) visibile dall'esterno
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry((x1 - x0 + 60) * CM, 22 * CM, (slope + 2 * T + 60) * CM),
    new THREE.MeshStandardMaterial({ color: '#9b5b3f', roughness: 0.9 }),
  );
  pack.rotation.x = angle;
  pack.position.set(((x0 + x1) / 2) * CM, (roofY(midZ) + boardsT + 11) * CM, midZ * CM);
  pack.userData.noPick = true;
  pack.userData.roofTop = true;
  g.add(pack);

  // Travetti in abete tinto, interasse circa 90 cm, lungo la pendenza
  const raft = new Batch();
  const rw = 10;
  const rh = 15;
  const n = Math.round(L / 90);
  const step = (L - 2 * 40) / (n - 1);
  for (let i = 0; i < n; i++) {
    const cx = 40 + i * step;
    const geo = new THREE.BoxGeometry(rw * CM, rh * CM, slope * CM);
    fixBoxUV(geo, rw * CM, rh * CM, slope * CM, true);
    geo.rotateX(angle);
    geo.translate(cx * CM, (roofY(midZ) - rh / 2) * CM, midZ * CM);
    raft.add(geo, M.rafter);
  }
  const rafters = raft.build('Travetti');
  info(rafters, 'Travetti del tetto', `${rw} × ${rh} cm, ${n} elementi a interasse ${Math.round(step)} cm`);
  g.add(rafters);

  // Trave di banchina sul muro nord
  const plate = boxAt(M.rafter, 0, S.northPlateBottom, 0, L, roofY(S.northPlateDepth), S.northPlateDepth);
  info(plate, 'Trave di banchina', 'Appoggio dei travetti sul muro nord, intradosso a 5,80 m');
  g.add(plate);

  g.userData.roof = true;
  return g;
}

// UV in metri per un box; se alongZ la venatura segue la lunghezza (z).
function fixBoxUV(g, w, h, d, alongZ = false) {
  const uv = g.attributes.uv;
  const dims = alongZ
    ? [
        [d, h],
        [d, h],
        [d, w],
        [d, w],
        [w, h],
        [w, h],
      ]
    : [
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
      let u = uv.getX(idx);
      let v = uv.getY(idx);
      if (alongZ && (f === 2 || f === 3)) [u, v] = [v, u];
      uv.setXY(idx, u * dims[f][0], v * dims[f][1]);
    }
  }
}
