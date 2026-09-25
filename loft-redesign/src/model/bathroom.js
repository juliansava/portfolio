// Fascia servizi a est del tramezzo: bagno (sud) e ripostiglio (nord).
// Nessuna foto ne mostra l'interno oltre alla doccia: arredo indicativo.

import * as THREE from 'three';
import { S } from '../survey.js';
import { CM, boxAt, boxGeoAt, cylAt, cylGeoAt, rodGeo, Batch, info } from '../lib/geo.js';

export function buildBathroom(M) {
  const g = new THREE.Group();
  g.name = 'bagno';
  const x0 = S.rightX0;
  const x1 = S.rightX1;
  const zc = S.serviceWallZ + 5;

  // Box doccia angolare con colonna idromassaggio (visibile dalla porta)
  const sh = new THREE.Group();
  const r = 88;
  sh.add(boxAt(M.ceramic, x1 - r, 0, zc, x1, 14, zc + r));
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r * CM, r * CM, 186 * CM, 32, 1, true, Math.PI * 1.5, Math.PI / 2), M.clearGlass);
  glass.position.set(x1 * CM, (14 + 93) * CM, zc * CM);
  sh.add(glass);
  const frame = new Batch();
  frame.add(boxGeoAt(x1 - r, 14, zc, x1 - r + 3, 200, zc + 3), M.chrome);
  frame.add(boxGeoAt(x1 - 3, 14, zc + r - 3, x1, 200, zc + r), M.chrome);
  frame.add(boxGeoAt(x1 - 22, 20, zc + 2, x1 - 2, 205, zc + 22), M.brushed);
  sh.add(frame.build());
  info(sh, 'Box doccia', `Angolare ${r} × ${r} cm con colonna idromassaggio`);
  g.add(sh);

  // Sanitari lungo il muro est
  const wc = new THREE.Group();
  const zw = 300;
  wc.add(boxAt(M.ceramic, x1 - 60, 0, zw - 18, x1 - 20, 40, zw + 18));
  wc.add(boxAt(M.ceramic, x1 - 20, 40, zw - 22, x1 - 2, 80, zw + 22));
  wc.add(boxAt(M.white, x1 - 62, 40, zw - 19, x1 - 20, 42, zw + 19));
  info(wc, 'WC', 'Posizione indicativa');
  g.add(wc);

  const basin = new THREE.Group();
  const zb = 400;
  basin.add(boxAt(M.ceramic, x1 - 48, 80, zb - 30, x1, 92, zb + 30));
  basin.add(cylAt(M.chrome, x1 - 8, 92, zb, 1.5, 16, 12));
  basin.add(boxAt(M.frosted, x1 - 1, 110, zb - 30, x1, 190, zb + 30));
  info(basin, 'Lavabo', 'Posizione indicativa');
  g.add(basin);

  // Scala a libretto in alluminio (foto 1)
  const ladder = new Batch();
  const lx = x0 + 30;
  const lz = 200;
  ladder.add(rodGeo([lx, 0, lz - 20], [lx + 12, 170, lz - 20], 1.2, 6), M.brushed);
  ladder.add(rodGeo([lx, 0, lz + 20], [lx + 12, 170, lz + 20], 1.2, 6), M.brushed);
  ladder.add(rodGeo([lx + 40, 0, lz - 20], [lx + 14, 170, lz - 20], 1.2, 6), M.brushed);
  ladder.add(rodGeo([lx + 40, 0, lz + 20], [lx + 14, 170, lz + 20], 1.2, 6), M.brushed);
  for (let i = 1; i < 6; i++) {
    const y = i * 28;
    const x = lx + (y / 170) * 12;
    ladder.add(boxGeoAt(x - 4, y - 1, lz - 20, x + 4, y + 1, lz + 20), M.brushed);
  }
  ladder.add(boxGeoAt(lx + 6, 170, lz - 16, lx + 22, 184, lz + 16), M.red);
  g.add(ladder.build('Scala a libretto'));

  // Ripostiglio: scaffali
  const shelves = new Batch();
  for (const y of [40, 90, 140, 190]) shelves.add(boxGeoAt(x0 + 120, y, 4, x1 - 2, y + 2, 44), M.white);
  shelves.add(boxGeoAt(x0 + 120, 0, 4, x0 + 122, 210, 44), M.white);
  shelves.add(boxGeoAt(x0 + 4, 0, 6, x0 + 64, 85, 66), M.white);
  const rip = shelves.build('Ripostiglio');
  info(rip, 'Ripostiglio', 'Scaffalature e lavatrice (indicativi)');
  g.add(rip);

  return g;
}
