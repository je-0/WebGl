import * as THREE from "three";
import { Robot } from "./Robot.js";

const IVORY = 0xf6f1e8;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export class Experience {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.variant = options.variant === "bust" ? "bust" : "full";
    this.isBust = this.variant === "bust";
    this.clock = new THREE.Clock();
    this.pointer = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      vx: 0,
      vy: 0,
    };
    this.idle = true;
    this.lastMove = 0;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.camTarget = {
      x: 0,
      y: this.isBust ? 1.52 : 1.18,
      z: this.isBust ? 1.72 : 4.2,
    };

    this.init();
    this.bind();
    this.tick();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: this.isBust,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(IVORY, this.isBust ? 0 : 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = this.isBust ? 1.08 : 1;

    this.scene = new THREE.Scene();
    if (!this.isBust) this.scene.background = new THREE.Color(IVORY);

    this.camera = new THREE.PerspectiveCamera(
      this.isBust ? 26 : 32,
      window.innerWidth / window.innerHeight,
      0.01,
      40,
    );
    this.camera.position.set(
      0,
      this.camTarget.y,
      this.isBust ? 1.72 : 4.2,
    );
    this.camera.lookAt(0, this.isBust ? 1.5 : 0.92, 0);

    this.createEntity();
    this.createLights();
    this.layout();
  }

  createEntity() {
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.robot = new Robot({ variant: this.variant });
    this.group.add(this.robot.root);
  }

  createLights() {
    this.scene.add(new THREE.HemisphereLight(0xf6f3eb, 0x716f6a, 2));

    for (const [color, intensity, pos] of [
      [0xfff3e0, 70, [-2, 4, 3]],
      [0xc9e2ff, 35, [2, 2.5, 2]],
      [0xbbd7ff, 65, [1, 3, -2]],
    ]) {
      const light = new THREE.PointLight(color, intensity);
      light.position.set(...pos);
      this.scene.add(light);
    }
  }

  layout() {
    const mobile = window.innerWidth < 720;
    if (this.isBust) {
      this.group.position.set(0, 0, 0);
      this.group.scale.setScalar(1);
      this.camTarget.z = mobile ? 2.12 : 1.72;
      return;
    }
    this.group.position.set(mobile ? 0 : 1.12, 0, 0);
    this.group.scale.setScalar(mobile ? 0.9 : 1);
    this.camTarget.z = mobile ? 5.1 : 4.2;
  }

  bind() {
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.onResize);
  }

  onPointerMove = (event) => {
    const nx = (event.clientX / window.innerWidth) * 2 - 1;
    const ny = -(event.clientY / window.innerHeight) * 2 + 1;
    this.pointer.tx = nx;
    this.pointer.ty = ny;
    this.ndc.set(nx, ny);
    this.idle = false;
    this.lastMove = performance.now();
    const over = this.robot.pickShoulder(this.raycaster, this.camera, this.ndc);
    this.canvas.style.cursor = over ? "pointer" : "";
  };

  onPointerDown = (event) => {
    this.onPointerMove(event);
    const side = this.robot.pickShoulder(this.raycaster, this.camera, this.ndc);
    if (side) this.robot.touchShoulder(side);
  };

  onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.layout();
  };

  tick = () => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    if (this.idle || performance.now() - this.lastMove > 2200) {
      this.pointer.tx = Math.sin(time * 0.35) * (this.isBust ? 0.22 : 0.55);
      this.pointer.ty = Math.cos(time * 0.27) * (this.isBust ? 0.12 : 0.28);
      this.idle = true;
    }

    const prevX = this.pointer.x;
    const prevY = this.pointer.y;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.075;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.075;
    this.pointer.vx = (this.pointer.x - prevX) / dt;
    this.pointer.vy = (this.pointer.y - prevY) / dt;
    const speed = clamp01(Math.hypot(this.pointer.vx, this.pointer.vy) * 0.045);

    this.robot.update(this.pointer, time, speed, dt);

    if (this.isBust) {
      this.camera.position.x +=
        (this.pointer.x * 0.04 - this.camera.position.x) * 0.03;
      this.camera.position.y +=
        (1.52 + this.pointer.y * 0.012 - this.camera.position.y) * 0.03;
      this.camera.position.z = this.camTarget.z;
      this.camera.lookAt(0, 1.5, 0);
    } else {
      this.camera.position.x +=
        (0.12 + this.pointer.x * 0.1 - this.camera.position.x) * 0.03;
      this.camera.position.y +=
        (1.18 + this.pointer.y * 0.06 - this.camera.position.y) * 0.03;
      this.camera.position.z = this.camTarget.z;
      this.camera.lookAt(this.group.position.x * 0.7, 0.92, 0);
    }

    this.renderer.render(this.scene, this.camera);
  };

  getPointer() {
    return this.pointer;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("resize", this.onResize);
    this.robot.dispose();
    this.renderer.dispose();
  }
}
