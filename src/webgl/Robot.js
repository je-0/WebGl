import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CloidGazeController } from "./CloidGazeController.js";

export class Robot {
  constructor({ variant = "full" } = {}) {
    this.variant = variant === "bust" ? "bust" : "full";
    this.root = new THREE.Group();
    this.head = this.root;
    this.ready = false;
    this.gaze = null;
    this.model = null;
    this.bounds = null;
    this.loadPromise = this.load().catch((error) => {
      console.error("[CLOiD] model load failed", error);
    });
  }

  async load() {
    const modelUrl = new URL(
      `${import.meta.env.BASE_URL}models/cloid-hero.glb`,
      window.location.href,
    ).href;
    const gltf = await new GLTFLoader().loadAsync(modelUrl);
    const model = gltf.scene.getObjectByName("CLOiD_Root");
    if (!model) throw new Error("CLOiD_Root is missing");

    model.updateWorldMatrix(true, true);
    const world = model.matrixWorld.clone();
    model.removeFromParent();
    world.decompose(model.position, model.quaternion, model.scale);

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    this.model = model;
    this.root.add(model);
    this.head = model.getObjectByName("NeckPivot") || model;
    this.gaze = new CloidGazeController(model);
    this.bounds = new THREE.Box3().setFromObject(model);
    this.ready = true;
  }

  update(pointer, _time, _speed, dt = 0.016) {
    if (!this.ready || !this.gaze) return;
    this.gaze.setPointer(pointer.x, pointer.y);
    this.gaze.update(dt);
  }

  dispose() {
    this.gaze?.dispose();
  }
}
