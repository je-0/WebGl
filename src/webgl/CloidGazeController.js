import { Euler, MathUtils, Quaternion } from "three";

export class CloidGazeController {
  constructor(model) {
    this.head = model.getObjectByName("NeckPivot");
    this.torso = model.getObjectByName("TorsoPivot");
    this.eyes = ["Eye_L", "Eye_R"].map((n) => model.getObjectByName(n));
    if (!this.head || !this.torso || this.eyes.some((e) => !e)) {
      throw new Error("CLOiD rig nodes missing");
    }
    this.headRest = this.head.quaternion.clone();
    this.torsoRest = this.torso.quaternion.clone();
    this.eyeRest = this.eyes.map((e) => e.scale.clone());
    this.x = 0;
    this.y = 0;
    this.tx = 0;
    this.ty = 0;
    this.elapsed = 0;
    this.nextBlink = 3.2;
    this.blinkStart = -100;
    this.headOffset = new Quaternion();
    this.torsoOffset = new Quaternion();
    this.euler = new Euler(0, 0, 0, "YXZ");
    this.enabled = true;
    this.weight = 1;
    this.media = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = this.media.matches;
    this.onReduce = () => {
      this.reduced = this.media.matches;
      this.reset();
    };
    this.media.addEventListener("change", this.onReduce);
  }

  setPointer(x, y) {
    this.tx = MathUtils.clamp(x, -1, 1);
    this.ty = MathUtils.clamp(-y, -1, 1);
  }

  reset() {
    this.x = this.y = this.tx = this.ty = 0;
    this.head.quaternion.copy(this.headRest);
    this.torso.quaternion.copy(this.torsoRest);
    this.eyes.forEach((e, i) => e.scale.copy(this.eyeRest[i]));
  }

  update(delta) {
    if (this.reduced || !this.enabled) {
      this.reset();
      return;
    }
    const dt = Math.min(Math.max(delta, 0), 0.05);
    this.elapsed += dt;
    const a = 1 - Math.exp(-dt / 0.075);
    this.x += (this.tx - this.x) * a;
    this.y += (this.ty - this.y) * a;
    const w = MathUtils.clamp(this.weight, 0, 1);
    const yaw = this.x * MathUtils.degToRad(12) * w;
    const pitch = this.y * MathUtils.degToRad(6) * w;
    this.headOffset.setFromEuler(this.euler.set(pitch, yaw, 0, "YXZ"));
    this.headOffset.premultiply(this.headRest);
    this.head.quaternion.slerp(this.headOffset, 1 - Math.exp(-dt / 0.16));
    this.torsoOffset.setFromEuler(this.euler.set(pitch * 0.18, yaw * 0.24, 0, "YXZ"));
    this.torsoOffset.premultiply(this.torsoRest);
    this.torso.quaternion.slerp(this.torsoOffset, 1 - Math.exp(-dt / 0.34));
    if (this.elapsed >= this.nextBlink) {
      this.blinkStart = this.elapsed;
      this.nextBlink = this.elapsed + 3.2 + Math.random() * 2.4;
    }
    const t = (this.elapsed - this.blinkStart) / 0.19;
    const scale = t >= 0 && t <= 1 ? 1 - 0.9 * Math.sin(Math.PI * t) ** 2 : 1;
    this.eyes.forEach((e, i) => {
      e.scale.copy(this.eyeRest[i]);
      e.scale.y *= scale;
    });
  }

  dispose() {
    this.media?.removeEventListener("change", this.onReduce);
    this.reset();
  }
}
