// Passeggiata in prima persona: WASD e mouse su desktop, trascinamento e
// pulsanti su touch. Tre livelli (piano terra, open space, soppalco): le
// scale si percorrono camminando.
//
// Ogni ostacolo ha un ingombro in pianta e un'estensione verticale; il corpo
// occupa da 12 a 170 cm sopra i piedi, quindi si passa sotto le rampe alte e
// si scavalcano soglie e tappeti. Gli arredi diventano ostacoli da soli, dal
// loro ingombro.

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { S, roofY } from '../survey.js';
import { stairHeights, Y_LANDING } from '../model/stair.js';
import { mezzOutline } from '../model/structure.js';
import { BATH } from '../model/project.js';
import { BOILER } from '../model/shell.js';

const R = 18; // raggio del corpo, cm
const EYE = 160;
const FEET = 12;
const HEAD = 170;
const G = S.ground.level;
const MT = S.mezzTop;
const L = S.totalLength;
const D = S.depth;
const HALL = S.ground.hall;
const SW = S.stairwell;

function insidePoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// Ostacoli fissi [x0, x1, z0, z1, y0, y1, livello?] in cm. Il livello, se
// c'è, limita l'ostacolo a chi cammina a quella quota (sotto le rampe).
function fixedObstacles(scenario) {
  const o = [];
  const add = (x0, x1, z0, z1, y0, y1, lvl) => o.push([x0, x1, z0, z1, y0, y1, lvl]);
  const x = S.mainLength;
  const top = S.mezzUnder;
  // tramezzo con la porta dei servizi, muro tra ripostiglio e bagno
  add(x, S.rightX0, 0, S.bathDoor.z0, 0, top);
  add(x, S.rightX0, S.bathDoor.z1, D, 0, top);
  add(S.rightX0, S.rightX0 + 20, 100, 110, 0, top);
  add(S.rightX0 + 111, S.rightX1, 100, 110, 0, top);
  add(S.rightX0 + 20, S.rightX0 + 111, 100, 110, 210, top);
  if (scenario === 'project') {
    const n = BATH.niche;
    add(n.x0, n.x0 + 8, n.z0, n.z1, 0, top);
    add(S.rightX0, BATH.door.x0, BATH.wallZ, BATH.wallZ + 10, 0, top);
    add(BATH.door.x1, n.x0 + 8, BATH.wallZ, BATH.wallZ + 10, 0, top);
    add(BATH.door.x0 - 2, BATH.door.x0 + 3, BATH.wallZ + 10, BATH.wallZ + 90, 0, 210); // anta aperta
    add(n.x0 + 8, S.rightX1, n.z0, n.z1, 0, top); // doccia
  } else {
    add(S.rightX0 + 114, S.rightX0 + 205, 110, 113, 0, 209);
  }
  // parapetto, gabbia d'arrivo e anta aperta
  const p = S.parapet;
  add(p.x, p.x + p.t, p.z0, p.z1, 0, p.h - 15); // chi sale sui ventagli lo sfiora coi piedi
  const a = S.arrival;
  add(a.x1 - 4, a.x1, a.z0, a.door.z0, 0, a.h);
  add(a.x1 - 4, a.x1, a.door.z1, a.z1, 0, a.h);
  add(a.x1, a.x1 + 88, a.door.z1 - 4, a.door.z1 + 2, 0, 212);
  // sotto la rampa del soppalco: altezza insufficiente (fino a 45 cm, così
  // chi sta sui gradini a blocco o sui ventagli non ne è bloccato)
  add(0, 205, S.corridorW, S.mezzEdgeZ, 0, 45, 0);
  add(250, 260, S.mezzEdgeZ - 10, S.mezzEdgeZ - 2, 0, 250);
  for (const c of S.columns) add(c.x - 8, c.x + 8, c.z - 14, c.z + 2, 0, top);
  const ch = S.chimney;
  add(ch.x0, ch.x1, 0, ch.depth, G, top);
  for (const px of S.southPilasters) add(px - 25, px + 25, 495, D, 0, 430);
  for (const q of S.northPilasters) add(q.x0, q.x1, 0, q.depth, MT, MT + 300);
  // parapetti del soppalco
  const m0 = MT;
  const m1 = MT + 100;
  add(0, S.stairOpeningEndX, S.corridorW, S.corridorW + 4, m0, m1);
  if (scenario === 'project') {
    const gx = S.glassExt;
    add(S.stairOpeningEndX + 6, gx.x0, S.mezzEdgeZ - 4, S.mezzEdgeZ, m0, m1);
    add(gx.x0 - 4, gx.x0, S.mezzEdgeZ, gx.z1, m0, m1);
    add(gx.x0, x + 4, gx.z1 - 4, gx.z1, m0, m1);
    add(x, x + 4, gx.z1, D, m0, m1);
  } else {
    add(S.stairOpeningEndX + 6, x, S.mezzEdgeZ - 4, S.mezzEdgeZ, m0, m1);
    add(x, x + 4, S.mezzEdgeZ, D, m0, m1);
  }
  add(x, L, 372, D, m0, m1); // falda troppo bassa
  // piano terra: muro dell'atrio, caldaia, scala a U
  add(BOILER.x0, BOILER.x1, BOILER.z0, BOILER.z1, G, -30);
  const f1 = S.groundStair.first;
  add(f1.x0, f1.x1, f1.zEnd, 400, G, G + 50, G); // sotto la prima rampa
  add(f1.x1, f1.x1 + 5, S.groundStair.landing.z0, f1.zStart - 10, G + 20, Y_LANDING + 100); // corrimano
  add(S.groundStair.second.x1, S.groundStair.second.x1 + 3, S.groundStair.second.zStart - 6, SW.z1, Y_LANDING, 100);
  return o;
}

// Ingombri degli arredi, dai figli dei gruppi indicati.
function furnitureObstacles(groups) {
  const out = [];
  const box = new THREE.Box3();
  for (const grp of groups) {
    if (!grp) continue;
    for (const c of grp.children) {
      if (c.userData.noCollide || c.isLight) continue;
      if (c.userData.foot) {
        // lampade da terra: conta solo la base
        const p = c.getWorldPosition(new THREE.Vector3()).multiplyScalar(100);
        const r = c.userData.foot;
        out.push([p.x - r, p.x + r, p.z - r, p.z + r, p.y, p.y + 170]);
        continue;
      }
      box.setFromObject(c);
      if (box.isEmpty()) continue;
      const b = [box.min.x * 100, box.max.x * 100, box.min.z * 100, box.max.z * 100, box.min.y * 100, box.max.y * 100];
      if (b[5] - b[4] < 4) continue; // tappeti e simili
      // quadri, specchi e tende: sottili, non fermano il passo
      if (Math.min(b[1] - b[0], b[3] - b[2]) < 7) continue;
      out.push(b);
    }
  }
  return out;
}

export class Walker {
  constructor(camera, dom, { onExit, onMove }) {
    this.camera = camera;
    this.dom = dom;
    this.onExit = onExit;
    this.onMove = onMove;
    this.active = false;
    this.touch = matchMedia('(pointer: coarse)').matches;
    this.pos = new THREE.Vector2(560, 300);
    this.y = 0;
    this.vel = new THREE.Vector2();
    this.keys = new Set();
    this.pad = { fwd: false, back: false };
    this.scenario = 'project';
    this.groups = [];
    this.obs = [];
    this.lock = new PointerLockControls(camera, dom);
    this.lock.addEventListener('unlock', () => {
      if (this.active && !this.touch) this.exit();
    });
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      this.keys.add(e.code);
      if (e.code === 'Escape') this.exit();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    // trascinamento per guardarsi intorno su touch
    let last = null;
    dom.addEventListener('pointerdown', (e) => {
      if (this.active && this.touch) last = [e.clientX, e.clientY];
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.active || !this.touch || !last) return;
      const dx = e.clientX - last[0];
      const dy = e.clientY - last[1];
      last = [e.clientX, e.clientY];
      this.euler.setFromQuaternion(camera.quaternion);
      this.euler.y += dx * 0.005;
      this.euler.x = Math.max(-1.2, Math.min(1.2, this.euler.x + dy * 0.005));
      camera.quaternion.setFromEuler(this.euler);
    });
    window.addEventListener('pointerup', () => (last = null));
  }

  // scenario: 'current' | 'project'; groups: gruppi i cui figli fanno ingombro
  configure(scenario, groups) {
    this.scenario = scenario;
    this.groups = groups;
    this.mezz = mezzOutline(scenario);
    this.obs = [...fixedObstacles(scenario), ...furnitureObstacles(groups)];
  }

  enter() {
    this.configure(this.scenario, this.groups);
    const c = this.camera.position;
    const x = c.x * 100;
    const z = c.z * 100;
    const y = c.y * 100;
    let start = null;
    const candidates = [];
    if (y < -40 && x > HALL.x0 && x < HALL.x1 && z > HALL.z0 && z < HALL.z1) candidates.push(G);
    else if (y > MT + 60) candidates.push(MT, 0);
    else candidates.push(0);
    for (const h of candidates) {
      if (this.level(x, z, h) === h && this.free(x, z, h)) {
        start = h;
        break;
      }
    }
    if (start !== null) {
      this.pos.set(x, z);
      this.y = start;
    } else {
      // punti di partenza di riserva: davanti al portoncino, fuori dalla gabbia
      const spots = y < -40 ? [[60, 440, G], [250, 440, G]] : [[300, 440, 0], [560, 150, 0], [150, 440, 0]];
      const ok = spots.find(([sx, sz, sy]) => this.free(sx, sz, sy)) || spots[0];
      this.pos.set(ok[0], ok[1]);
      this.y = ok[2];
    }
    // sguardo orizzontale nella direzione attuale
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    // di riserva: al piano terra si guarda verso la scala (nord), sopra verso est
    const yaw = start !== null ? Math.atan2(-dir.x, -dir.z) : y < -40 ? 0 : -Math.PI / 2;
    this.camera.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
    this.camera.fov = 70;
    this.camera.updateProjectionMatrix();
    this.active = true;
    this.vel.set(0, 0);
    this.place(true);
    if (!this.touch) this.lock.lock();
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.keys.clear();
    this.pad.fwd = this.pad.back = false;
    if (this.lock.isLocked) this.lock.unlock();
    this.onExit?.();
  }

  // Pavimenti in (x, z): piano terra nell'atrio, piano principale fuori dal
  // vano scala, soppalco dentro il suo contorno.
  floorsAt(x, z) {
    const out = [];
    if (x >= HALL.x0 && x <= HALL.x1 && z >= HALL.z0 && z <= HALL.z1) out.push(G);
    const inHole = x < SW.x1 && z > SW.z0 && z < SW.z1;
    if (!inHole && x >= 0 && x <= L && z >= 0 && z <= D) out.push(0);
    if (insidePoly(this.mezz, x, z)) out.push(MT);
    return out;
  }

  // Quota raggiungibile in (x, z) partendo da y, o null: le scale hanno la
  // precedenza, poi il pavimento più vicino entro un gradino.
  level(x, z, y) {
    let best = null;
    for (const h of stairHeights(x, z)) {
      if (Math.abs(h - y) < 45 && (best === null || Math.abs(h - y) < Math.abs(best - y))) best = h;
    }
    if (best !== null) return best;
    for (const h of this.floorsAt(x, z)) if (Math.abs(h - y) < 45) return h;
    return null;
  }

  free(x, z, y) {
    const ground = y < -100;
    const [ax, bx, az, bz] = ground ? [HALL.x0, HALL.x1, HALL.z0, HALL.z1] : [0, L, 0, D];
    if (x < ax + R || z < az + R || x > bx - R || z > bz - R) return false;
    const y0 = y + FEET;
    // sotto il solaio basso ci si china: conta il soffitto, non la statura
    const y1 = Math.min(y + HEAD, this.ceiling(x, z, y) - 5);
    for (const [x0, x1, z0, z1, oy0, oy1, lvl] of this.obs) {
      if (oy1 <= y0 || oy0 >= y1) continue;
      if (lvl !== undefined && Math.abs(y - lvl) > 60) continue;
      if (x > x0 - R && x < x1 + R && z > z0 - R && z < z1 + R) return false;
    }
    return true;
  }

  // Soffitto sopra la testa: solaio basso al piano terra, falda sul soppalco.
  ceiling(x, z, y) {
    if (y < -100) {
      const inHole = x < SW.x1 && z > SW.z0 && z < SW.z1;
      return inHole ? Infinity : -S.ground.slab;
    }
    if (y > MT - 60) return roofY(z);
    return Infinity;
  }

  update(dt) {
    if (!this.active) return false;
    const k = this.keys;
    let f = 0;
    let s = 0;
    if (k.has('KeyW') || k.has('ArrowUp') || this.pad.fwd) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown') || this.pad.back) f -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 260 : 130) * dt;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const fwd = new THREE.Vector2(dir.x, dir.z).normalize();
    const right = new THREE.Vector2(-fwd.y, fwd.x);
    const target = fwd.multiplyScalar(f).add(right.multiplyScalar(s));
    if (target.lengthSq() > 1) target.normalize();
    target.multiplyScalar(speed);
    this.vel.lerp(target, Math.min(1, dt * 12));
    if (this.vel.lengthSq() < 1e-4) return false;
    const nx = this.pos.x + this.vel.x;
    const nz = this.pos.y + this.vel.y;
    const tryAt = (x, z) => {
      const ny = this.level(x, z, this.y);
      if (ny === null || !this.free(x, z, ny)) return false;
      this.pos.set(x, z);
      this.y = ny;
      return true;
    };
    if (!tryAt(nx, nz) && !tryAt(nx, this.pos.y) && !tryAt(this.pos.x, nz)) this.vel.set(0, 0);
    this.place();
    return true;
  }

  place(snap = false) {
    const ceil = this.ceiling(this.pos.x, this.pos.y, this.y);
    const eyeY = Math.min(this.y + EYE, ceil - 14);
    const cur = this.camera.position.y * 100;
    // morbidezza sui gradini
    const y = !snap && Math.abs(cur - eyeY) < 60 ? cur + (eyeY - cur) * 0.35 : eyeY;
    this.camera.position.set(this.pos.x / 100, y / 100, this.pos.y / 100);
    this.onMove?.();
  }
}
