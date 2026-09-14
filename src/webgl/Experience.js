import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Robot } from "./Robot.js";
import {
  envFragment,
  envVertex,
  particleFragment,
  particleVertex,
} from "./shaders.js";

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export class Experience {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.pointer = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      vx: 0,
      vy: 0,
    };
    this.mouse3 = new THREE.Vector3();
    this.mouseLocal = new THREE.Vector3();
    this.trailDest = new THREE.Vector3();
    this.idle = true;
    this.lastMove = 0;

    this.init();
    this.bind();
    this.tick();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x07070c, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x07070c, 0.045);

    this.camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.1,
      40,
    );
    this.camera.position.set(0, 0.28, 5.8);

    this.createEnvironment();
    this.createEntity();
    this.createParticles();
    this.createTrail();
    this.createLights();
    this.createComposer();
    this.layout();
  }

  createEnvironment() {
    const geo = new THREE.SphereGeometry(16, 48, 48);
    this.envMat = new THREE.ShaderMaterial({
      vertexShader: envVertex,
      fragmentShader: envFragment,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(geo, this.envMat));

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 80),
      new THREE.MeshStandardMaterial({
        color: 0x08080d,
        metalness: 0.35,
        roughness: 0.72,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.55;
    this.scene.add(floor);
  }

  createEntity() {
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.robot = new Robot();
    this.group.add(this.robot.root);

    this.halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.004, 10, 80),
      new THREE.MeshBasicMaterial({
        color: 0xe8d3b0,
        transparent: true,
        opacity: 0.18,
      }),
    );
    this.halo.rotation.x = Math.PI / 2;
    this.halo.position.y = -1.28;
    this.group.add(this.halo);
  }

  createParticles() {
    const count = 900;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 1.15 + Math.random() * 2.1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.lerp(-1, 1, Math.random()));
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.72;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      seeds[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    this.particleMat = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3() },
        uVelocity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.group.add(new THREE.Points(geo, this.particleMat));
  }

  createTrail() {
    this.trail = [];
    const geo = new THREE.SphereGeometry(0.035, 12, 12);
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: 0xffe3b8,
          transparent: true,
          opacity: 0.22 * (1 - i / 14),
        }),
      );
      mesh.scale.setScalar(1 - i * 0.05);
      this.scene.add(mesh);
      this.trail.push(mesh);
    }
  }

  createLights() {
    this.scene.add(new THREE.HemisphereLight(0xb9c4d6, 0x1a120c, 0.55));
    this.scene.add(new THREE.AmbientLight(0x9aa3b5, 0.28));

    const key = new THREE.DirectionalLight(0xffe8cc, 1.65);
    key.position.set(2.6, 3.6, 3.2);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x8eb6ff, 0.55);
    fill.position.set(-3.4, 0.6, 1.2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffc9a0, 0.9);
    rim.position.set(0.2, 2.2, -3.4);
    this.scene.add(rim);

    this.mouseLight = new THREE.PointLight(0xffc27a, 2.4, 6, 2);
    this.scene.add(this.mouseLight);
  }

  createComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.18,
      0.32,
      0.8,
    );
    this.composer.addPass(this.bloom);
  }

  layout() {
    const mobile = window.innerWidth < 720;
    this.group.position.set(mobile ? 0 : 1.15, mobile ? 0.08 : 0.05, 0);
    this.group.scale.setScalar(mobile ? 0.68 : 0.95);
  }

  bind() {
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerdown", this.onPointerMove);
    window.addEventListener("resize", this.onResize);
  }

  onPointerMove = (event) => {
    const nx = (event.clientX / window.innerWidth) * 2 - 1;
    const ny = -(event.clientY / window.innerHeight) * 2 + 1;
    this.pointer.tx = nx;
    this.pointer.ty = ny;
    this.idle = false;
    this.lastMove = performance.now();
  };

  onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.layout();
  };

  projectMouse() {
    this.mouseLocal.set(this.pointer.x * 1.15, this.pointer.y * 0.9, 0.55);
    this.mouse3.set(
      this.group.position.x + this.pointer.x * 1.2,
      this.group.position.y + this.pointer.y * 0.95,
      0.7,
    );
  }

  tick = () => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    if (this.idle || performance.now() - this.lastMove > 2200) {
      this.pointer.tx = Math.sin(time * 0.35) * 0.55;
      this.pointer.ty = Math.cos(time * 0.27) * 0.28;
      this.idle = true;
    }

    const prevX = this.pointer.x;
    const prevY = this.pointer.y;
    this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.075;
    this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.075;
    this.pointer.vx = (this.pointer.x - prevX) / dt;
    this.pointer.vy = (this.pointer.y - prevY) / dt;
    const speed = clamp01(
      Math.hypot(this.pointer.vx, this.pointer.vy) * 0.045,
    );

    this.projectMouse();
    this.robot.update(this.pointer, time, speed);
    this.halo.rotation.z = time * 0.08;
    this.halo.scale.setScalar(1 + Math.sin(time * 0.9) * 0.03);

    this.camera.position.x +=
      (0.28 + this.pointer.x * 0.14 - this.camera.position.x) * 0.03;
    this.camera.position.y +=
      (0.32 + this.pointer.y * 0.1 - this.camera.position.y) * 0.03;
    this.camera.lookAt(this.group.position.x * 0.55, 0.18, 0);

    this.mouseLight.position.copy(this.mouse3);
    this.mouseLight.intensity = 1.4 + speed * 1.8;

    this.trail.forEach((node, i) => {
      const t = 1 - i / this.trail.length;
      this.trailDest.set(
        this.group.position.x + this.pointer.x * (1.35 + i * 0.03),
        this.group.position.y + this.pointer.y * (1.0 + i * 0.02),
        0.85 - i * 0.04,
      );
      node.position.lerp(this.trailDest, 0.18 * t + 0.04);
    });

    this.particleMat.uniforms.uTime.value = time;
    this.particleMat.uniforms.uMouse.value.copy(this.mouseLocal);
    this.particleMat.uniforms.uVelocity.value = speed;
    this.envMat.uniforms.uTime.value = time;
    this.envMat.uniforms.uMouse.value.set(this.pointer.x, this.pointer.y);

    this.composer.render();
  };

  getPointer() {
    return this.pointer;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerMove);
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
  }
}
