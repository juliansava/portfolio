// Libreria materiali dello stato di fatto.
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
  };

  // Varianti con scala diversa della stessa texture
  M.pineSmall = textured(resized(pine, 1.2, 0.6), { roughness: 0.7 });
  M.walnutFine = textured(resized(walnut, 0.5, 0.25), { roughness: 0.55 });

  // Registro per aggiornare anisotropia dopo la creazione del renderer
  M._all = Object.values(M).filter((m) => m && m.isMaterial);
  return M;
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
