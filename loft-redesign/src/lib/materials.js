// Libreria materiali: stato di fatto e finiture del redesign.
// Le geometrie usano UV in metri, quindi ogni texture si ripete
// secondo la sua misura reale (vedi textures.js).

import * as THREE from 'three';
import * as T from './textures.js';

function std(params) {
  return new THREE.MeshStandardMaterial(params);
}

function textured(tex, params = {}) {
  return std({
    map: tex.map,
    normalMap: tex.normalMap || null,
    roughnessMap: tex.roughnessMap || null,
    ...params,
  });
}

// Copia una texture cambiando la dimensione di ripetizione.
function resized(tex, sx, sy) {
  const out = {};
  for (const k of ['map', 'normalMap', 'roughnessMap']) {
    if (!tex[k]) continue;
    const t = tex[k].clone();
    t.needsUpdate = true;
    t.repeat.set(1 / sx, 1 / sy);
    out[k] = t;
  }
  return out;
}

export function createMaterials() {
  const plaster = T.plaster({ base: '#b3a096', seed: 11 });
  const plasterLight = T.plaster({ base: '#bfaea5', seed: 17, variation: 0.7 });
  const brickN = T.brickNew({ seed: 5 });
  const brickO = T.brickOld({ seed: 21 });
  const brickOBath = T.brickOld({ seed: 77, plasterPatches: 0.15 });
  const tiles = T.floorTiles({ seed: 3 });
  const pine = T.pineBoards({ seed: 8 });
  const rafter = T.woodSolid({ seed: 30, light: '#c88d52', dark: '#a0643a', size: [1.6, 0.4], rings: 5, contrast: 0.6 });
  const parq = T.parquet({ seed: 13 });
  const walnut = T.woodSolid({ seed: 33, light: '#6e4428', dark: '#3f2414', size: [1.0, 0.5], rings: 11 });
  const walnutLight = T.woodSolid({ seed: 36, light: '#9a6034', dark: '#5b341b', size: [1.0, 0.5], rings: 8 });
  const cherry = T.woodSolid({ seed: 39, light: '#b86a38', dark: '#8a4522', size: [0.9, 0.45], rings: 7, contrast: 0.7 });
  const oakTrunk = T.woodSolid({ seed: 44, light: '#b8763a', dark: '#7c4a22', size: [0.8, 0.4], rings: 6 });
  const marbleT = T.marble({ seed: 41 });
  const perfAlpha = T.perforated();
  const paisley = T.paisleyFabric();
  const wickerT = T.wicker();
  const dots = T.dottedFabric();
  // redesign
  const limewash = T.plaster({ base: '#d2c6b6', seed: 12, variation: 1.5 });
  const limewashLight = T.plaster({ base: '#ddd3c5', seed: 18, variation: 1.1 });
  const diamondT = T.diamondPlate();
  const cognac = T.leather({ base: '#8b4f2a' });
  const leatherDark = T.leather({ seed: 94, base: '#3b2a22' });
  const boucleT = T.boucle();
  const linenT = T.linen();
  const linenWhiteT = T.linen({ seed: 114, base: '#eee9e0', size: 0.15 });
  const linenCharT = T.linen({ seed: 117, base: '#5b5650', size: 0.18 });
  const oliveVelvetT = T.linen({ seed: 119, base: '#5f6446', size: 0.12 });
  const zellige = T.handTiles({ base: '#5d7465', seed: 123, size: [0.2, 0.1], glaze: 0.22 });
  const subway = T.handTiles({ base: '#ece8df', seed: 127, size: [0.3, 0.15], glaze: 0.08 });
  const reededT = T.reeded();
  const travT = T.travertine();
  const books = T.bookSpines();
  const oakSmoked = T.woodSolid({ seed: 47, light: '#6d5642', dark: '#3e3025', size: [1.2, 0.5], rings: 10, contrast: 0.8 });
  const oakNatural = T.woodSolid({ seed: 52, light: '#c9a57c', dark: '#9c7851', size: [1.2, 0.5], rings: 9, contrast: 0.6 });

  const M = {
    // Superfici murarie
    plaster: textured(plaster, { roughness: 0.92 }),
    plasterLight: textured(plasterLight, { roughness: 0.9 }),
    brickNew: textured(brickN, { roughness: 0.85, normalScale: new THREE.Vector2(0.9, 0.9) }),
    brickOld: textured(brickO, { roughness: 0.9, normalScale: new THREE.Vector2(1, 1) }),
    brickOldBath: textured(brickOBath, { roughness: 0.9 }),
    stoneSill: std({ color: '#a9a39a', roughness: 0.6 }),

    // Pavimenti e soffitti
    tiles: textured(tiles, { roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.6, 0.6) }),
    pine: textured(pine, { roughness: 0.72, normalScale: new THREE.Vector2(0.7, 0.7) }),
    rafter: textured(rafter, { roughness: 0.7 }),
    parquet: textured(parq, { roughness: 0.32, metalness: 0, normalScale: new THREE.Vector2(0.5, 0.5) }),

    // Acciaio e metalli
    steel: std({ color: '#232325', roughness: 0.5, metalness: 0.35 }),
    steelMatte: std({ color: '#1c1c1e', roughness: 0.75, metalness: 0.2 }),
    perforated: std({
      color: '#1f1f21',
      roughness: 0.6,
      metalness: 0.3,
      alphaMap: perfAlpha,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    }),
    stainless: std({ color: '#c9ccce', roughness: 0.28, metalness: 1 }),
    brushed: std({ color: '#b5b8ba', roughness: 0.42, metalness: 1 }),
    chrome: std({ color: '#e6e8ea', roughness: 0.12, metalness: 1 }),
    brass: std({ color: '#b08d4a', roughness: 0.35, metalness: 1 }),

    // Vetri
    windowGlass: std({
      color: '#eef3f6',
      emissive: '#e9f0f5',
      emissiveIntensity: 0.85,
      roughness: 0.2,
      side: THREE.DoubleSide,
    }),
    tinted: std({ color: '#2a2f33', roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.8 }),
    frosted: new THREE.MeshPhysicalMaterial({
      color: '#e9eeec',
      roughness: 0.55,
      transmission: 0.6,
      thickness: 0.004,
      transparent: true,
      opacity: 0.85,
    }),
    clearGlass: new THREE.MeshPhysicalMaterial({
      color: '#dfe9ea',
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.006,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
    lampGlass: std({ color: '#f4efe4', emissive: '#ffd9a0', emissiveIntensity: 1.6, roughness: 0.3 }),
    bulb: std({ color: '#fff4dc', emissive: '#ffdca0', emissiveIntensity: 3 }),

    // Legni dei mobili
    walnut: textured(walnut, { roughness: 0.55 }),
    walnutLight: textured(walnutLight, { roughness: 0.5 }),
    cherry: textured(cherry, { roughness: 0.5 }),
    oakTrunk: textured(oakTrunk, { roughness: 0.7 }),
    marble: textured(marbleT, { roughness: 0.25 }),

    // Tessuti, ceramiche, varie
    curtain: textured(paisley, { roughness: 0.95, side: THREE.DoubleSide }),
    wicker: textured(wickerT, { roughness: 0.85 }),
    cushion: textured(dots, { roughness: 0.95 }),
    velvet: std({ color: '#c8482b', roughness: 0.9 }),
    orangeFabric: std({ color: '#d7772f', roughness: 0.9 }),
    ceramic: std({ color: '#f3f2ee', roughness: 0.18 }),
    enamel: std({ color: '#ebe6d6', roughness: 0.4 }),
    white: std({ color: '#efeeea', roughness: 0.5 }),
    cardboard: std({ color: '#b58b5a', roughness: 0.95 }),
    tapeBlue: std({ color: '#2f63c8', roughness: 0.6 }),
    cream: std({ color: '#e3d3a6', roughness: 0.55 }),
    teal: std({ color: '#1f7f7a', roughness: 0.45 }),
    black: std({ color: '#141414', roughness: 0.6 }),
    rubber: std({ color: '#161616', roughness: 0.9 }),
    paper: std({ color: '#f1efe8', roughness: 0.9 }),
    poster: std({ color: '#6b5a48', roughness: 0.6 }),
    red: std({ color: '#b3261e', roughness: 0.5 }),
    plasticBlack: std({ color: '#1b1b1b', roughness: 0.35 }),
    bag: std({ color: '#f2f2f0', roughness: 0.4, transparent: true, opacity: 0.85 }),

    // --- Redesign -----------------------------------------------------------
    diamond: textured(diamondT, { color: '#bfc2c6', roughness: 0.55, metalness: 0.6 }),
    cognac: textured(cognac, { roughness: 0.55 }),
    leatherDark: textured(leatherDark, { roughness: 0.5 }),
    boucle: textured(boucleT, { roughness: 1 }),
    linen: textured(linenT, { roughness: 0.95, side: THREE.DoubleSide }),
    linenWhite: textured(linenWhiteT, { roughness: 0.95 }),
    linenCharcoal: textured(linenCharT, { roughness: 0.95 }),
    oliveVelvet: textured(oliveVelvetT, { roughness: 0.85 }),
    zellige: textured(zellige, { roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8) }),
    subway: textured(subway, { roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }),
    reeded: new THREE.MeshPhysicalMaterial({
      color: '#e4e6e1',
      roughness: 0.28,
      transmission: 0.55,
      thickness: 0.006,
      transparent: true,
      opacity: 0.8,
      normalMap: reededT.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
    }),
    travertine: textured(travT, { roughness: 0.55 }),
    books: textured(books, { roughness: 0.8 }),
    oakSmoked: textured(oakSmoked, { roughness: 0.5 }),
    oakNatural: textured(oakNatural, { roughness: 0.55 }),
    blackOak: std({ color: '#1d1a18', roughness: 0.55 }),
    mirror: std({ color: '#e6e8ea', roughness: 0.12, metalness: 0.9, envMapIntensity: 2.2 }),
    brassSatin: std({ color: '#a8874f', roughness: 0.42, metalness: 1 }),
    plantLeaf: std({ color: '#3f5a2c', roughness: 0.7, side: THREE.DoubleSide }),
    plantLeafLight: std({ color: '#5d7a3a', roughness: 0.65, side: THREE.DoubleSide }),
    oliveLeaf: std({ color: '#7d8a68', roughness: 0.8, side: THREE.DoubleSide }),
    bark: std({ color: '#5b4a3a', roughness: 0.95 }),
    soil: std({ color: '#2d231c', roughness: 1 }),
    terracotta: std({ color: '#a6593a', roughness: 0.9 }),
    concrete: std({ color: '#9d9891', roughness: 0.95 }),
    stoneware: std({ color: '#3a3836', roughness: 0.6 }),
    opal: std({ color: '#f6f1e6', emissive: '#ffe2b8', emissiveIntensity: 1.2, roughness: 0.4 }),
    vinyl: std({ color: '#0e0e10', roughness: 0.25 }),
    speakerCloth: std({ color: '#2a2724', roughness: 1 }),
    duvet: textured(linenWhiteT, { roughness: 1 }),
    amber: std({ color: '#7a3d10', roughness: 0.1, transparent: true, opacity: 0.85 }),
    bottleGreen: std({ color: '#29452c', roughness: 0.1, transparent: true, opacity: 0.85 }),
    // resto del piano terra: volume trasparente, non rilevato
    massing: std({ color: '#d9d3cb', roughness: 1, transparent: true, opacity: 0.28, depthWrite: false }),
    massingBase: std({ color: '#8f8a84', roughness: 1 }),
    builtIn: textured(oakNatural, { roughness: 0.6, side: THREE.DoubleSide }),
    glassFloor: new THREE.MeshPhysicalMaterial({
      color: '#cfe0db',
      roughness: 0.08,
      transmission: 0.85,
      thickness: 0.03,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  };

  // Tele dei quadri e tappeti (UV 0..1 sul pezzo)
  const paint = (opts) => {
    const t = T.painting(opts);
    t.map.repeat.set(1, 1);
    return std({ map: t.map, roughness: 0.85 });
  };
  M.art1 = paint({ seed: 151, colors: ['#c8b393', '#7e3a28', '#2d3440', '#ebe2d2'], kind: 'fields' });
  M.art2 = paint({ seed: 157, colors: ['#d9cbb2', '#a4553a', '#28323a', '#efe7d9'], kind: 'arcs' });
  M.art3 = paint({ seed: 163, colors: ['#ddd3c3', '#9b4c33', '#1f2328', '#f1ebe0'], kind: 'marks' });
  const rugOf = (opts) => {
    const t = T.rug(opts);
    for (const k of ['map', 'normalMap']) t[k].repeat.set(1, 1);
    return std({ map: t.map, normalMap: t.normalMap, roughness: 1 });
  };
  M.rugLiving = rugOf({ seed: 81, field: '#b7a489', border: '#6f4431', accent: '#3b4757', light: '#dcd0bb', motif: 'medallion' });
  M.rugDining = rugOf({ seed: 83, field: '#a9937a', border: '#5a3a2c', accent: '#8b5a3c', light: '#d8cab2', motif: 'grid' });
  M.rugBed = rugOf({ seed: 85, field: '#cfc2ad', border: '#8c7156', accent: '#5b6371', light: '#e4dbcb', motif: 'grid' });
  M.runner = rugOf({ seed: 87, field: '#8a4a33', border: '#2f2a2a', accent: '#c29a62', light: '#d8c6a4', motif: 'stripes' });

  // Intonaco dello stato di fatto e velatura a calce del progetto: si
  // scambiano le mappe sullo stesso materiale (vedi setScenario)
  M._plasterMaps = {
    current: { plaster: plaster, plasterLight: plasterLight },
    project: { plaster: limewash, plasterLight: limewashLight },
  };

  // Varianti con scala diversa della stessa texture
  M.pineSmall = textured(resized(pine, 1.2, 0.6), { roughness: 0.7 });
  M.walnutFine = textured(resized(walnut, 0.5, 0.25), { roughness: 0.55 });

  // Registro per aggiornare anisotropia dopo la creazione del renderer
  M._all = Object.values(M).filter((m) => m && m.isMaterial);
  return M;
}

// Scambia l'intonaco tra stato di fatto e progetto.
export function setPlaster(M, scenario) {
  const maps = M._plasterMaps[scenario];
  for (const key of ['plaster', 'plasterLight']) {
    const m = M[key];
    m.map = maps[key].map;
    m.normalMap = maps[key].normalMap || null;
    m.needsUpdate = true;
  }
}

export function setAnisotropy(M, value) {
  for (const m of M._all) {
    for (const k of ['map', 'normalMap', 'roughnessMap']) {
      if (m[k]) {
        m[k].anisotropy = value;
        m[k].needsUpdate = true;
      }
    }
  }
}
