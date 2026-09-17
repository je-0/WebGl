import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CloidGazeController } from "./CloidGazeController.js";
import { CloidArmController } from "./CloidArmController.js";

export class Robot {
  constructor({ variant = "full" } = {}) {
    this.variant = variant === "bust" ? "bust" : "full";
    this.root = new THREE.Group();
    this.head = this.root;
    this.ready = false;
    this.gaze = null;
    this.arms = null;
    this.model = null;
    this.bounds = null;
    this.modelRest = null;
    this.bodyYaw = 0;
    this.bodyEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this.bodyOffset = new THREE.Quaternion();
    this.loadPromise = this.load().catch((error) => {
      console.error("[CLOiD] model load failed", error);
    });
  }

  async load() {
    const gltf = await this.loadModel();
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

    for (const name of ["Eye_L", "Eye_R"]) {
      const eye = model.getObjectByName(name);
      eye?.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const prev = child.material;
        child.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: Boolean(prev.transparent),
          opacity: prev.opacity ?? 1,
          toneMapped: false,
        });
      });
    }

    this.applyNaturalStance(model);
    this.model = model;
    this.modelRest = model.quaternion.clone();
    this.root.add(model);
    this.head = model.getObjectByName("NeckPivot") || model;
    this.gaze = new CloidGazeController(model);
    this.arms = new CloidArmController(model);
    this.bounds = new THREE.Box3().setFromObject(model);
    this.ready = true;
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const base =
      typeof import.meta.env === "object" && import.meta.env?.BASE_URL
        ? import.meta.env.BASE_URL
        : "./";
    const urls = [
      new URL(`${base}models/cloid-hero.glb`, window.location.href).href,
      new URL("./public/models/cloid-hero.glb", window.location.href).href,
    ];

    let lastError;
    for (const url of [...new Set(urls)]) {
      try {
        return await loader.loadAsync(url);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("CLOiD model was not found");
  }

  applyNaturalStance(model) {
    const torso = model.getObjectByName("TorsoPivot");
    const neck = model.getObjectByName("NeckPivot");
    model.rotateY(THREE.MathUtils.degToRad(-8));
    torso?.rotateY(THREE.MathUtils.degToRad(-4));
    torso?.rotateX(THREE.MathUtils.degToRad(-2));
    torso?.rotateZ(THREE.MathUtils.degToRad(1.2));
    neck?.rotateY(THREE.MathUtils.degToRad(4));
    neck?.rotateX(THREE.MathUtils.degToRad(2));
  }

  pickShoulder(raycaster, camera, ndc) {
    const meshes = this.arms?.getPickMeshes() ?? [];
    if (!this.ready || !meshes.length) return null;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? this.arms.sideFromObject(hit.object) : null;
  }

  touchShoulder(side) {
    this.arms?.touchShoulder(side);
  }

  update(pointer, _time, _speed, dt = 0.016) {
    if (!this.ready || !this.gaze || !this.model || !this.modelRest) return;
    this.gaze.setPointer(pointer.x, pointer.y);
    this.gaze.update(dt);
    this.arms?.setPointer(pointer.x, pointer.y);
    this.arms?.update(dt);

    const targetYaw = pointer.x * THREE.MathUtils.degToRad(22);
    this.bodyYaw += (targetYaw - this.bodyYaw) * (1 - Math.exp(-dt / 0.38));
    this.bodyOffset.setFromEuler(this.bodyEuler.set(0, this.bodyYaw, 0, "YXZ"));
    this.model.quaternion.copy(this.modelRest).multiply(this.bodyOffset);
  }

  dispose() {
    this.gaze?.dispose();
    this.arms?.dispose();
  }
}
