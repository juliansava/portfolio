// Metro: due clic sul modello, distanza in centimetri.

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class MeasureTool {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'metro';
    scene.add(this.group);
    this.a = null;
    this.b = null;
    const mat = new THREE.MeshBasicMaterial({ color: '#c2410c', depthTest: false });
    this.dotA = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), mat);
    this.dotB = this.dotA.clone();
    this.dotA.renderOrder = this.dotB.renderOrder = 20;
    this.line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: '#c2410c', depthTest: false }),
    );
    this.line.renderOrder = 20;
    this.line.frustumCulled = false;
    const el = document.createElement('div');
    el.className = 'measure';
    this.labelEl = el;
    this.label = new CSS2DObject(el);
    this.group.add(this.dotA, this.dotB, this.line, this.label);
    this.clear();
  }

  clear() {
    this.a = this.b = null;
    this.dotA.visible = this.dotB.visible = this.line.visible = this.label.visible = false;
  }

  // Primo clic fissa A, secondo clic fissa B; un terzo ricomincia.
  click(p) {
    if (!this.a || this.b) {
      this.clear();
      this.a = p.clone();
      this.dotA.position.copy(p);
      this.dotA.visible = true;
      return 'a';
    }
    this.b = p.clone();
    this.update(p);
    return 'b';
  }

  hover(p) {
    if (this.a && !this.b && p) this.update(p);
  }

  update(p) {
    const a = this.a;
    this.dotB.position.copy(p);
    this.dotB.visible = true;
    this.line.geometry.setFromPoints([a, p]);
    this.line.visible = true;
    const d = a.distanceTo(p) * 100;
    const dh = Math.abs(p.y - a.y) * 100;
    const dxz = Math.hypot(p.x - a.x, p.z - a.z) * 100;
    this.labelEl.textContent = `${Math.round(d)} cm`;
    if (dh > 5 && dxz > 5) {
      const s = document.createElement('small');
      s.textContent = `orizz. ${Math.round(dxz)} · vert. ${Math.round(dh)}`;
      this.labelEl.appendChild(s);
    }
    this.label.position.copy(a).add(p).multiplyScalar(0.5);
    this.label.visible = true;
  }
}
