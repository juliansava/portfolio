// Texture procedurali disegnate su canvas: niente immagini esterne.
// Ogni generatore riempie un buffer colore (RGBA) e una mappa di altezza,
// da cui si ricava la normal map. Le texture sono tutte ripetibili
// (i bordi combaciano) e dichiarano la loro dimensione reale in metri.

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Rumore deterministico

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(i, j, seed = 0) {
  let h = (i * 374761393 + j * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Value noise ripetibile con periodo Pu x Pv celle.
function lattice(seed, Pu, Pv = Pu) {
  const r = mulberry32(seed);
  const lat = new Float32Array(Pu * Pv);
  for (let i = 0; i < lat.length; i++) lat[i] = r();
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const x0 = ((xi % Pu) + Pu) % Pu;
    const y0 = ((yi % Pv) + Pv) % Pv;
    const x1 = (x0 + 1) % Pu;
    const y1 = (y0 + 1) % Pv;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = lat[y0 * Pu + x0];
    const b = lat[y0 * Pu + x1];
    const c = lat[y1 * Pu + x0];
    const d = lat[y1 * Pu + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

// fbm su coordinate normalizzate [0,1), ripetibile ai bordi.
// pu e pv sono le celle dell'ottava base lungo u e lungo v.
export function fbmRect(seed, pu, pv, octaves = 4, gain = 0.5) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(lattice(seed + o * 7919, pu << o, pv << o));
  return (u, v) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * layers[o](u * (pu << o), v * (pv << o));
      norm += amp;
      amp *= gain;
    }
    return sum / norm;
  };
}

export function fbm(seed, basePeriod, octaves = 4, gain = 0.5) {
  return fbmRect(seed, basePeriod, basePeriod, octaves, gain);
}

// ---------------------------------------------------------------------------
// Utilità colore

const clamp = (v, a = 0, b = 255) => (v < a ? a : v > b ? b : v);

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// ---------------------------------------------------------------------------
// Dal buffer alle texture three.js

function canvasFrom(w, h, rgba) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  img.data.set(rgba);
  ctx.putImageData(img, 0, 0);
  return c;
}

function normalFromHeight(w, h, height, strength) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const yu = ((y - 1 + h) % h) * w;
    const yd = ((y + 1) % h) * w;
    const yr = y * w;
    for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w;
      const xr = (x + 1) % w;
      let nx = (height[yr + xl] - height[yr + xr]) * strength;
      let ny = (height[yd + x] - height[yu + x]) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (yr + x) * 4;
      out[i] = (nx / len) * 127.5 + 127.5;
      out[i + 1] = (ny / len) * 127.5 + 127.5;
      out[i + 2] = (1 / len) * 127.5 + 127.5;
      out[i + 3] = 255;
    }
  }
  return out;
}

function finish({ w, h, rgba, height, normalStrength, size, rough }) {
  const map = new THREE.CanvasTexture(canvasFrom(w, h, rgba));
  map.colorSpace = THREE.SRGBColorSpace;
  const result = { map, size };
  if (height && normalStrength) {
    const nrm = new THREE.CanvasTexture(canvasFrom(w, h, normalFromHeight(w, h, height, normalStrength)));
    nrm.colorSpace = THREE.NoColorSpace;
    result.normalMap = nrm;
  }
  if (rough) {
    const r = new THREE.CanvasTexture(canvasFrom(w, h, rough));
    r.colorSpace = THREE.NoColorSpace;
    result.roughnessMap = r;
  }
  for (const k of ['map', 'normalMap', 'roughnessMap']) {
    const t = result[k];
    if (!t) continue;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / size[0], 1 / size[1]);
    t.anisotropy = 8;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Intonaco: grigio rosato, velato come un marmorino consumato

export function plaster({ base = '#c2b1a8', seed = 11, size = 2.4, variation = 1 } = {}) {
  const w = 512;
  const h = 512;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const cloud = fbm(seed, 3, 5);
  const grain = fbm(seed + 3, 64, 2);
  const stain = fbm(seed + 9, 2, 4);
  const b = hexToRgb(base);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const c = cloud(u, v);
      const g = grain(u, v);
      const s = stain(u, v);
      const k = 1 + ((c - 0.5) * 0.16 + (g - 0.5) * 0.06 + Math.max(0, s - 0.62) * -0.18) * variation;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(b[0] * k + (s - 0.5) * 6);
      rgba[i + 1] = clamp(b[1] * k);
      rgba[i + 2] = clamp(b[2] * k - (s - 0.5) * 4);
      rgba[i + 3] = 255;
      height[y * w + x] = c * 0.6 + g * 0.4;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 1.2, size: [size, size] });
}

// ---------------------------------------------------------------------------
// Mattoni

// Listelli nuovi (cucina, parapetto): regolari, arancio, fuga grigia chiara.
export function brickNew({ seed = 5 } = {}) {
  const w = 1024;
  const h = 512;
  const size = [1.04, 0.52]; // 4 mattoni x 8 corsi
  const brickW = w / 4;
  const courseH = h / 8;
  const joint = 10; // ~1 cm
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const speck = fbm(seed, 64, 2);
  const cloud = fbm(seed + 1, 8, 3);
  const mortar = [196, 188, 176];
  const palette = [hexToRgb('#c8633c'), hexToRgb('#b9532f'), hexToRgb('#d27447'), hexToRgb('#a94a2c'), hexToRgb('#c96a45')];
  for (let y = 0; y < h; y++) {
    const course = Math.floor(y / courseH);
    const ly = y - course * courseH;
    const offset = (course % 2) * (brickW / 2);
    for (let x = 0; x < w; x++) {
      const xx = (x + offset) % w;
      const col = Math.floor(xx / brickW);
      const lx = xx - col * brickW;
      const u = x / w;
      const v = y / h;
      const edge = Math.min(lx, brickW - lx, ly, courseH - ly);
      const i = (y * w + x) * 4;
      let c;
      let hh;
      if (edge < joint / 2) {
        const n = speck(u, v);
        c = mix(mortar, [170, 162, 150], n);
        hh = 0.05 + n * 0.05;
      } else {
        const r = hash2(col, course, seed);
        const r2 = hash2(col + 17, course + 3, seed);
        const p = palette[Math.floor(r * palette.length)];
        const n = speck(u, v);
        const cl = cloud(u, v);
        const k = 0.9 + r2 * 0.18 + (cl - 0.5) * 0.18;
        c = [p[0] * k, p[1] * k, p[2] * k];
        // puntini più scuri tipici dell'impasto
        if (n > 0.78) c = mix(c, [110, 50, 30], (n - 0.78) * 2.2);
        const bevel = Math.min(1, (edge - joint / 2) / 3);
        hh = 0.55 + 0.45 * bevel - (n > 0.7 ? (n - 0.7) * 0.4 : 0);
      }
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
      height[y * w + x] = hh;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 6, size });
}

// Muratura storica a vista (muro sud): mattoni irregolari, fughe erose,
// tracce di intonaco rimasto.
export function brickOld({ seed = 21, plasterPatches = 0.42 } = {}) {
  const w = 1024;
  const h = 1024;
  const size = [2.08, 2.08]; // 8 mattoni x 32 corsi
  const brickW = w / 8;
  const courseH = h / 32;
  const joint = 7;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const speck = fbm(seed, 96, 2);
  const cloud = fbm(seed + 1, 12, 3);
  const patch = fbm(seed + 2, 3, 5);
  const erosion = fbm(seed + 4, 48, 3);
  const mortar = [176, 164, 148];
  const plasterC = [184, 168, 158];
  const palette = ['#8c4a38', '#7b4133', '#98543f', '#8e5a48', '#6f3b2f', '#a2644d', '#855043', '#a97a63', '#7f4a3c'].map(hexToRgb);
  const grime = fbm(seed + 6, 2, 4);
  for (let y = 0; y < h; y++) {
    const course = Math.floor(y / courseH);
    const ly = y - course * courseH;
    // piccoli sfalsamenti irregolari tra un corso e l'altro
    const offset = ((course % 2) * 0.5 + (hash2(course, 7, seed) - 0.5) * 0.12) * brickW;
    for (let x = 0; x < w; x++) {
      const xx = (((x + offset) % w) + w) % w;
      const col = Math.floor(xx / brickW);
      const lx = xx - col * brickW;
      const u = x / w;
      const v = y / h;
      const er = erosion(u, v);
      const jw = joint * (0.8 + er * 0.7);
      const edge = Math.min(lx, brickW - lx, ly, courseH - ly);
      const i = (y * w + x) * 4;
      let c;
      let hh;
      const pch = patch(u, v);
      if (edge < jw / 2) {
        c = mix(mortar, [150, 136, 118], speck(u, v));
        hh = 0.1 + speck(u, v) * 0.1;
      } else {
        const r = hash2(col, course, seed);
        const r2 = hash2(col + 5, course + 11, seed);
        const p = palette[Math.floor(r * palette.length)];
        const cl = cloud(u, v);
        const k = 0.85 + r2 * 0.3 + (cl - 0.5) * 0.25;
        c = [p[0] * k, p[1] * k, p[2] * k];
        const n = speck(u, v);
        if (n > 0.74) c = mix(c, [70, 36, 26], (n - 0.74) * 1.8);
        if (n < 0.2) c = mix(c, [200, 170, 140], (0.2 - n) * 1.5);
        const bevel = Math.min(1, (edge - jw / 2) / 4);
        hh = 0.5 + 0.4 * bevel + (cl - 0.5) * 0.2;
      }
      // sporco e patina a bassa frequenza
      const gr = grime(u, v);
      c = mix(c, [92, 70, 58], Math.max(0, gr - 0.55) * 0.9);
      // residui di intonaco in chiazze
      const pp = (pch - (1 - plasterPatches)) * 5;
      if (pp > 0) {
        const t = Math.min(1, pp);
        c = mix(c, plasterC, t * 0.85);
        hh = hh * (1 - t) + 0.8 * t;
      }
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
      height[y * w + x] = hh;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 5, size });
}

// ---------------------------------------------------------------------------
// Gres 60x60 grigio chiaro, fuga sottile

export function floorTiles({ seed = 3 } = {}) {
  const w = 1024;
  const h = 1024;
  const size = [1.2, 1.2];
  const tile = w / 2;
  const grout = 3;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const rough = new Uint8ClampedArray(w * h * 4);
  const cloud = fbm(seed, 4, 4);
  const speck = fbm(seed + 1, 128, 2);
  const base = hexToRgb('#c3beb5');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tx = Math.floor(x / tile);
      const ty = Math.floor(y / tile);
      const lx = x - tx * tile;
      const ly = y - ty * tile;
      const edge = Math.min(lx, tile - lx, ly, tile - ly);
      const u = x / w;
      const v = y / h;
      const i = (y * w + x) * 4;
      let c;
      let hh;
      let r;
      if (edge < grout / 2) {
        c = [176, 171, 162];
        hh = 0;
        r = 230;
      } else {
        const t = hash2(tx, ty, seed);
        const k = 0.97 + t * 0.05 + (cloud(u, v) - 0.5) * 0.06;
        const s = speck(u, v);
        c = [base[0] * k, base[1] * k, base[2] * k];
        if (s > 0.72) c = mix(c, [150, 146, 140], (s - 0.72) * 1.5);
        if (s < 0.22) c = mix(c, [236, 234, 230], (0.22 - s) * 2);
        hh = 1;
        r = 95 + (cloud(u, v) - 0.5) * 60;
      }
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
      rough[i] = rough[i + 1] = rough[i + 2] = clamp(r);
      rough[i + 3] = 255;
      height[y * w + x] = hh;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 2, size, rough });
}

// ---------------------------------------------------------------------------
// Legno

// Perlinato di abete del tetto: tavole da 12 cm lungo u (est-ovest).
export function pineBoards({ seed = 8 } = {}) {
  const w = 1024;
  const h = 512;
  const size = [2.4, 1.2];
  const boardH = h / 10; // 12 cm
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const gFine = fbmRect(seed, 16, 128, 3);
  const gCoarse = fbm(seed + 2, 4, 3);
  const light = hexToRgb('#ecd3a4');
  const dark = hexToRgb('#cf9f61');
  // nodi: posizioni fisse per tavola
  const knots = [];
  const r = mulberry32(seed);
  for (let b = 0; b < 10; b++) {
    const n = Math.floor(r() * 3);
    for (let k = 0; k < n; k++) knots.push({ b, u: r(), rad: 0.004 + r() * 0.006 });
  }
  for (let y = 0; y < h; y++) {
    const board = Math.floor(y / boardH);
    const ly = (y - board * boardH) / boardH;
    const bShift = hash2(board, 1, seed);
    const jointU = hash2(board, 2, seed); // testa della tavola
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const i = (y * w + x) * 4;
      const warp = gCoarse(u, v) * 3;
      const ring = Math.sin(((ly + bShift) * 7 + warp) * Math.PI * 2);
      const fine = gFine(u, v);
      let t = 0.45 + ring * 0.18 + (fine - 0.5) * 0.55 + (bShift - 0.5) * 0.25;
      let c = mix(light, dark, clamp(t, 0, 1));
      let hh = 1;
      for (const k of knots) {
        if (k.b !== board) continue;
        const du = Math.min(Math.abs(u - k.u), 1 - Math.abs(u - k.u)) * size[0];
        const dv = (ly - 0.5) * 0.12;
        const d = Math.hypot(du * 0.8, dv) / k.rad;
        if (d < 1) {
          c = mix(c, [120, 72, 34], (1 - d) * 0.9);
          hh -= (1 - d) * 0.3;
        } else if (d < 2.4) {
          c = mix(c, dark, (2.4 - d) * 0.25);
        }
      }
      // scuretto tra le tavole
      if (ly < 0.04 || ly > 0.96) {
        c = mix(c, [110, 76, 42], 0.7);
        hh = 0.2;
      }
      const jd = Math.abs(u - jointU) * w;
      if (jd < 1.5) {
        c = mix(c, [120, 84, 48], 0.6);
        hh = 0.4;
      }
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
      height[y * w + x] = hh;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 3, size });
}

// Legno massello con venatura lungo u: travetti, mobili, piani.
export function woodSolid({ seed = 30, light = '#c07a3c', dark = '#8d4f22', size = [1.2, 0.6], rings = 9, contrast = 1 } = {}) {
  const w = 512;
  const h = 256;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const gFine = fbmRect(seed, 8, 64, 3);
  const gCoarse = fbm(seed + 1, 4, 3);
  const L = hexToRgb(light);
  const D = hexToRgb(dark);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const warp = gCoarse(u, v) * 2.2;
      const ring = Math.sin((v * rings + warp) * Math.PI * 2);
      const fine = gFine(u, v);
      const t = clamp(0.5 + (ring * 0.28 + (fine - 0.5) * 0.6) * contrast, 0, 1);
      const c = mix(L, D, t);
      const i = (y * w + x) * 4;
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
      height[y * w + x] = fine;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 1.2, size });
}

// Parquet a listoncini di rovere (soppalco): 7 x 50 cm, posa a correre.
export function parquet({ seed = 13 } = {}) {
  const w = 1024;
  const h = 576;
  const size = [1.0, 0.56]; // 2 listoncini in lunghezza x 8 in larghezza
  const stripL = w / 2;
  const stripW = h / 8;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const gFine = fbmRect(seed, 16, 96, 3);
  const gCoarse = fbm(seed + 1, 4, 3);
  const tones = ['#c27a38', '#b56c2e', '#cf8a45', '#a9632b', '#c58446', '#b87433'].map(hexToRgb);
  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / stripW);
    const ly = (y - row * stripW) / stripW;
    const shift = hash2(row, 3, seed) * stripL;
    for (let x = 0; x < w; x++) {
      const xx = (x + shift) % w;
      const col = Math.floor(xx / stripL);
      const lx = (xx - col * stripL) / stripL;
      const u = x / w;
      const v = y / h;
      const i = (y * w + x) * 4;
      const tone = tones[Math.floor(hash2(col, row, seed) * tones.length)];
      const warp = gCoarse(u, v) * 2;
      const ring = Math.sin((ly * 3 + warp + hash2(col, row, 9) * 5) * Math.PI * 2);
      const fine = gFine(u, v);
      const k = 0.92 + ring * 0.06 + (fine - 0.5) * 0.22;
      let c = [tone[0] * k, tone[1] * k, tone[2] * k];
      let hh = 1;
      if (ly < 0.05 || ly > 0.95 || lx < 0.006 || lx > 0.994) {
        c = mix(c, [70, 38, 18], 0.55);
        hh = 0.3;
      }
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
      height[y * w + x] = hh;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 2, size });
}

// ---------------------------------------------------------------------------
// Marmo bianco venato (tavolino tondo)

export function marble({ seed = 41 } = {}) {
  const w = 512;
  const h = 512;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const turb = fbm(seed, 4, 5);
  const fine = fbm(seed + 1, 32, 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const t = turb(u, v);
      const vein = Math.abs(Math.sin((u * 3 + v * 2 + t * 5) * Math.PI));
      const k = Math.pow(vein, 0.18);
      const g = 232 - (1 - k) * 110 + (fine(u, v) - 0.5) * 14;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(g + 3);
      rgba[i + 1] = clamp(g + 2);
      rgba[i + 2] = clamp(g + 4);
      rgba[i + 3] = 255;
    }
  }
  return finish({ w, h, rgba, size: [0.8, 0.8] });
}

// ---------------------------------------------------------------------------
// Lamiera forata: maschera alfa con fori tondi a quinconce

export function perforated({ pitch = 0.012, hole = 0.0045 } = {}) {
  const w = 128;
  const h = 128;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const cells = 4;
  const cell = w / cells;
  const rad = (hole / pitch) * cell;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const row = Math.floor(y / cell);
      const ox = (row % 2) * cell * 0.5;
      const cx = Math.floor((x + ox) / cell) * cell + cell / 2 - ox;
      const cy = row * cell + cell / 2;
      const d = Math.hypot(x - cx, y - cy);
      const a = d < rad ? 0 : 255;
      const i = (y * w + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = a;
      rgba[i + 3] = 255;
    }
  }
  const tex = new THREE.CanvasTexture(canvasFrom(w, h, rgba));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / (pitch * cells), 1 / (pitch * cells));
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Tessuti

// Tenda paisley scura (viola-grigio), disegno a gocce.
export function paisleyFabric({ seed = 51 } = {}) {
  const w = 256;
  const h = 512;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const n = fbm(seed, 8, 3);
  const base = hexToRgb('#2c282d');
  const hi = hexToRgb('#5e5963');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const cu = (u * 4) % 1;
      const cv = ((v * 6) % 1) + (Math.floor(u * 4) % 2) * 0.5;
      const dx = cu - 0.5;
      const dy = (cv % 1) - 0.5;
      const drop = Math.hypot(dx * 1.3, dy + Math.sin(dx * 6) * 0.1);
      const ringy = Math.abs(Math.sin(drop * 28)) > 0.8 && drop < 0.38 ? 1 : 0;
      const t = ringy * 0.55 + (n(u, v) - 0.5) * 0.3;
      const c = mix(base, hi, clamp(t, 0, 1));
      const i = (y * w + x) * 4;
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
    }
  }
  return finish({ w, h, rgba, size: [0.5, 1.0] });
}

// Intreccio di vimini.
export function wicker({ seed = 61 } = {}) {
  const w = 256;
  const h = 256;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const n = fbm(seed, 16, 2);
  const L = hexToRgb('#d7a857');
  const D = hexToRgb('#8e6325');
  const cell = 16;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      const lx = (x % cell) / cell;
      const ly = (y % cell) / cell;
      const horiz = (cx + cy) % 2 === 0;
      const across = horiz ? ly : lx;
      const bump = Math.sin(across * Math.PI);
      const t = clamp(1 - bump * 0.8 + (n(x / w, y / h) - 0.5) * 0.4, 0, 1);
      const c = mix(L, D, t);
      const i = (y * w + x) * 4;
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
      height[y * w + x] = bump;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 2.5, size: [0.12, 0.12] });
}

// Stoffa a pois per cuscini (rosso mattone con puntini chiari).
export function dottedFabric({ base = '#b8452e', dot = '#e9c9a5' } = {}) {
  const w = 128;
  const h = 128;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const B = hexToRgb(base);
  const Dt = hexToRgb(dot);
  const cell = 16;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const row = Math.floor(y / cell);
      const ox = (row % 2) * cell * 0.5;
      const cx = Math.floor((x + ox) / cell) * cell + cell / 2 - ox;
      const cy = row * cell + cell / 2;
      const d = Math.hypot(x - cx, y - cy);
      const c = d < 2.4 ? Dt : B;
      const i = (y * w + x) * 4;
      rgba[i] = c[0];
      rgba[i + 1] = c[1];
      rgba[i + 2] = c[2];
      rgba[i + 3] = 255;
    }
  }
  return finish({ w, h, rgba, size: [0.1, 0.1] });
}

// ---------------------------------------------------------------------------
// Redesign: nuove finiture

// Lamiera mandorlata (scala del piano terra): rilievi a losanga alternati.
export function diamondPlate({ seed = 71 } = {}) {
  const w = 256;
  const h = 256;
  const size = [0.1, 0.1];
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const wear = fbm(seed, 4, 4);
  const cell = w / 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      const lx = (x % cell) / cell - 0.5;
      const ly = (y % cell) / cell - 0.5;
      // losanga allungata, ruotata di ±45° a scacchiera
      const s = (cx + cy) % 2 === 0 ? 1 : -1;
      const a = (lx + s * ly) / Math.SQRT2;
      const b = (lx - s * ly) / Math.SQRT2;
      const d = Math.pow(Math.abs(a) / 0.36, 2) + Math.pow(Math.abs(b) / 0.085, 2);
      const bump = d < 1 ? Math.sqrt(1 - d) : 0;
      const n = wear(x / w, y / h);
      // i rilievi consumati sono più chiari
      const g = 44 + bump * 38 + (n - 0.5) * 22;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(g);
      rgba[i + 1] = clamp(g + 1);
      rgba[i + 2] = clamp(g + 3);
      rgba[i + 3] = 255;
      height[y * w + x] = bump;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 3, size });
}

// Tappeto annodato a mano dai colori spenti: fondo, bordure e motivo centrale.
// Si applica a un piano con UV 0..1 (vedi rugGeo nei mobili).
export function rug({ seed = 81, field = '#b9a58a', border = '#7c4b35', accent = '#3e4a5a', light = '#d9ccb4', motif = 'medallion' } = {}) {
  const w = 512;
  const h = 512;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const wool = fbm(seed, 96, 2);
  const abrash = fbm(seed + 5, 3, 3);
  const F = hexToRgb(field);
  const B = hexToRgb(border);
  const A = hexToRgb(accent);
  const Lc = hexToRgb(light);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const e = Math.min(u, 1 - u, v, 1 - v);
      let c;
      if (e < 0.018) c = Lc;
      else if (e < 0.075) {
        // bordura a rombi
        const t = ((u + v) * 40) % 1;
        c = Math.abs(t - 0.5) < 0.18 ? A : B;
      } else if (e < 0.09) c = Lc;
      else {
        c = F;
        const du = u - 0.5;
        const dv = v - 0.5;
        if (motif === 'medallion') {
          const r = Math.abs(du) * 1.4 + Math.abs(dv);
          if (r < 0.2) c = r < 0.12 ? A : B;
          else if (Math.abs(r - 0.3) < 0.012) c = B;
          // ornati sparsi nel campo
          const g = Math.sin(u * 44) * Math.sin(v * 44);
          if (g > 0.93) c = mix(F, B, 0.7);
        } else if (motif === 'stripes') {
          const t = (v * 18) % 1;
          if (t < 0.12) c = B;
          else if (t > 0.5 && t < 0.56) c = A;
        } else if (motif === 'grid') {
          const t1 = (u * 9) % 1;
          const t2 = (v * 9) % 1;
          if (t1 < 0.05 || t2 < 0.05) c = mix(F, B, 0.55);
        }
      }
      const n = wool(u, v);
      const ab = abrash(u, v);
      const k = 0.9 + (n - 0.5) * 0.16 + (ab - 0.5) * 0.14;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(c[0] * k);
      rgba[i + 1] = clamp(c[1] * k);
      rgba[i + 2] = clamp(c[2] * k);
      rgba[i + 3] = 255;
      height[y * w + x] = n;
    }
  }
  const t = finish({ w, h, rgba, height, normalStrength: 1.5, size: [1, 1] });
  return t;
}

// Cuoio: grana fine e velature (divano, sedie, poltrone).
export function leather({ seed = 91, base = '#8a4e2b', size = 0.5 } = {}) {
  const w = 256;
  const h = 256;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const grain = fbm(seed, 48, 3, 0.6);
  const patina = fbm(seed + 2, 3, 4);
  const B = hexToRgb(base);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const g = grain(u, v);
      const p = patina(u, v);
      const cell = Math.abs(g - 0.5) < 0.035 ? -0.1 : 0;
      const k = 0.92 + (p - 0.5) * 0.3 + cell + (g - 0.5) * 0.08;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(B[0] * k + (p - 0.5) * 18);
      rgba[i + 1] = clamp(B[1] * k);
      rgba[i + 2] = clamp(B[2] * k);
      rgba[i + 3] = 255;
      height[y * w + x] = g + cell;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 1.2, size: [size, size] });
}

// Bouclé: riccioli di lana a rilievo.
export function boucle({ seed = 101, base = '#e6ddcc' } = {}) {
  const w = 256;
  const h = 256;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const loops = fbm(seed, 32, 3, 0.7);
  const B = hexToRgb(base);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = loops(x / w, y / h);
      const curl = Math.pow(Math.abs(Math.sin(n * 18)), 3);
      const k = 0.84 + curl * 0.2 + (n - 0.5) * 0.1;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(B[0] * k);
      rgba[i + 1] = clamp(B[1] * k);
      rgba[i + 2] = clamp(B[2] * k);
      rgba[i + 3] = 255;
      height[y * w + x] = curl;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 3, size: [0.12, 0.12] });
}

// Lino: trama e ordito leggermente irregolari (tende, biancheria, divani).
export function linen({ seed = 111, base = '#d8cfbf', size = 0.2 } = {}) {
  const w = 256;
  const h = 256;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const slub = fbmRect(seed, 4, 16, 3);
  const cloud = fbm(seed + 1, 2, 3);
  const B = hexToRgb(base);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const warp = Math.sin((x / 2) * Math.PI) * 0.5 + 0.5;
      const weft = Math.sin((y / 2) * Math.PI + slub(u, v) * 3) * 0.5 + 0.5;
      const t = (warp + weft) / 2;
      const k = 0.9 + (t - 0.5) * 0.12 + (slub(u, v) - 0.5) * 0.14 + (cloud(u, v) - 0.5) * 0.06;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(B[0] * k);
      rgba[i + 1] = clamp(B[1] * k);
      rgba[i + 2] = clamp(B[2] * k);
      rgba[i + 3] = 255;
      height[y * w + x] = t;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 0.8, size: [size, size] });
}

// Piastrelle fatte a mano (tipo zellige), posa a correre, fughe sottili.
export function handTiles({ seed = 121, base = '#e9e4da', size = [0.3, 0.15], cols = 4, rows = 4, glaze = 0.14 } = {}) {
  const w = 512;
  const h = 512;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const rough = new Uint8ClampedArray(w * h * 4);
  const wave = fbm(seed, 12, 3);
  const B = hexToRgb(base);
  const tw = w / cols;
  const th = h / rows;
  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / th);
    const ly = y - row * th;
    const off = (row % 2) * tw * 0.5;
    for (let x = 0; x < w; x++) {
      const xx = (x + off) % w;
      const col = Math.floor(xx / tw);
      const lx = xx - col * tw;
      const edge = Math.min(lx, tw - lx, ly, th - ly);
      const i = (y * w + x) * 4;
      const n = wave(x / w, y / h);
      let c;
      let hh;
      if (edge < 3) {
        c = [206, 200, 190];
        hh = 0;
      } else {
        const r = hash2(col, row, seed);
        const k = 1 - glaze + r * glaze * 1.4 + (n - 0.5) * glaze;
        c = [B[0] * k, B[1] * k, B[2] * k];
        hh = 0.6 + (n - 0.5) * 0.5 + Math.min(1, (edge - 3) / 6) * 0.3;
      }
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
      height[y * w + x] = hh;
      const rv = edge < 3 ? 235 : 40 + n * 50;
      rough[i] = rough[i + 1] = rough[i + 2] = rv;
      rough[i + 3] = 255;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 2.2, size, rough });
}

// Vetro cannettato: solo normal map a righe verticali.
export function reeded({ pitch = 0.012 } = {}) {
  const w = 64;
  const h = 8;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = ((x / w) * 4) % 1;
      height[y * w + x] = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
      const i = (y * w + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 255;
      rgba[i + 3] = 255;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 5, size: [pitch * 4, pitch * 4] });
}

// Travertino: bande orizzontali e piccole cavità.
export function travertine({ seed = 131, base = '#d8c7ab' } = {}) {
  const w = 512;
  const h = 512;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const height = new Float32Array(w * h);
  const band = fbm(seed, 2, 3);
  const fine = fbm(seed + 1, 48, 2);
  const pits = fbm(seed + 2, 24, 2);
  const B = hexToRgb(base);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const b = Math.sin((v * 9 + band(u, v) * 2.5) * Math.PI);
      const p = pits(u, v) > 0.72 ? 1 : 0;
      const k = 0.94 + b * 0.05 + (fine(u, v) - 0.5) * 0.08 - p * 0.18;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(B[0] * k);
      rgba[i + 1] = clamp(B[1] * k);
      rgba[i + 2] = clamp(B[2] * k - b * 3);
      rgba[i + 3] = 255;
      height[y * w + x] = 1 - p * 0.8;
    }
  }
  return finish({ w, h, rgba, height, normalStrength: 1.5, size: [0.9, 0.9] });
}

// Dorsi di libri su un ripiano (una fila per altezza di texture).
export function bookSpines({ seed = 141 } = {}) {
  const w = 512;
  const h = 128;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const palette = ['#2f3b46', '#7a3b2b', '#c9b99a', '#1f2a24', '#8c6a3f', '#e3dccd', '#4d5a4a', '#9a4d3a', '#2a2a2c', '#b8a07a', '#5b4033'].map(hexToRgb);
  const r = mulberry32(seed);
  let x = 0;
  const spines = [];
  while (x < w) {
    const bw = 5 + Math.floor(r() * 12);
    const top = Math.floor(r() * 34);
    spines.push({ x0: x, x1: Math.min(w, x + bw), top, c: palette[Math.floor(r() * palette.length)], band: r() > 0.5 });
    x += bw + (r() > 0.85 ? 2 : 0);
  }
  for (let y = 0; y < h; y++) {
    for (let xx = 0; xx < w; xx++) {
      const i = (y * w + xx) * 4;
      const s = spines.find((sp) => xx >= sp.x0 && xx < sp.x1);
      let c = [26, 22, 20]; // fondo in ombra
      if (s && y >= s.top) {
        const edge = xx === s.x0 || xx === s.x1 - 1;
        const k = edge ? 0.7 : 1;
        c = [s.c[0] * k, s.c[1] * k, s.c[2] * k];
        if (s.band && (y - s.top) % 40 > 8 && (y - s.top) % 40 < 12) c = mix(c, [210, 190, 140], 0.7);
      }
      rgba[i] = clamp(c[0]);
      rgba[i + 1] = clamp(c[1]);
      rgba[i + 2] = clamp(c[2]);
      rgba[i + 3] = 255;
    }
  }
  return finish({ w, h, rgba, size: [0.9, 0.3] });
}

// Quadro astratto a campiture (UV 0..1 sul piano della tela).
export function painting({ seed = 151, colors = ['#c9b79c', '#8f3f2a', '#2d3440', '#e8dfcf'], kind = 'fields' } = {}) {
  const w = 256;
  const h = 256;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const brush = fbm(seed, 8, 4);
  const cols = colors.map(hexToRgb);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const n = brush(u, v);
      let c;
      if (kind === 'fields') {
        const t = v + (n - 0.5) * 0.06;
        c = t < 0.08 || t > 0.94 ? cols[3] : t < 0.52 ? cols[0] : t < 0.58 ? cols[3] : cols[1];
        if (t > 0.6 && t < 0.9 && Math.abs(u - 0.5) > 0.4) c = cols[3];
      } else if (kind === 'arcs') {
        const d = Math.hypot(u - 0.3, v - 1.05);
        c = d < 0.45 ? cols[1] : d < 0.62 ? cols[0] : cols[3];
        if (Math.hypot(u - 0.78, v - 0.28) < 0.12) c = cols[2];
      } else {
        // segni a pennello su fondo chiaro
        const s = Math.sin(u * 7 + n * 6) * Math.cos(v * 5 - n * 4);
        c = s > 0.55 ? cols[2] : s < -0.7 ? cols[1] : cols[3];
      }
      const k = 0.94 + (n - 0.5) * 0.12;
      const i = (y * w + x) * 4;
      rgba[i] = clamp(c[0] * k);
      rgba[i + 1] = clamp(c[1] * k);
      rgba[i + 2] = clamp(c[2] * k);
      rgba[i + 3] = 255;
    }
  }
  return finish({ w, h, rgba, size: [1, 1] });
}
