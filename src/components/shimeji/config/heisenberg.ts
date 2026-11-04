/**
 * Heisenberg – built from heisenberg_animation_overview.png.
 *
 * Frames live in /public/shimeji/heisenberg/shime{n}.webp on a 256×256 canvas;
 * every pose anchor is shifted by +64,+64, so the original Shimeji anchor
 * (64,128) is the feet point (128,192) of these frames.
 *
 * Slots 1-46 keep the original Shimeji pose meanings, so every Spider-Man
 * action works unchanged. Slots 47-83 are extra frames from the guide:
 *   47-54 idle cycle · 55-61 walk cycle · 62-66 run cycle · 67 tripped flat
 *   68 dazed · 69 coffee · 70 cigar · 71 briefcase · 72 laptop (sitting)
 *   73 laptop · 74 phone · 75 thumbs up · 76 "SLAM IT" · 77 pointing
 *   78 adjusting glasses · 79 arms crossed · 80 side view · 81 back view
 *   82 crouch · 83 lying, head down
 * Poses that the guide does not contain are derived from it: wall climbing
 * uses walk frames rotated 90°, ceiling crawling uses them upside-down, and
 * swinging while held uses the idle frame tilted ±10°/±20°.
 */
import { live, once } from "../engine/expr";
import type { ActionDef, BehaviorDef, PoseDef } from "../engine/types";
import { ACTIONS } from "./actions";
import { BEHAVIORS } from "./behaviors";

const R = Math.random;
const pose = (image: number, len: number, dx = 0): PoseDef => [image, 64, 128, dx, 0, len];
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** A one-frame pose held on the floor (an "act" from the guide). */
const act = (image: number): ActionDef => ({ type: "stay", border: "floor", animations: [{ poses: [pose(image, 250)] }] });

/** Behavior wrapper: hold an act for a random duration. */
const hold = (action: string, min: number, spread: number): ActionDef => ({
  type: "sequence",
  actions: [{ ref: action, params: { duration: once(() => min + R() * spread) } }],
});

const HEISENBERG_ACTIONS: Record<string, ActionDef> = {
  ...ACTIONS,

  // Full cycles from the guide instead of Spider-Man's 2-frame loops.
  Stand: { type: "stay", border: "floor", animations: [{ poses: range(47, 54).map((i) => pose(i, 50)) }] },
  Walk: { type: "move", border: "floor", animations: [{ poses: range(55, 61).map((i) => pose(i, 4, -2)) }] },
  Run: { type: "move", border: "floor", animations: [{ poses: range(62, 66).map((i) => pose(i, 3, -4)) }] },
  Dash: { type: "move", border: "floor", animations: [{ poses: range(62, 66).map((i) => pose(i, 2, -8)) }] },
  Tripping: {
    type: "animate",
    border: "floor",
    animations: [{ poses: [pose(4, 8, -8), pose(67, 4, -4), pose(67, 4, -2), pose(67, 10), pose(68, 30)] }],
  },
  Creep: {
    type: "move",
    border: "floor",
    animations: [{ poses: [pose(20, 28), pose(20, 4, -2), pose(83, 4, -2), pose(83, 4, -1), pose(83, 24)] }],
  },

  // Actions / Interactions and Special Poses
  CoffeePose: act(69),
  CigarPose: act(70),
  BriefcasePose: act(71),
  LaptopSittingPose: act(72),
  LaptopPose: act(73),
  PhonePose: act(74),
  ThumbsUpPose: act(75),
  SlamItPose: act(76),
  PointPose: act(77),
  GlassesPose: act(78),
  ArmsCrossedPose: act(79),
  SidePose: act(80),
  BackPose: act(81),
  CrouchPose: act(82),

  SipCoffee: hold("CoffeePose", 250, 350),
  SmokeCigar: hold("CigarPose", 250, 300),
  HoldBriefcase: hold("BriefcasePose", 150, 200),
  LaptopOnTheFloor: hold("LaptopSittingPose", 400, 600),
  UseLaptop: hold("LaptopPose", 250, 300),
  CheckPhone: hold("PhonePose", 200, 300),
  ThumbsUp: hold("ThumbsUpPose", 60, 60),
  SlamIt: hold("SlamItPose", 100, 100),
  AdjustGlasses: hold("GlassesPose", 50, 50),
  CrossArms: hold("ArmsCrossedPose", 250, 400),
  LookAway: hold("SidePose", 100, 150),
  TurnAround: hold("BackPose", 100, 150),
  Crouch: hold("CrouchPose", 100, 150),
  PointAtCursor: {
    type: "sequence",
    actions: [
      { ref: "Look", params: { lookRight: once(({ m, env }) => m.anchor.x < env.cursor.x) } },
      { ref: "PointPose", params: { duration: once(() => 80 + R() * 80) } },
    ],
  },
};

const onAnyFloor = live<boolean>(({ m, env }) => env.floor.isOn(m.anchor) || env.activeIE.topBorder.isOn(m.anchor));

const ACT_BEHAVIORS: [string, number][] = [
  ["SipCoffee", 60],
  ["SmokeCigar", 40],
  ["HoldBriefcase", 30],
  ["LaptopOnTheFloor", 50],
  ["UseLaptop", 40],
  ["CheckPhone", 50],
  ["ThumbsUp", 30],
  ["SlamIt", 30],
  ["PointAtCursor", 40],
  ["AdjustGlasses", 40],
  ["CrossArms", 60],
  ["LookAway", 20],
  ["TurnAround", 20],
  ["Crouch", 25],
];

const HEISENBERG_BEHAVIORS: BehaviorDef[] = [
  ...BEHAVIORS,
  ...ACT_BEHAVIORS.map(([name, frequency]) => ({ name, frequency, conditions: [onAnyFloor] })),
];

export const HEISENBERG = {
  imageBasePath: "/shimeji/heisenberg/",
  imageExt: "webp",
  imageCount: 83,
  imageSize: 256,
  anchorOffset: { x: 64, y: 64 },
  actions: HEISENBERG_ACTIONS,
  behaviors: HEISENBERG_BEHAVIORS,
  /** One Heisenberg: the guide has no cloning art, so breeding stays off. */
  maxMascots: 1,
};
