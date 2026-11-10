/**
 * Rajesh – cartoon Shimeji cut from new-sheets/ (hoodie, air, sit, wall,
 * techie, vigilante, lab, noir and jet-suit sheets).
 *
 * Frames: /public/shimeji/rajesh/shime{n}.webp on a 320×320 canvas, every pose
 * anchor shifted +96,+96 (feet point (160,224)). Slots 1-46 keep the original
 * Shimeji pose meanings; extras:
 *   47-50 idle cycle · 51-54 walk · 55-58 run · 59 sprint
 *   60 jump crouch · 61 falling (spread) · 62 superhero landing · 63 stumble · 64 dazed
 *   65 lying on back · 66 sleeping curled · 67 sleeping (zz) · 68 crawl
 *   69 climb (big reach) · 70 held by the cursor (neutral)
 *   71-82 techie: laptop ×2, coffee, phone, wave, thumbs up, point, arms crossed,
 *         thinking, facepalm, fist pump, stretch
 *   83-90 vigilante: idle, walk ×2, crouch, grapple, swing, landing, cape
 *   91-100 lab: idle, thinking, clipboard, flask, pour, bubbling, eureka,
 *          explosion, coffee (sitting), laptop (sitting)
 *   101-110 noir: idle, tip hat, cigar, map, magnifier, point, arms crossed,
 *           armchair, coffee, walk
 *   111-120 jet: idle, serious, visor + arms crossed, thumbs up, helmet thumbs up,
 *           salute take-off, hover, flying, landing, helmet idle
 */
import { live, once } from "../engine/expr";
import type { ActionDef, ActionNode, BehaviorDef, PoseDef } from "../engine/types";
import { ACTIONS } from "./actions";
import { BEHAVIORS } from "./behaviors";

const R = Math.random;
const pose = (image: number, len: number, dx = 0, ay = 128): PoseDef => [image, 64, ay, dx, 0, len];

/** A one-frame pose held on the floor. */
const act = (...frames: [number, number][]): ActionDef => ({
  type: "stay",
  border: "floor",
  animations: [{ poses: frames.map(([img, len]) => pose(img, len)) }],
});
const hold = (action: string, min: number, spread: number): ActionNode => ({
  ref: action,
  params: { duration: once(() => min + R() * spread) },
});
const seq = (...actions: ActionNode[]): ActionDef => ({ type: "sequence", actions });
const faceCursor: ActionNode = { ref: "Look", params: { lookRight: once(({ m, env }) => m.anchor.x < env.cursor.x) } };
const poof: ActionNode = { ref: "Poof" };

/** Walk a short way in costume (stays on the floor; clamps to the screen). */
const strollTarget = once(({ m, env }) =>
  Math.min(env.workArea.right - 80, Math.max(env.workArea.left + 80, m.anchor.x + (R() < 0.5 ? -1 : 1) * (80 + R() * 160)))
);

const RAJESH_ACTIONS: Record<string, ActionDef> = {
  ...ACTIONS,

  // ---- core moves with his own frames
  Stand: { type: "stay", border: "floor", animations: [{ poses: [pose(47, 60), pose(48, 4), pose(47, 45), pose(49, 35), pose(47, 30), pose(50, 70)] }] },
  Walk: { type: "move", border: "floor", animations: [{ poses: [51, 52, 53, 54].map((i) => pose(i, 5, -2)) }] },
  Run: { type: "move", border: "floor", animations: [{ poses: [55, 56, 57, 58].map((i) => pose(i, 3, -4)) }] },
  Dash: { type: "move", border: "floor", animations: [{ poses: [55, 59, 57, 59].map((i) => pose(i, 2, -8)) }] },
  Falling: {
    type: "builtin",
    class: "Fall",
    params: { resistanceX: 0.05, resistanceY: 0.1, gravity: 2 },
    animations: [{ poses: [pose(4, 3), pose(61, 3)] }],
  },
  Bouncing: { type: "animate", border: "floor", animations: [{ poses: [pose(62, 7), pose(18, 3), pose(19, 3)] }] },
  Tripping: {
    type: "animate",
    border: "floor",
    animations: [{ poses: [pose(63, 8, -8), pose(20, 4, -4), pose(20, 4, -2), pose(20, 12), pose(64, 45)] }],
  },
  // crawl: the one crawl pose + in-betweens 121-124 (reach, stretch, dip, hip lift), moving in
  // small even steps instead of sliding in bursts
  Creep: {
    type: "move",
    border: "floor",
    animations: [{ poses: [pose(68, 4, -1), pose(121, 4, -1), pose(122, 4, -1), pose(68, 4, -1), pose(123, 4, -1), pose(124, 4, -1)] }],
  },
  // held by the cursor: hanging frames instead of the standing frame
  Pinched: {
    type: "builtin",
    class: "Dragged",
    animations: [
      { condition: live(({ env, v }) => v.footX < env.cursor.x - 50), poses: [pose(9, 5)] },
      { condition: live(({ env, v }) => v.footX < env.cursor.x - 30), poses: [pose(7, 5)] },
      { condition: live(({ env, v }) => v.footX < env.cursor.x + 30), poses: [pose(70, 5)] },
      { condition: live(({ env, v }) => v.footX < env.cursor.x + 50), poses: [pose(8, 5)] },
      { condition: live(({ env, v }) => v.footX >= env.cursor.x + 30), poses: [pose(10, 5)] },
    ],
  },
  Resisting: {
    type: "builtin",
    class: "Regist",
    animations: [
      {
        poses: [
          ...[5, 6, 5, 6].map((i) => pose(i, 5)), pose(70, 50),
          ...[5, 6, 5, 6, 5, 6].map((i) => pose(i, 5)), pose(70, 80),
          ...[5, 6, 5, 6, 5, 6, 5, 6].map((i) => pose(i, 3)),
        ],
      },
    ],
  },

  // ---- shared bits
  Poof: { type: "builtin", class: "Effect", params: { kind: "poof", x: 0, y: -70 } },

  // ---- techie acts
  LaptopPose: act([71, 8], [72, 8]),
  CoffeePose: act([73, 250]),
  PhonePose: act([74, 250]),
  WavePose: act([75, 250]),
  ThumbsUpPose: act([76, 250]),
  PointPose: act([77, 250]),
  ArmsCrossedPose: act([78, 250]),
  ThinkingPose: act([79, 250]),
  FacepalmPose: act([80, 250]),
  FistPumpPose: act([81, 250]),
  StretchPose: act([82, 250]),
  LieBackPose: act([65, 250]),
  SleepZzPose: act([67, 250]),
  SleepCurledPose: act([66, 250]),

  CodeOnLaptop: seq(hold("LaptopPose", 350, 400)),
  SipCoffee: seq(hold("CoffeePose", 180, 200)),
  CheckPhone: seq(hold("PhonePose", 180, 220)),
  WaveAtCursor: seq(faceCursor, hold("WavePose", 60, 60)),
  ThumbsUp: seq(hold("ThumbsUpPose", 60, 50)),
  PointAtCursor: seq(faceCursor, hold("PointPose", 70, 60)),
  CrossArms: seq(hold("ArmsCrossedPose", 200, 300)),
  Think: seq(hold("ThinkingPose", 150, 200)),
  Facepalm: seq(hold("FacepalmPose", 70, 50)),
  FistPump: seq(hold("FistPumpPose", 50, 40)),
  StretchAndNap: seq(
    hold("StretchPose", 40, 20),
    hold("LieBackPose", 150, 150),
    hold("SleepZzPose", 400, 500),
    { ref: "Stand", params: { duration: 20 } }
  ),
  CurlUpNap: seq(hold("SleepCurledPose", 400, 400)),

  // ---- costume skits (poof in, perform, poof out)
  VigIdle: act([83, 250]),
  // stride (84/85) → up-beat in-between (125/126)
  VigWalk: { type: "move", border: "floor", animations: [{ poses: [pose(84, 4, -3), pose(125, 3, -3), pose(85, 4, -3), pose(126, 3, -3)] }] },
  VigCrouch: act([86, 250]),
  VigGrapple: act([87, 250]),
  VigLand: act([89, 250]),
  VigCape: act([90, 250]),
  VigilanteSkit: seq(
    poof, hold("VigIdle", 30, 20),
    { ref: "VigWalk", params: { targetX: strollTarget } },
    hold("VigCrouch", 40, 30), hold("VigGrapple", 30, 10), hold("VigLand", 20, 10), hold("VigCape", 60, 60),
    poof, { ref: "Stand", params: { duration: 10 } }
  ),

  LabIdle: act([91, 250]),
  LabThink: act([92, 250]),
  LabClipboard: act([93, 250]),
  LabFlask: act([94, 250]),
  LabPour: act([95, 250]),
  LabBubbling: act([96, 250]),
  LabEureka: act([97, 250]),
  LabExplosion: act([98, 250]),
  LabCoffee: act([99, 250]),
  LabLaptop: act([100, 250]),
  LabSkit: seq(
    poof, hold("LabIdle", 25, 20), hold("LabThink", 40, 30), hold("LabClipboard", 40, 30),
    hold("LabFlask", 40, 20), hold("LabPour", 45, 20), hold("LabBubbling", 50, 30), hold("LabEureka", 40, 20),
    { ref: "LabExplosion", params: { duration: 80, condition: once(() => R() < 0.35) } },
    poof, { ref: "Stand", params: { duration: 10 } }
  ),
  LabBreakSkit: seq(poof, hold("LabCoffee", 150, 150), hold("LabLaptop", 200, 200), poof, { ref: "Stand", params: { duration: 10 } }),

  NoirIdle: act([101, 250]),
  // the one walking pose (110) as a 6-beat strut with in-betweens 127-130
  NoirWalk: {
    type: "move",
    border: "floor",
    animations: [{ poses: [pose(110, 4, -2), pose(127, 4, -2), pose(128, 3, -2), pose(110, 4, -2), pose(129, 4, -2), pose(130, 3, -2)] }],
  },
  NoirTipHat: act([102, 250]),
  NoirCigar: act([103, 250]),
  NoirMap: act([104, 250]),
  NoirMagnifier: act([105, 250]),
  NoirPoint: act([106, 250]),
  NoirCrossed: act([107, 250]),
  NoirChair: act([108, 250]),
  NoirCoffee: act([109, 250]),
  NoirSkit: seq(
    poof, hold("NoirIdle", 25, 20),
    { ref: "NoirWalk", params: { targetX: strollTarget } },
    hold("NoirTipHat", 30, 15), hold("NoirCigar", 70, 50), hold("NoirMap", 50, 40), hold("NoirMagnifier", 50, 30),
    faceCursor, hold("NoirPoint", 35, 20), hold("NoirCrossed", 50, 40),
    poof, { ref: "Stand", params: { duration: 10 } }
  ),
  NoirChairSkit: seq(poof, hold("NoirChair", 200, 200), hold("NoirCoffee", 80, 60), poof, { ref: "Stand", params: { duration: 10 } }),

  JetIdle: act([111, 250]),
  JetSerious: act([112, 250]),
  JetVisor: act([113, 250]),
  JetThumbs: act([114, 250]),
  JetTakeoff: act([116, 250]),
  JetLand: act([119, 250]),
  JetHelmetIdle: act([120, 250]),
  JetFly: {
    type: "builtin",
    class: "Jump",
    params: {
      velocity: 14,
      targetX: once(({ m, env }) =>
        Math.min(env.workArea.right - 100, Math.max(env.workArea.left + 100, m.anchor.x + (R() < 0.5 ? -1 : 1) * (200 + R() * 260)))
      ),
      targetY: once(({ m }) => m.anchor.y),
    },
    animations: [{ poses: [pose(117, 4), pose(118, 250)] }],
  },
  JetSkit: seq(
    poof, hold("JetIdle", 25, 20), hold("JetVisor", 25, 15), hold("JetTakeoff", 14, 6),
    { ref: "JetFly" },
    hold("JetLand", 25, 10), hold("JetHelmetIdle", 25, 20), hold("JetThumbs", 30, 20),
    poof, { ref: "Stand", params: { duration: 10 } }
  ),
};

const onAnyFloor = live<boolean>(({ m, env }) => env.floor.isOn(m.anchor) || env.activeIE.topBorder.isOn(m.anchor));

const FLOOR_ACTS: [string, number][] = [
  ["CodeOnLaptop", 70],
  ["SipCoffee", 40],
  ["CheckPhone", 40],
  ["WaveAtCursor", 30],
  ["ThumbsUp", 25],
  ["PointAtCursor", 25],
  ["CrossArms", 40],
  ["Think", 35],
  ["Facepalm", 15],
  ["FistPump", 20],
  ["StretchAndNap", 25],
  ["CurlUpNap", 12],
  ["VigilanteSkit", 22],
  ["LabSkit", 22],
  ["LabBreakSkit", 12],
  ["NoirSkit", 22],
  ["NoirChairSkit", 12],
  ["JetSkit", 22],
];

const RAJESH_BEHAVIORS: BehaviorDef[] = [
  ...BEHAVIORS,
  ...FLOOR_ACTS.map(([name, frequency]) => ({ name, frequency, conditions: [onAnyFloor] })),
];

export const RAJESH = {
  imageBasePath: "/shimeji/rajesh/",
  imageExt: "webp",
  imageCount: 130,
  imageSize: 320,
  anchorOffset: { x: 96, y: 96 },
  actions: RAJESH_ACTIONS,
  behaviors: RAJESH_BEHAVIORS,
  /** One Rajesh: the sheets have no cloning art, so breeding stays off. */
  maxMascots: 1,
};
