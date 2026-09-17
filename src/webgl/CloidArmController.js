import { Euler, MathUtils, Quaternion } from "three";

const NAMES = {
  shoulderL: "Shoulder_L",
  shoulderR: "Shoulder_R",
  upperL: "UpperArm_L",
  upperR: "UpperArm_R",
  forearmL: "Forearm_L",
  forearmR: "Forearm_R",
};

const WINDUP = {
  L: {
    shoulder: [-58, 8, 14],
    upper: [12, 6, 4],
    forearm: [42, 6, 4],
  },
  R: {
    shoulder: [-58, -8, -14],
    upper: [12, -6, -4],
    forearm: [42, -6, -4],
  },
};

const TOUCH = {
  L: {
    shoulder: [-56.4, -42.1, 81.5],
    upper: [0, 0, 0],
    forearm: [34.1, 20, 62.3],
  },
  R: {
    shoulder: [-56.4, 42.1, -81.5],
    upper: [0, 0, 0],
    forearm: [34.1, -20, -62.3],
  },
};

const HOLD = 2.6;
const LIFT_TIME = 0.26;
const LOWER_TIME = 0.22;

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
    this.pickMeshes = [];
    for (const key of ["shoulderL", "shoulderR"]) {
      const node = this.nodes[key];
      if (!node) continue;
      for (const child of node.children) {
        if (child.isMesh) this.pickMeshes.push(child);
      }
    }
    this.x = 0;
    this.y = 0;
    this.tx = 0;
    this.ty = 0;
    this.elapsed = 0;
    this.touching = null;
    this.touchUntil = -1;
    this.touchPhase = null;
    this.touchPhaseAt = 0;
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

  getPickMeshes() {
    return this.pickMeshes;
  }

  sideFromObject(object) {
    let node = object;
    while (node) {
      if (node.name === "Shoulder_L") return "L";
      if (node.name === "Shoulder_R") return "R";
      node = node.parent;
    }
    return null;
  }

  touchShoulder(side) {
    if (this.touching === side && this.touchPhase !== "lower") {
      this.touchPhase = "lower";
      this.touchPhaseAt = this.elapsed;
      this.touchUntil = -1;
      return;
    }
    this.touching = side;
    this.touchPhase = "lift";
    this.touchPhaseAt = this.elapsed;
    this.touchUntil = this.elapsed + LIFT_TIME + HOLD;
  }

  setPointer(x, y) {
    this.tx = MathUtils.clamp(x, -1, 1);
    this.ty = MathUtils.clamp(y, -1, 1);
  }

  reset() {
    this.x = this.y = this.tx = this.ty = 0;
    this.touching = null;
    this.touchUntil = -1;
    this.touchPhase = null;
    this.touchPhaseAt = 0;
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

  poseDeg(key, degrees, dt, settle) {
    this.pose(
      key,
      MathUtils.degToRad(degrees[0]),
      MathUtils.degToRad(degrees[1]),
      MathUtils.degToRad(degrees[2]),
      dt,
      settle,
    );
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
    if (this.touching && this.touchPhase === "hold" && this.touchUntil > 0 && this.elapsed > this.touchUntil) {
      this.touchPhase = "lower";
      this.touchPhaseAt = this.elapsed;
    }
    if (this.touching && this.touchPhase === "lift" && this.elapsed - this.touchPhaseAt > LIFT_TIME) {
      this.touchPhase = "hold";
      this.touchPhaseAt = this.elapsed;
    }
    if (this.touching && this.touchPhase === "lower" && this.elapsed - this.touchPhaseAt > LOWER_TIME) {
      this.touching = null;
      this.touchPhase = null;
    }
    const reachL = this.touching === "R";
    const reachR = this.touching === "L";
    const reachPose = this.touchPhase === "hold" ? TOUCH : WINDUP;

    if (reachL) {
      this.poseDeg("shoulderL", reachPose.L.shoulder, dt, 0.16);
      this.poseDeg("upperL", reachPose.L.upper, dt, 0.18);
      this.poseDeg("forearmL", reachPose.L.forearm, dt, 0.18);
    } else {
      this.pose(
        "shoulderL",
        lift * 0.28 +
          right * MathUtils.degToRad(5) +
          breath +
          (reachR ? MathUtils.degToRad(-6) : 0),
        -left * MathUtils.degToRad(4) + open + sway,
        -lift * 0.55 -
          right * MathUtils.degToRad(6) +
          breath * 0.4 +
          (reachR ? MathUtils.degToRad(8) : 0),
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
        "forearmL",
        lift * 0.2 + right * MathUtils.degToRad(3) + sway * 0.4,
        0,
        0,
        dt,
        settle + 0.1,
      );
    }

    if (reachR) {
      this.poseDeg("shoulderR", reachPose.R.shoulder, dt, 0.16);
      this.poseDeg("upperR", reachPose.R.upper, dt, 0.18);
      this.poseDeg("forearmR", reachPose.R.forearm, dt, 0.18);
    } else {
      this.pose(
        "shoulderR",
        lift * 0.28 +
          right * MathUtils.degToRad(4) +
          breath * 0.85 +
          (reachL ? MathUtils.degToRad(-6) : 0),
        left * MathUtils.degToRad(3) + open * 0.75 - sway,
        lift * 0.45 +
          right * MathUtils.degToRad(8) -
          breath * 0.3 +
          (reachL ? MathUtils.degToRad(-8) : 0),
        dt,
        settle,
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
        "forearmR",
        lift * 0.2 + right * MathUtils.degToRad(3) - sway * 0.4,
        0,
        0,
        dt,
        settle + 0.1,
      );
    }
  }

  dispose() {
    this.media?.removeEventListener("change", this.onReduce);
    this.reset();
  }
}
