// Passeggiata in prima persona: WASD e mouse su desktop, trascinamento e
// pulsanti su touch. La scala si percorre camminando.

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { S } from '../survey.js';
import { stairHeightAt } from '../model/stair.js';
import { MEZZ_OUTLINE } from '../model/structure.js';

const R = 18; // raggio del corpo, cm
const EYE = 160;

function insidePoly(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// Ostacoli [x0, x1, z0, z1, livello, valeSullaScala] in cm.
// livello: 'g' piano, 'm' soppalco.
function obstacles(withFurniture) {
  const o = [];
  const g = (x0, x1, z0, z1, stair = false) => o.push([x0, x1, z0, z1, 'g', stair]);
  const m = (x0, x1, z0, z1) => o.push([x0, x1, z0, z1, 'm', false]);
  const x = S.mainLength;
  g(x, S.rightX0, 0, S.bathDoor.z0);
  g(x, S.rightX0, S.bathDoor.z1, S.depth);
  g(S.rightX0, S.rightX0 + 20, 100, 110);
  g(S.rightX0 + 111, S.rightX1, 100, 110);
  const p = S.parapet;
  g(p.x, p.x + p.t, p.z0 - 12, p.z1, true);
  g(S.lift.x0, S.lift.x1, S.lift.z0, S.lift.z1, true);
  g(0, 139, S.corridorW, S.mezzEdgeZ); // sotto la scala: altezza insufficiente
  for (const c of S.columns) g(c.x - 8, c.x + 8, c.z - 14, c.z + 2);
  const ch = S.chimney;
  g(ch.x0, ch.x1, 0, ch.depth);
  const st = S.kitchenStub;
  g(st.x - 13, st.x + 13, st.z0, st.z1);
  g(808, x, 214, 497); // cucina
  g(702, 762, 435, 500); // frigo
  for (const px of S.southPilasters) g(px - 25, px + 25, 495, 500);
  g(1009, S.rightX1, 110, 198); // doccia
  g(1037, S.rightX1, 280, 320);
  g(1049, S.rightX1, 370, 430);
  for (const q of S.northPilasters) m(q.x0, q.x1, 0, q.depth);
  m(390, 690, 0, 36);
  m(120, 320, 0, 36);
  m(S.mainLength, S.rightX1, 372, S.depth); // falda troppo bassa
  // parapetti del soppalco
  m(S.stairOpeningEndX + 6, S.mainLength, S.mezzEdgeZ - 4, S.mezzEdgeZ);
  m(S.mainLength - 4, S.mainLength, S.mezzEdgeZ, S.depth);
  m(0, S.stairOpeningEndX, S.corridorW, S.corridorW + 4);
  if (withFurniture) {
    g(120, 304, 218, 306); // tavolo
    g(180, 310, 30, 98);
    g(327, 443, 28, 90);
    g(443, 557, 4, 56);
    g(570, 654, 18, 70);
    g(815, 868, 0, 115);
    g(351, 433, 147, 197);
    g(583, 673, 124, 176);
    g(535, 609, 390, 446);
    g(632, 704, 398, 442);
    g(605, 695, 235, 289);
    g(100, 136, 268, 332);
    g(365, 430, 425, 490);
    g(445, 510, 420, 485);
  }
  return o;
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
    this.withFurniture = true;
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

  setFurniture(v) {
    this.withFurniture = v;
    this.obs = obstacles(v);
  }

  enter() {
    this.obs = obstacles(this.withFurniture);
    const c = this.camera.position;
    const x = c.x * 100;
    const z = c.z * 100;
    const inside = x > 20 && x < S.totalLength - 20 && z > 20 && z < S.depth - 20;
    let y = 0;
    if (inside && c.y * 100 > S.mezzTop + 60 && insidePoly(MEZZ_OUTLINE, x, z)) y = S.mezzTop;
    if (inside && this.free(x, z, y)) {
      this.pos.set(x, z);
      this.y = y;
    } else {
      this.pos.set(560, 300);
      this.y = 0;
    }
    // sguardo orizzontale nella direzione attuale
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const yaw = inside ? Math.atan2(-dir.x, -dir.z) : Math.PI / 2;
    this.camera.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
    this.camera.fov = 70;
    this.camera.updateProjectionMatrix();
    this.active = true;
    this.vel.set(0, 0);
    this.place();
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

  // Quota del pavimento raggiungibile in (x, z) partendo da y, o null.
  level(x, z, y) {
    const s = stairHeightAt(x, z);
    if (s !== null && Math.abs(s - y) < 45) return s;
    if (y > 250) return insidePoly(MEZZ_OUTLINE, x, z) ? S.mezzTop : null;
    return 0;
  }

  // onStair: il punto è sull'ingombro della scala alla quota del corpo
  free(x, z, y, onStair = this.onStairAt(x, z, y)) {
    if (x < R || z < R || x > S.totalLength - R || z > S.depth - R) return false;
    const lvl = y > 250 ? 'm' : 'g';
    for (const [x0, x1, z0, z1, l, stair] of this.obs) {
      // sulla scala valgono solo parapetto e ascensore
      if (onStair ? !stair : l !== lvl) continue;
      if (x > x0 - R && x < x1 + R && z > z0 - R && z < z1 + R) return false;
    }
    return true;
  }

  onStairAt(x, z, y) {
    const s = stairHeightAt(x, z);
    return s !== null && Math.abs(s - y) < 45 && y > 5;
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
      if (ny === null) return false;
      if (!this.free(x, z, ny, this.onStairAt(x, z, ny))) return false;
      this.pos.set(x, z);
      this.y = ny;
      return true;
    };
    if (!tryAt(nx, nz) && !tryAt(nx, this.pos.y) && !tryAt(this.pos.x, nz)) this.vel.set(0, 0);
    this.place();
    return true;
  }

  place() {
    const eyeY = this.y + EYE;
    const cur = this.camera.position.y * 100;
    // morbidezza sui gradini
    const y = Math.abs(cur - eyeY) < 60 ? cur + (eyeY - cur) * 0.35 : eyeY;
    this.camera.position.set(this.pos.x / 100, y / 100, this.pos.y / 100);
    this.onMove?.();
  }
}
