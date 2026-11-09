import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {
  ACCESSORY_NODE_NAMES, CLIP_CANDIDATES, DEFAULT_CONFIG, FALLBACK, LOOPING, MAX_ONESHOT, OUTFITS,
  type AccessoryName, type Act, type MascotConfig, type Outfit,
} from "./config";
import { buildProxies, findRig, type Accessory, type Rig } from "./accessories";

/** World units visible in the box (square). Ground (y = 0) sits at GROUND_Y of the box height. */
export const VIEW = 2.6;
export const GROUND_Y = 0.88;
/** Where the character's "ground" lands in the box when rolled upside down (crawling under a bar). */
export const INVERTED_Y = 0.19;

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

export class MascotStage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  private pivot = new THREE.Group();
  private yawGroup = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private rig: Rig | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private extra = new Map<Act, Promise<THREE.AnimationClip | null>>();
  private current: THREE.AnimationAction | null = null;
  private currentAct: Act | null = null;
  private accessories: Accessory[] = [];
  private shadow: THREE.Mesh;
  private cfg = { ...DEFAULT_CONFIG } as typeof DEFAULT_CONFIG;
  private yaw = 0; private yawTarget = 0;
  private tilt = 0; private tiltTarget = 0;
  private shadowK = 1; private shadowTarget = 1;
  private clock = new THREE.Clock();
  private raf = 0;
  private reduced = false;
  private ro: ResizeObserver;
  private time = 0;
  private loader: GLTFLoader;
  private v = new THREE.Vector3();

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(this.renderer.domElement);

    const h = VIEW;
    this.camera = new THREE.OrthographicCamera(-h / 2, h / 2, h * GROUND_Y, -h * (1 - GROUND_Y), 0.1, 50);
    this.camera.position.set(0, 0, 10);

    // cinematic three-point light: warm key, cool rim, low fill
    this.scene.add(new THREE.HemisphereLight(0x8090b0, 0x140f0c, 0.55));
    const key = new THREE.DirectionalLight(0xffc28a, 2.4);
    key.position.set(-2.5, 3.5, 4);
    const rim = new THREE.DirectionalLight(0x5fd4ff, 2.2);
    rim.position.set(3, 2.2, -3);
    const kick = new THREE.DirectionalLight(0xff8a3c, 0.9);
    kick.position.set(-3, 0.5, -2);
    this.scene.add(key, rim, kick);

    // soft contact shadow
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, "rgba(0,0,0,.55)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.22),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
    );
    this.shadow.position.set(0, 0.005, 0.5);
    this.scene.add(this.shadow);

    this.scene.add(this.pivot);
    this.pivot.add(this.yawGroup);

    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
  }

  /* ---------------- loading ---------------- */
  async load(config: MascotConfig) {
    this.cfg = { ...DEFAULT_CONFIG, ...config } as typeof DEFAULT_CONFIG;
    const gltf = await this.loader.loadAsync(this.cfg.modelUrl);
    const model = gltf.scene;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.frustumCulled = false; // skinned bounds lag behind big poses
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.6;
      }
    });

    // normalise: feet on y = 0, centred, given height
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = this.cfg.height / (size.y || 1);
    model.scale.multiplyScalar(s);
    model.updateMatrixWorld(true);
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;

    // pivot at mid-height so rolls/leans rotate around the torso
    const mid = this.cfg.height / 2;
    this.pivot.position.y = mid;
    this.yawGroup.position.y = -mid;
    this.yawGroup.add(model);
    this.model = model;
    this.scene.updateMatrixWorld(true);

    this.rig = findRig(model);
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = gltf.animations.map((c) => this.prepClip(c));
    this.setupAccessories(model);
    this.start();
    return { clips: this.clips.map((c) => c.name), gltf };
  }

  private prepClip(c: THREE.AnimationClip) {
    if (!this.cfg.stripRootMotion) return c;
    for (const t of c.tracks) {
      if (/hips\.position$/i.test(t.name) && t.getValueSize() === 3) {
        const v = t.values;
        const x0 = v[0], z0 = v[2];
        for (let i = 0; i < v.length; i += 3) {
          v[i] = x0;
          v[i + 2] = z0;
        }
      }
    }
    return c;
  }

  private setupAccessories(model: THREE.Object3D) {
    const found: Accessory[] = [];
    (Object.keys(ACCESSORY_NODE_NAMES) as AccessoryName[]).forEach((name) => {
      const prefix = ACCESSORY_NODE_NAMES[name].toLowerCase();
      model.traverse((o) => {
        if (o.name.toLowerCase().startsWith(prefix)) {
          const g = o as THREE.Group;
          g.userData.base = g.scale.clone();
          g.visible = false;
          found.push({ name, group: g, k: 0, target: 0 });
        }
      });
    });
    if (found.length) this.accessories = found;
    else if (this.cfg.proxyAccessories && this.rig) this.accessories = buildProxies(this.rig, this.cfg.height, this.yawGroup);
  }

  private async clipFor(act: Act): Promise<THREE.AnimationClip | null> {
    const url = this.cfg.animationUrls?.[act];
    if (url) {
      if (!this.extra.has(act)) {
        this.extra.set(act, this.loader.loadAsync(url).then((g: GLTF) => (g.animations[0] ? this.prepClip(g.animations[0]) : null)).catch(() => null));
      }
      const c = await this.extra.get(act)!;
      if (c) return c;
    }
    for (const cand of CLIP_CANDIDATES[act]) {
      const hit = this.clips.find((c) => c.name.toLowerCase().includes(cand));
      if (hit) return hit;
    }
    return null;
  }

  /** Clip actually used for an act (after fallbacks), for debugging. */
  async resolve(act: Act): Promise<{ act: Act; clip: THREE.AnimationClip } | null> {
    let a: Act | null = act;
    const seen = new Set<Act>();
    while (a && !seen.has(a)) {
      seen.add(a);
      const c = await this.clipFor(a);
      if (c) return { act: a, clip: c };
      a = FALLBACK[a];
    }
    const any = this.clips[0];
    return any ? { act, clip: any } : null;
  }

  /* ---------------- playback ---------------- */
  /** Plays an act. Loops resolve immediately; one-shots resolve when done (capped). */
  async play(act: Act, fade = 0.3): Promise<void> {
    if (!this.mixer) return;
    const r = await this.resolve(act);
    if (!r) return;
    const loop = LOOPING[act];
    const action = this.mixer.clipAction(r.clip);
    if (this.current === action && this.currentAct === act && loop) return;
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.enabled = true;
    action.setEffectiveWeight(1);
    if (this.reduced) action.time = loop ? r.clip.duration * 0.35 : r.clip.duration * 0.999;
    if (this.current && this.current !== action) action.crossFadeFrom(this.current, this.reduced ? 0 : fade, false);
    action.play();
    this.current = action;
    this.currentAct = act;
    if (this.reduced) this.mixer.update(0);
    if (loop || this.reduced) return;
    const ms = Math.min(r.clip.duration, MAX_ONESHOT) * 1000;
    await new Promise<void>((res) => setTimeout(res, Math.max(200, ms - fade * 400)));
  }

  /** Swap accessories; resolves when the swap animation has finished. */
  setOutfit(o: Outfit, instant = false) {
    const on = new Set(OUTFITS[o]);
    for (const a of this.accessories) {
      a.target = on.has(a.name) ? 1 : 0;
      if (instant || this.reduced) a.k = a.target;
    }
    return new Promise<void>((r) => setTimeout(r, instant || this.reduced ? 0 : 520));
  }

  setFacing(yawDeg: number, instant = false) {
    this.yawTarget = (yawDeg * Math.PI) / 180;
    if (instant || this.reduced) this.yaw = this.yawTarget;
  }

  /** Rotation in the screen plane: 180 = upside down, ±angle = lean while flying. */
  setTilt(deg: number, instant = false) {
    this.tiltTarget = (deg * Math.PI) / 180;
    if (instant || this.reduced) this.tilt = this.tiltTarget;
  }

  setShadow(on: boolean) {
    this.shadowTarget = on ? 1 : 0;
  }

  setReducedMotion(v: boolean) {
    this.reduced = v;
  }

  /** Bone position in box pixels (for the silk line, bubbles, zzz). */
  point(which: "handR" | "handL" | "head"): { x: number; y: number } | null {
    const b = this.rig?.[which];
    if (!b) return null;
    b.getWorldPosition(this.v);
    this.v.project(this.camera);
    const w = this.host.clientWidth, h = this.host.clientHeight;
    return { x: ((this.v.x + 1) / 2) * w, y: ((1 - this.v.y) / 2) * h };
  }

  /* ---------------- loop ---------------- */
  private resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 200 ? 1.5 : 2));
    this.renderer.setSize(w, h, false);
    this.render();
  }

  private start() {
    cancelAnimationFrame(this.raf);
    this.clock.getDelta();
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min(this.clock.getDelta(), 1 / 20);
      this.time += dt;
      if (!this.reduced) this.mixer?.update(dt);
      this.yaw = damp(this.yaw, this.yawTarget, 7, dt);
      this.tilt = damp(this.tilt, this.tiltTarget, 6, dt);
      this.yawGroup.rotation.y = this.yaw;
      this.pivot.rotation.z = this.tilt;
      this.shadowK = damp(this.shadowK, this.shadowTarget, 8, dt);
      (this.shadow.material as THREE.MeshBasicMaterial).opacity = this.shadowK;
      for (const a of this.accessories) {
        a.k = this.reduced ? a.target : damp(a.k, a.target, 9, dt);
        if (a.name !== "thrusters") {
          const base = (a.group.userData.base as THREE.Vector3 | undefined);
          const k = Math.max(0.0001, a.k < 0.5 ? a.k * a.k * 2 : 1 - Math.pow(-2 * a.k + 2, 2) / 2);
          if (base) a.group.scale.copy(base).multiplyScalar(k);
          else a.group.scale.setScalar(k);
          a.group.visible = a.k > 0.01;
        }
        a.tick?.(this.time, a.k);
      }
      this.render();
    };
    this.raf = requestAnimationFrame(tick);
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.mixer?.stopAllAction();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      for (const mat of mats) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
        mat.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
