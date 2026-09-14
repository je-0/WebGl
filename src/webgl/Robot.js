import * as THREE from "three";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export class Robot {
  constructor({ variant = "full" } = {}) {
    this.variant = variant === "bust" ? "bust" : "full";
    this.root = new THREE.Group();
    this.blinkUntil = 0;
    this.nextBlink = 2.4;

    this.materials = this.createMaterials();
    this.build();
  }

  createMaterials() {
    const metal = new THREE.MeshStandardMaterial({
      color: 0x7a818e,
      metalness: 0.72,
      roughness: 0.38,
    });
    const plate = new THREE.MeshStandardMaterial({
      color: 0x3d424c,
      metalness: 0.62,
      roughness: 0.48,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xd4b07a,
      metalness: 0.85,
      roughness: 0.28,
    });
    const glow = new THREE.MeshBasicMaterial({
      color: 0xffc27a,
    });
    const visor = new THREE.MeshStandardMaterial({
      color: 0x2a2218,
      metalness: 0.15,
      roughness: 0.22,
      emissive: new THREE.Color(0x8a4e16),
      emissiveIntensity: 1.15,
    });

    return { metal, plate, accent, glow, visor };
  }

  part(geometry, material, parent, position, rotation, scale) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    if (scale) mesh.scale.set(...scale);
    mesh.castShadow = false;
    parent.add(mesh);
    return mesh;
  }

  build() {
    const { metal, plate, accent, glow, visor } = this.materials;

    this.hover = new THREE.Group();
    this.root.add(this.hover);

    this.hips = new THREE.Group();
    this.hips.position.y = -0.18;
    this.hover.add(this.hips);

    this.part(new THREE.BoxGeometry(0.42, 0.16, 0.28), plate, this.hips);

    this.torso = new THREE.Group();
    this.torso.position.y = 0.38;
    this.hips.add(this.torso);

    this.part(new THREE.BoxGeometry(0.7, 0.78, 0.4), metal, this.torso);
    this.part(new THREE.BoxGeometry(0.78, 0.18, 0.44), plate, this.torso, [
      0,
      0.34,
      0,
    ]);
    this.part(new THREE.BoxGeometry(0.36, 0.28, 0.08), accent, this.torso, [
      0,
      0.04,
      0.22,
    ]);
    this.chestLight = this.part(
      new THREE.CircleGeometry(0.07, 20),
      glow,
      this.torso,
      [0, 0.04, 0.265],
    );

    this.neck = this.part(
      new THREE.CylinderGeometry(0.09, 0.11, 0.16, 12),
      plate,
      this.torso,
      [0, 0.5, 0],
    );

    this.head = new THREE.Group();
    this.head.position.set(0, 0.68, 0);
    this.torso.add(this.head);

    this.part(new THREE.BoxGeometry(0.5, 0.42, 0.46), metal, this.head);
    this.part(new THREE.BoxGeometry(0.54, 0.08, 0.5), accent, this.head, [
      0,
      0.2,
      0,
    ]);
    this.part(new THREE.BoxGeometry(0.46, 0.22, 0.06), visor, this.head, [
      0,
      0.05,
      0.245,
    ]);
    this.part(new THREE.BoxGeometry(0.2, 0.045, 0.05), accent, this.head, [
      0,
      -0.12,
      0.255,
    ]);

    this.eyeL = this.part(
      new THREE.SphereGeometry(0.055, 16, 16),
      glow,
      this.head,
      [-0.1, 0.055, 0.3],
    );
    this.eyeR = this.part(
      new THREE.SphereGeometry(0.055, 16, 16),
      glow,
      this.head,
      [0.1, 0.055, 0.3],
    );

    this.part(
      new THREE.CylinderGeometry(0.018, 0.012, 0.22, 8),
      accent,
      this.head,
      [0.2, 0.3, 0],
      [0, 0, -0.35],
    );
    this.part(
      new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8),
      plate,
      this.head,
      [-0.2, 0.28, 0],
      [0, 0, 0.4],
    );

    this.armL = this.createArm(-1);
    this.armR = this.createArm(1);

    this.legL = this.createLeg(-1);
    this.legR = this.createLeg(1);

    if (this.variant === "bust") {
      this.legL.root.visible = false;
      this.legR.root.visible = false;
    }
  }

  createArm(side) {
    const { metal, plate, accent } = this.materials;
    const root = new THREE.Group();
    root.position.set(side * 0.48, 0.3, 0);
    this.torso.add(root);

    this.part(
      new THREE.SphereGeometry(0.12, 16, 16),
      plate,
      root,
      [side * 0.02, 0, 0],
    );

    const upper = new THREE.Group();
    upper.position.set(side * 0.04, -0.08, 0);
    root.add(upper);
    this.part(
      new THREE.CapsuleGeometry(0.075, 0.28, 6, 10),
      metal,
      upper,
      [0, -0.2, 0],
    );

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.4, 0);
    upper.add(elbow);
    this.part(new THREE.SphereGeometry(0.07, 12, 12), plate, elbow);
    this.part(
      new THREE.CapsuleGeometry(0.06, 0.24, 6, 10),
      metal,
      elbow,
      [0, -0.18, 0],
    );
    this.part(
      new THREE.BoxGeometry(0.12, 0.1, 0.14),
      accent,
      elbow,
      [0, -0.36, 0],
    );

    return { root, upper, elbow };
  }

  createLeg(side) {
    const { metal, plate, accent } = this.materials;
    const root = new THREE.Group();
    root.position.set(side * 0.15, -0.12, 0);
    this.hips.add(root);

    this.part(
      new THREE.CapsuleGeometry(0.09, 0.32, 6, 10),
      metal,
      root,
      [0, -0.24, 0],
    );

    const knee = new THREE.Group();
    knee.position.set(0, -0.48, 0);
    root.add(knee);
    this.part(new THREE.SphereGeometry(0.075, 12, 12), plate, knee);
    this.part(
      new THREE.CapsuleGeometry(0.07, 0.3, 6, 10),
      metal,
      knee,
      [0, -0.22, 0],
    );
    this.part(
      new THREE.BoxGeometry(0.2, 0.08, 0.3),
      accent,
      knee,
      [0, -0.42, 0.04],
    );

    return { root, knee };
  }

  update(pointer, time, speed) {
    this.hover.position.y = Math.sin(time * 1.15) * 0.045;
    this.hover.rotation.y = Math.sin(time * 0.22) * 0.03;

    const yaw = clamp(pointer.x * 1.15, -1.05, 1.05);
    const pitch = clamp(-pointer.y * 0.62, -0.45, 0.38);

    this.head.rotation.y += (yaw - this.head.rotation.y) * 0.14;
    this.head.rotation.x += (pitch - this.head.rotation.x) * 0.14;
    this.torso.rotation.y += (yaw * 0.42 - this.torso.rotation.y) * 0.08;
    this.torso.rotation.x += (pitch * 0.12 - this.torso.rotation.x) * 0.05;
    this.hips.rotation.y += (yaw * 0.12 - this.hips.rotation.y) * 0.04;

    const reach = pointer.x * 0.18;
    this.armL.upper.rotation.z = 0.18 - pointer.y * 0.08;
    this.armR.upper.rotation.z = -0.18 + pointer.y * 0.08;
    this.armL.upper.rotation.x = -0.15 + pointer.y * 0.2;
    this.armR.upper.rotation.x = -0.15 + pointer.y * 0.2;
    this.armL.elbow.rotation.x = 0.35 + Math.abs(pointer.x) * 0.15;
    this.armR.elbow.rotation.x = 0.35 + Math.abs(pointer.x) * 0.15;
    this.armL.root.rotation.y = 0.15 + reach;
    this.armR.root.rotation.y = -0.15 + reach;

    this.legL.root.rotation.x = Math.sin(time * 1.15) * 0.04;
    this.legR.root.rotation.x = Math.cos(time * 1.15) * 0.04;

    this.materials.glow.color.setHSL(0.1, 0.55, 0.62 + speed * 0.12);
    this.chestLight.scale.setScalar(0.9 + Math.sin(time * 3.2) * 0.12 + speed * 0.15);

    if (time > this.nextBlink) {
      this.blinkUntil = time + 0.09;
      this.nextBlink = time + 2.2 + Math.random() * 2.8;
    }
    const blink = time < this.blinkUntil ? 0.12 : 1;
    this.eyeL.scale.set(1, blink, 1);
    this.eyeR.scale.set(1, blink, 1);
  }
}
