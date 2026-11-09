import * as THREE from "three";
import type { AccessoryName } from "./config";

/**
 * Built-in accessories, used when the GLB has no `acc_*` nodes.
 * All designs are original. Each item is built in "model space" units
 * (character height 1.8) and parented to a socket on the right bone.
 */

export interface Rig {
  root: THREE.Object3D;
  head: THREE.Bone | null;
  headTop: THREE.Bone | null;
  spine: THREE.Bone | null;
  handL: THREE.Bone | null;
  handR: THREE.Bone | null;
  footL: THREE.Bone | null;
  footR: THREE.Bone | null;
}

const find = (root: THREE.Object3D, ...res: RegExp[]) => {
  for (const re of res) {
    let hit: THREE.Bone | null = null;
    root.traverse((o) => {
      if (!hit && (o as THREE.Bone).isBone && re.test(o.name)) hit = o as THREE.Bone;
    });
    if (hit) return hit;
  }
  return null;
};

export function findRig(root: THREE.Object3D): Rig {
  return {
    root,
    head: find(root, /head$/i, /head/i),
    headTop: find(root, /headtop/i),
    spine: find(root, /spine2$/i, /spine1$/i, /chest$/i, /spine$/i),
    handL: find(root, /lefthand$/i, /hand[._]?l$/i),
    handR: find(root, /righthand$/i, /hand[._]?r$/i),
    footL: find(root, /leftfoot$/i, /foot[._]?l$/i),
    footR: find(root, /rightfoot$/i, /foot[._]?r$/i),
  };
}

/** A child of `bone` whose axes/scale match the model root in bind pose. */
export function socket(bone: THREE.Object3D, modelRoot: THREE.Object3D) {
  modelRoot.updateMatrixWorld(true);
  const s = new THREE.Group();
  const bq = new THREE.Quaternion(), bs = new THREE.Vector3();
  const mq = new THREE.Quaternion();
  bone.matrixWorld.decompose(new THREE.Vector3(), bq, bs);
  modelRoot.matrixWorld.decompose(new THREE.Vector3(), mq, new THREE.Vector3());
  s.quaternion.copy(bq.invert().multiply(mq));
  s.scale.set(1 / bs.x, 1 / bs.y, 1 / bs.z);
  bone.add(s);
  return s;
}

const mat = {
  fabric: () => new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.92, metalness: 0, side: THREE.DoubleSide }),
  mask: () => new THREE.MeshStandardMaterial({ color: 0x0a0b0e, roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide }),
  felt: () => new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.85 }),
  leather: () => new THREE.MeshStandardMaterial({ color: 0x2a221d, roughness: 0.7, side: THREE.DoubleSide }),
  metal: () => new THREE.MeshStandardMaterial({ color: 0x26282e, roughness: 0.35, metalness: 0.8 }),
  graphite: () => new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.3, metalness: 0.6 }),
  glow: (c: number, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }),
  glass: (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55, emissive: c, emissiveIntensity: 0.35 }),
};

export interface Accessory {
  name: AccessoryName;
  group: THREE.Group;
  /** current 0..1 and target 0..1 visibility */
  k: number;
  target: number;
  tick?: (t: number, k: number) => void;
}

export function buildProxies(rig: Rig, height: number, world: THREE.Object3D): Accessory[] {
  const out: Accessory[] = [];
  const u = height / 1.8;
  // head metrics (bind pose)
  rig.root.updateMatrixWorld(true);
  const headPos = new THREE.Vector3(), topPos = new THREE.Vector3();
  rig.head?.getWorldPosition(headPos);
  if (rig.headTop) rig.headTop.getWorldPosition(topPos);
  else topPos.copy(headPos).add(new THREE.Vector3(0, 0.2 * u, 0));
  const hh = Math.max(0.12 * u, headPos.distanceTo(topPos)); // head height above the head bone
  const r = hh * 0.56; // skull radius
  const cy = hh * 0.48; // skull centre above the head bone
  const cz = 0.012 * u;

  const add = (name: AccessoryName, bone: THREE.Object3D | null, build: (g: THREE.Group) => void, tick?: Accessory["tick"]) => {
    if (!bone) return;
    const g = new THREE.Group();
    build(g);
    g.scale.setScalar(0.0001);
    g.visible = false;
    socket(bone, rig.root).add(g);
    out.push({ name, group: g, k: 0, target: 0, tick });
  };

  // Hood: an open-faced cowl with a draped back.
  add("hood", rig.head, (g) => {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(r * 1.24, 40, 28, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, 2.25),
      mat.fabric(),
    );
    shell.position.set(0, cy + r * 0.05, cz - r * 0.06);
    g.add(shell);
    const drape = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.55, r * 1.6, 32, 1, true, Math.PI / 2 + 0.7, Math.PI * 2 - 1.4), mat.fabric());
    drape.position.set(0, cy - r * 1.25, cz - r * 0.15);
    g.add(drape);
  });

  // Domino mask: a band across the eyes with pale lenses.
  add("domino", rig.head, (g) => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, r * 0.34, 40, 1, true, -1.25, 2.5), mat.mask());
    band.position.set(0, cy + r * 0.12, cz);
    g.add(band);
    for (const s of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 0.13, 20), mat.glow(0xdfe8f2, 0.85));
      lens.scale.set(1.5, 0.55, 1);
      lens.position.set(s * r * 0.36, cy + r * 0.13, cz + r * 0.97);
      lens.rotation.y = s * 0.35;
      g.add(lens);
    }
  });

  // Lab goggles: two amber lenses on a strap.
  add("goggles", rig.head, (g) => {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(r * 1.04, r * 0.05, 8, 48), mat.leather());
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, cy + r * 0.15, cz);
    g.add(strap);
    for (const s of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.27, r * 0.3, r * 0.22, 24), mat.metal());
      rim.rotation.x = Math.PI / 2;
      rim.position.set(s * r * 0.38, cy + r * 0.15, cz + r * 0.98);
      g.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 0.23, 24), mat.glass(0xffb347));
      lens.position.set(s * r * 0.38, cy + r * 0.15, cz + r * 1.1);
      g.add(lens);
    }
  });

  // Apron: dark leather panel from chest to thighs.
  add("apron", rig.spine, (g) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * u, 0.2 * u, 0.62 * u, 24, 1, true, -1.0, 2.0), mat.leather());
    p.position.set(0, -0.2 * u, 0.02 * u);
    g.add(p);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.11 * u, 0.008 * u, 6, 32, Math.PI), mat.leather());
    strap.position.set(0, 0.1 * u, 0.04 * u);
    g.add(strap);
  });

  // Fedora: tapered crown, wide brim, band.
  add("fedora", rig.head, (g) => {
    const hat = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.98, r * 0.85, 32), mat.felt());
    crown.position.y = r * 0.42;
    const dent = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 16, 8, 0, Math.PI * 2, 0, 0.6), mat.felt());
    dent.scale.set(1.2, 0.35, 0.8);
    dent.position.y = r * 0.82;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.7, r * 1.72, r * 0.06, 40), mat.felt());
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.985, r * 0.985, r * 0.18, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b2b31, roughness: 0.6, side: THREE.DoubleSide }));
    band.position.y = r * 0.12;
    hat.add(crown, dent, brim, band);
    hat.position.set(0, cy + r * 0.72, cz);
    hat.rotation.set(-0.12, 0, 0.1);
    g.add(hat);
  });

  // Jet helmet (original): graphite dome, single amber visor slit.
  add("jetHelmet", rig.head, (g) => {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 1.22, 40, 28), mat.graphite());
    dome.scale.set(1, 1.08, 1.06);
    dome.position.set(0, cy + r * 0.05, cz);
    const slit = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.235, r * 1.235, r * 0.16, 40, 1, true, -0.95, 1.9), mat.glow(0xffb347, 0.95));
    slit.position.set(0, cy + r * 0.18, cz);
    slit.scale.set(1, 1, 1.06);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.08, r * 2.3), mat.metal());
    ridge.position.set(0, cy + r * 1.36, cz);
    g.add(dome, slit, ridge);
  });

  // Thrusters on palms and soles, flames along -Y of the bind pose.
  const flame = (scale: number) => {
    const f = new THREE.Group();
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * u * scale, 0.045 * u * scale, 0.03 * u * scale, 16), mat.metal());
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035 * u * scale, 0.008 * u * scale, 8, 24), mat.glow(0xffc070, 1));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.016 * u * scale;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04 * u * scale, 0.22 * u * scale, 16, 1, true), mat.glow(0xff9a3c, 0.75));
    cone.rotation.x = Math.PI;
    cone.position.y = -0.13 * u * scale;
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.018 * u * scale, 0.14 * u * scale, 12, 1, true), mat.glow(0xfff1c8, 0.95));
    core.rotation.x = Math.PI;
    core.position.y = -0.09 * u * scale;
    f.add(housing, ring, cone, core);
    f.userData.cones = [cone, core];
    return f;
  };
  const flames: THREE.Group[] = [];
  const thrusterBones: [THREE.Bone | null, number, number][] = [
    [rig.handL, 0.8, -0.02], [rig.handR, 0.8, -0.02], [rig.footL, 1, -0.06], [rig.footR, 1, -0.06],
  ];
  const thrusters: Accessory = { name: "thrusters", group: new THREE.Group(), k: 0, target: 0 };
  for (const [bone, sc, dy] of thrusterBones) {
    if (!bone) continue;
    const f = flame(sc);
    f.position.y = dy * u;
    socket(bone, rig.root).add(f);
    f.visible = false;
    flames.push(f);
  }
  const light = new THREE.PointLight(0xff9a3c, 0, 1.6 * u, 2);
  light.position.y = -0.12 * u;
  if (rig.footR) socket(rig.footR, rig.root).add(light);
  thrusters.tick = (t, k) => {
    for (const f of flames) {
      f.visible = k > 0.01;
      const fl = 0.85 + Math.sin(t * 41 + f.id) * 0.08 + Math.sin(t * 17.3 + f.id * 2) * 0.07;
      f.scale.setScalar(Math.max(0.0001, k));
      for (const c of f.userData.cones as THREE.Mesh[]) c.scale.set(1, fl, 1);
    }
    light.intensity = k * (2.2 + Math.sin(t * 29) * 0.4);
  };
  out.push(thrusters);

  // Lab bench props in front of the character (world space, not on a bone).
  const lab = new THREE.Group();
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5 * u, 0.04 * u, 0.26 * u), mat.metal());
  bench.position.y = 0.9 * u;
  lab.add(bench);
  for (const x of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03 * u, 0.9 * u, 0.03 * u), mat.metal());
    leg.position.set(x * u, 0.45 * u, 0);
    lab.add(leg);
  }
  const colors = [0x5fd4ff, 0xffb347, 0x7dffb0];
  const bubbles: THREE.Mesh[] = [];
  colors.forEach((c, i) => {
    const x = (-0.15 + i * 0.15) * u;
    const flask = new THREE.Mesh(new THREE.SphereGeometry(0.055 * u, 20, 14), mat.glass(c));
    flask.position.set(x, 0.98 * u, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * u, 0.018 * u, 0.09 * u, 12), mat.glass(c));
    neck.position.set(x, 1.07 * u, 0);
    const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.045 * u, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat.glow(c, 0.9));
    liquid.position.set(x, 0.985 * u, 0);
    lab.add(flask, neck, liquid);
    for (let b = 0; b < 3; b++) {
      const bub = new THREE.Mesh(new THREE.SphereGeometry(0.009 * u, 8, 6), mat.glow(c, 0.9));
      bub.userData = { x, c: i, b };
      lab.add(bub);
      bubbles.push(bub);
    }
  });
  const labLight = new THREE.PointLight(0x5fd4ff, 0, 1.2 * u, 2);
  labLight.position.set(0, 1.1 * u, 0.1 * u);
  lab.add(labLight);
  lab.position.set(0.42 * u, 0, 0.32 * u);
  lab.rotation.y = -0.5;
  lab.scale.setScalar(0.0001);
  lab.visible = false;
  world.add(lab);
  out.push({
    name: "lab", group: lab, k: 0, target: 0,
    tick: (t) => {
      for (const b of bubbles) {
        const { x, c, b: n } = b.userData as { x: number; c: number; b: number };
        const ph = (t * 0.9 + n / 3 + c * 0.21) % 1;
        b.position.set(x + Math.sin(ph * 12 + c) * 0.008 * u, (1.0 + ph * 0.22) * u, 0);
        (b.material as THREE.MeshBasicMaterial).opacity = Math.sin(ph * Math.PI) * 0.9;
      }
      labLight.intensity = 1.4 + Math.sin(t * 6) * 0.3;
    },
  });

  return out;
}
