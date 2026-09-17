import { Euler, MathUtils, Quaternion } from "three";

const NAMES = {
  shoulderL: "Shoulder_L",
  shoulderR: "Shoulder_R",
  upperL: "UpperArm_L",
  upperR: "UpperArm_R",
  forearmL: "Forearm_L",
  forearmR: "Forearm_R",
};

export class CloidArmController {
  constructor(model) {
    this.nodes = {};
    this.rest = {};
    this.offset = {};
    this.ok = true;
    for (const [key, name] of Object.entries(NAMES)) {
      const node = model.getObjectByName(name);
      if (!node) {
        this.ok = false;
        continue;
      }
      this.nodes[key] = node;
      this.rest[key] = node.quaternion.clone();
      this.offset[key] = new Quaternion();
    }
    this.x = 0;
    this.y = 0;
    this.tx = 0;
    this.ty = 0;
    this.elapsed = 0;
    this.euler = new Euler(0, 0, 0, "YXZ");
    this.enabled = true;
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
    this.ty = MathUtils.clamp(y, -1, 1);
  }

  reset() {
    this.x = this.y = this.tx = this.ty = 0;
    for (const key of Object.keys(this.nodes)) {
      this.nodes[key].quaternion.copy(this.rest[key]);
    }
  }

  pose(key, pitch, yaw, roll, dt, settle = 0.28) {
    const node = this.nodes[key];
    if (!node) return;
    this.offset[key].setFromEuler(this.euler.set(pitch, yaw, roll, "YXZ"));
    this.offset[key].premultiply(this.rest[key]);
    node.quaternion.slerp(this.offset[key], 1 - Math.exp(-dt / settle));
  }

  update(delta) {
    if (!this.ok || this.reduced || !this.enabled) {
      this.reset();
      return;
    }
    const dt = Math.min(Math.max(delta, 0), 0.05);
    this.elapsed += dt;
    const a = 1 - Math.exp(-dt / 0.12);
    this.x += (this.tx - this.x) * a;
    this.y += (this.ty - this.y) * a;

    const breath = Math.sin(this.elapsed * 1.05) * MathUtils.degToRad(2.2);
    const sway = Math.sin(this.elapsed * 0.72 + 0.6) * MathUtils.degToRad(1.6);
    const lift = this.y * MathUtils.degToRad(6);
    const right = Math.max(this.x, 0);
    const left = Math.max(-this.x, 0);
    const turn = MathUtils.smootherstep((this.x + 1) * 0.5, 0, 1);
    const open = right * MathUtils.degToRad(12) + turn * MathUtils.degToRad(4);
    const settle = 0.22 - right * 0.06;

    this.pose(
      "shoulderL",
      lift * 0.28 + right * MathUtils.degToRad(5) + breath,
      -left * MathUtils.degToRad(4) + open + sway,
      -lift * 0.55 - right * MathUtils.degToRad(6) + breath * 0.4,
      dt,
      settle,
    );
    this.pose(
      "shoulderR",
      lift * 0.28 + right * MathUtils.degToRad(4) + breath * 0.85,
      left * MathUtils.degToRad(3) + open * 0.75 - sway,
      lift * 0.45 + right * MathUtils.degToRad(8) - breath * 0.3,
      dt,
      settle,
    );
    this.pose(
      "upperL",
      lift * 0.35 + right * MathUtils.degToRad(6) + breath * 0.5,
      open * 0.35,
      -lift * 0.15,
      dt,
      settle + 0.06,
    );
    this.pose(
      "upperR",
      lift * 0.35 + right * MathUtils.degToRad(5) + breath * 0.4,
      open * 0.28,
      lift * 0.12,
      dt,
      settle + 0.06,
    );
    this.pose(
      "forearmL",
      lift * 0.2 + right * MathUtils.degToRad(3) + sway * 0.4,
      0,
      0,
      dt,
      settle + 0.1,
    );
    this.pose(
      "forearmR",
      lift * 0.2 + right * MathUtils.degToRad(3) - sway * 0.4,
      0,
      0,
      dt,
      settle + 0.1,
    );
  }

  dispose() {
    this.media?.removeEventListener("change", this.onReduce);
    this.reset();
  }
}
