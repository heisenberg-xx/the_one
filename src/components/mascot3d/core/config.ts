/**
 * Logical acts the director asks for. The stage resolves each act to a clip in the
 * GLB (or a separate animation GLB) by trying the candidate names in order
 * (case-insensitive substring match). Edit CLIP_CANDIDATES to match your files —
 * `node scripts/inspect-glb.mjs public/mascot/rajesh.glb` prints the clip names.
 */
export type Act =
  | "idle" | "sleep" | "wake" | "greet"
  | "jump" | "swing" | "hang" | "fall" | "land"
  | "crawl" | "cook" | "proud" | "walk"
  | "takeoff" | "fly" | "touchdown";

export type Outfit = "default" | "vigilante" | "chemist" | "fedora" | "jet";

export const CLIP_CANDIDATES: Record<Act, string[]> = {
  idle: ["idle", "breathing"],
  sleep: ["sleeping", "sleep", "lying", "laying"],
  wake: ["waking", "wake", "getting up", "stand up", "get up"],
  greet: ["waving", "wave", "greeting", "salute"],
  jump: ["jump"],
  swing: ["swing", "hanging", "rope"],
  hang: ["hanging idle", "hanging", "hang"],
  fall: ["falling", "fall"],
  land: ["hard landing", "landing", "land"],
  crawl: ["crawl"],
  cook: ["mixing", "stirring", "cooking", "typing", "working"],
  proud: ["victory", "proud", "arms crossed", "standing arms", "cheer"],
  walk: ["walk"],
  takeoff: ["jump", "takeoff", "take off"],
  fly: ["flying", "fly", "superhero"],
  touchdown: ["landing", "land", "hard landing"],
};

/** Acts that loop until replaced. Everything else plays once and resolves. */
export const LOOPING: Record<Act, boolean> = {
  idle: true, sleep: true, wake: false, greet: false,
  jump: false, swing: true, hang: true, fall: true, land: false,
  crawl: true, cook: true, proud: true, walk: true,
  takeoff: false, fly: true, touchdown: false,
};

/** When an act has no clip at all, these stand in so the sequence still reads. */
export const FALLBACK: Record<Act, Act | null> = {
  idle: null, sleep: "idle", wake: "idle", greet: "idle",
  jump: "idle", swing: "hang", hang: "fall", fall: "jump", land: "idle",
  crawl: "walk", cook: "idle", proud: "idle", walk: "idle",
  takeoff: "jump", fly: "fall", touchdown: "land",
};

/** One-shot acts are trimmed to this many seconds so transitions keep their pace. */
export const MAX_ONESHOT = 2.2;

/** Which accessories each outfit shows (names of accessory slots). */
export const OUTFITS: Record<Outfit, AccessoryName[]> = {
  default: [],
  vigilante: ["hood", "domino"],
  chemist: ["goggles", "apron", "lab"],
  fedora: ["fedora"],
  jet: ["jetHelmet", "thrusters"],
};

export type AccessoryName = "hood" | "domino" | "goggles" | "apron" | "lab" | "fedora" | "jetHelmet" | "thrusters";

/** Node-name prefixes for accessories baked into the GLB (shown/hidden by name). */
export const ACCESSORY_NODE_NAMES: Record<AccessoryName, string> = {
  hood: "acc_hood",
  domino: "acc_domino",
  goggles: "acc_goggles",
  apron: "acc_apron",
  lab: "acc_lab",
  fedora: "acc_fedora",
  jetHelmet: "acc_jethelmet",
  thrusters: "acc_thrusters",
};

export interface MascotConfig {
  /** Rigged character (Mixamo skeleton recommended). */
  modelUrl: string;
  /** Optional per-act animation GLBs sharing the same skeleton (e.g. converted Mixamo downloads). */
  animationUrls?: Partial<Record<Act, string>>;
  /** Shown on the hero if WebGL or the model fails. */
  posterUrl?: string;
  /** Character height in world units after normalising (box shows 2.6 units). */
  height?: number;
  /** Keep the hips' vertical root motion but drop horizontal drift. */
  stripRootMotion?: boolean;
  /** Use built-in accessory meshes when the GLB has no acc_* nodes. */
  proxyAccessories?: boolean;
}

export const DEFAULT_CONFIG: Required<Omit<MascotConfig, "animationUrls">> & Pick<MascotConfig, "animationUrls"> = {
  modelUrl: "/mascot/rajesh.glb",
  animationUrls: {},
  posterUrl: "/mascot/poster-sleep.png",
  height: 1.8,
  stripRootMotion: true,
  proxyAccessories: true,
};
