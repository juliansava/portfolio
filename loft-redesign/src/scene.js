// Costruzione della scena: materiali, modello, luci.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { createMaterials, setAnisotropy } from './lib/materials.js';
import { buildShell } from './model/shell.js';
import { buildMezzanine, buildStairEnclosure } from './model/structure.js';
import { buildStair } from './model/stair.js';
import { buildKitchen } from './model/kitchen.js';
import { buildBathroom } from './model/bathroom.js';
import { buildFurniture } from './model/furniture.js';
import { S } from './survey.js';
import { CM } from './lib/geo.js';

export function buildScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9d4cc');

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const M = createMaterials();
  setAnisotropy(M, renderer.capabilities.getMaxAnisotropy());

  const model = new THREE.Group();
  model.name = 'loft';
  scene.add(model);

  const lamps = [];
  const layers = {
    shell: buildShell(M),
    mezzanine: buildMezzanine(M),
    stair: buildStair(M),
    enclosure: buildStairEnclosure(M),
    kitchen: buildKitchen(M, lamps),
    bathroom: buildBathroom(M),
    furniture: buildFurniture(M, lamps),
  };
  for (const g of Object.values(layers)) model.add(g);

  const lights = addLights(scene, lamps);

  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !o.userData.noShadow && !o.material?.transparent;
      o.receiveShadow = true;
    }
  });

  return { scene, M, model, layers, lights };
}

function addLights(scene, lamps) {
  RectAreaLightUniformsLib.init();
  const L = S.totalLength * CM;
  const D = S.depth * CM;

  const hemi = new THREE.HemisphereLight('#efe9e1', '#8d7c68', 0.62);
  scene.add(hemi);

  // Sole da sud-sud-ovest, basso: entra dalle finestre ad arco
  const sun = new THREE.DirectionalLight('#fff0d8', 2.3);
  sun.position.set(L / 2 - 6, 7.5, D + 9);
  sun.target.position.set(L / 2 - 1, 0, D / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -9;
  sc.right = 9;
  sc.top = 9;
  sc.bottom = -9;
  sc.near = 1;
  sc.far = 30;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // Luce diffusa delle finestre (cielo) verso l'interno
  const windows = [];
  for (const w of S.windows) {
    const width = (w.x1 - w.x0) * CM;
    const height = (w.crown - w.sill) * CM;
    const area = new THREE.RectAreaLight('#eef2f7', w.id === 'W3' ? 1.5 : 3, width, height);
    area.position.set(((w.x0 + w.x1) / 2) * CM, ((w.sill + w.crown) / 2) * CM, (S.depth - 1) * CM);
    area.lookAt(area.position.x, area.position.y, 0);
    scene.add(area);
    windows.push(area);
  }
  // Lampade dell'arredo (accese nella modalità sera)
  const bulbs = lamps.map((l) => {
    const p = new THREE.PointLight(l.color, 0, l.dist, 2);
    p.position.set(l.x * CM, l.y * CM, l.z * CM);
    p.userData.power = l.power;
    scene.add(p);
    return p;
  });
  return { hemi, sun, windows, bulbs };
}
