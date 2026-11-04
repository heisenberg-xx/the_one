/**
 * Translation of Shimeji_Spiderman/conf/動作.xml (actions).
 *
 * Every pose and parameter is copied verbatim. Rhino expressions become
 * functions: `${...}` -> once(), `#{...}` -> live(). Parameter names:
 *   長さ duration · 条件 condition · 目的地X/Y targetX/Y · 初速X/Y initialVX/VY
 *   空気抵抗X/Y resistanceX/Y · 重力 gravity · 速度 velocity · 右向き lookRight
 *   生まれる場所X/Y bornX/Y · 生まれた時の行動 bornBehavior · IEの端X/Y ieOffsetX/Y
 *   ずれ drift
 * Pose tuple: [shimeN.png, anchorX, anchorY, velocityX, velocityY, ticks]
 */
import { live, once } from "../engine/expr";
import type { ActionDef, ActionNode, PoseDef } from "../engine/types";

const R = Math.random;
const still = (image: number, ay = 128, len = 250): PoseDef => [image, 64, ay, 0, 0, len];

/** <動作 種類="選択"> used by 落下する / 投げられる: land, else grab a wall. */
const landOrGrabWall: ActionNode = {
  type: "select",
  actions: [
    {
      type: "sequence",
      params: {
        condition: once(({ m, env }) => env.floor.isOn(m.anchor) || env.activeIE.topBorder.isOn(m.anchor)),
      },
      actions: [
        { ref: "Bouncing" },
        { ref: "Stand", params: { duration: once(() => 100 + R() * 100) } },
      ],
    },
    { ref: "GrabWall", params: { duration: 100 } },
  ],
};

const seq = (actions: ActionNode[], params?: ActionDef["params"]): ActionDef => ({
  type: "sequence",
  actions,
  params,
});

export const ACTIONS: Record<string, ActionDef> = {
  /* =========================== 動作リスト (primitives) =========================== */

  Look: { type: "builtin", class: "Look" }, // 振り向く
  Offset: { type: "builtin", class: "Offset" }, // 変位

  // 立つ系 ---------------------------------------------------------------------
  Stand: { type: "stay", border: "floor", animations: [{ poses: [still(1)] }] }, // 立つ
  Walk: {
    // 歩く
    type: "move",
    border: "floor",
    animations: [{ poses: [[1, 64, 128, -2, 0, 6], [2, 64, 128, -2, 0, 6], [1, 64, 128, -2, 0, 6], [3, 64, 128, -2, 0, 6]] }],
  },
  Run: {
    // 走る
    type: "move",
    border: "floor",
    animations: [{ poses: [[1, 64, 128, -4, 0, 2], [2, 64, 128, -4, 0, 2], [1, 64, 128, -4, 0, 2], [3, 64, 128, -4, 0, 2]] }],
  },
  Dash: {
    // 猛ダッシュ
    type: "move",
    border: "floor",
    animations: [{ poses: [[1, 64, 128, -8, 0, 2], [2, 64, 128, -8, 0, 2], [1, 64, 128, -8, 0, 2], [3, 64, 128, -8, 0, 2]] }],
  },

  // 座る系 ---------------------------------------------------------------------
  Sit: { type: "stay", border: "floor", animations: [{ poses: [still(11)] }] }, // 座る
  SitAndLookUp: { type: "stay", border: "floor", animations: [{ poses: [still(26)] }] }, // 座って見上げる
  SitAndLookAtMouse: {
    // 座ってマウスを見上げる
    type: "stay",
    border: "floor",
    animations: [
      { condition: live(({ env }) => env.cursor.y < env.screen.height / 2), poses: [still(26)] },
      { poses: [still(11)] },
    ],
  },
  SitAndSpinHeadAction: {
    // 座って首が回る
    type: "animate",
    border: "floor",
    animations: [{ poses: [26, 15, 27, 16, 28, 17, 29, 11].map((i) => still(i, 128, 5)) }],
  },
  SitWithLegsUp: { type: "stay", border: "floor", animations: [{ poses: [still(30, 112)] }] }, // 楽に座る
  SitWithLegsDown: { type: "stay", border: "floor", animations: [{ poses: [still(31, 112)] }] }, // 足を下ろして座る
  DangleLegs: {
    // 足をぶらぶらさせる
    type: "stay",
    border: "floor",
    animations: [{ poses: [still(31, 112, 5), still(32, 112, 15), still(31, 112, 5), still(33, 112, 15)] }],
  },

  // 寝そべる系 -------------------------------------------------------------------
  Sprawl: { type: "stay", border: "floor", animations: [{ poses: [still(21)] }] }, // 寝そべる
  Creep: {
    // ずりずり
    type: "move",
    border: "floor",
    animations: [
      {
        poses: [[20, 64, 128, 0, 0, 28], [20, 64, 128, -2, 0, 4], [21, 64, 128, -2, 0, 4], [21, 64, 128, -1, 0, 4], [21, 64, 128, 0, 0, 24]],
      },
    ],
  },

  // 天井系 ---------------------------------------------------------------------
  GrabCeiling: { type: "stay", border: "ceiling", animations: [{ poses: [still(23, 48)] }] }, // 天井に掴まる
  ClimbCeiling: {
    // 天井を伝う
    type: "move",
    border: "ceiling",
    animations: [
      {
        poses: [
          [25, 64, 48, 0, 0, 16], [25, 64, 48, -1, 0, 4], [23, 64, 48, -1, 0, 4], [24, 64, 48, -1, 0, 4],
          [24, 64, 48, 0, 0, 16], [24, 64, 48, -2, 0, 4], [23, 64, 48, -2, 0, 4], [25, 64, 48, -2, 0, 4],
        ],
      },
    ],
  },

  // 壁系 -----------------------------------------------------------------------
  GrabWall: { type: "stay", border: "wall", animations: [{ poses: [still(13)] }] }, // 壁に掴まる
  ClimbWall: {
    // 壁を登る
    type: "move",
    border: "wall",
    animations: [
      {
        condition: live(({ m, v }) => v.targetY < m.anchor.y),
        poses: [
          [14, 64, 128, 0, 0, 16], [14, 64, 128, 0, -1, 4], [12, 64, 128, 0, -1, 4], [13, 64, 128, 0, -1, 4],
          [13, 64, 128, 0, 0, 16], [13, 64, 128, 0, -2, 4], [12, 64, 128, 0, -2, 4], [14, 64, 128, 0, -2, 4],
        ],
      },
      {
        condition: live(({ m, v }) => v.targetY >= m.anchor.y),
        poses: [
          [14, 64, 128, 0, 0, 16], [14, 64, 128, 0, 2, 4], [12, 64, 128, 0, 2, 4], [13, 64, 128, 0, 2, 4],
          [13, 64, 128, 0, 0, 16], [13, 64, 128, 0, 1, 4], [12, 64, 128, 0, 1, 4], [14, 64, 128, 0, 1, 4],
        ],
      },
    ],
  },

  // IE系 -----------------------------------------------------------------------
  FallWithIE: {
    // IEを持って落ちる
    type: "builtin",
    class: "FallWithIE",
    params: { ieOffsetX: 0, ieOffsetY: -64 },
    animations: [{ poses: [still(36)] }],
  },
  WalkWithIE: {
    // IEを持って歩く
    type: "builtin",
    class: "WalkWithIE",
    border: "floor",
    params: { ieOffsetX: 0, ieOffsetY: -64 },
    animations: [{ poses: [[34, 64, 128, -2, 0, 6], [35, 64, 128, -2, 0, 6], [34, 64, 128, -2, 0, 6], [36, 64, 128, -2, 0, 6]] }],
  },
  RunWithIE: {
    // IEを持って走る
    type: "builtin",
    class: "WalkWithIE",
    border: "floor",
    params: { ieOffsetX: 0, ieOffsetY: -64 },
    animations: [{ poses: [[34, 64, 128, -8, 0, 2], [35, 64, 128, -8, 0, 2], [34, 64, 128, -8, 0, 2], [36, 64, 128, -8, 0, 2]] }],
  },
  ThrowIE: {
    // IEを投げる
    type: "builtin",
    class: "ThrowIE",
    border: "floor",
    params: { initialVX: 32, initialVY: -10, gravity: 0.5 },
    animations: [{ poses: [still(37, 128, 40)] }],
  },

  // 落下系 ---------------------------------------------------------------------
  Jumping: { type: "builtin", class: "Jump", params: { velocity: 20 }, animations: [{ poses: [still(22)] }] }, // ジャンプ
  Falling: {
    // 落ちる
    type: "builtin",
    class: "Fall",
    params: { resistanceX: 0.05, resistanceY: 0.1, gravity: 2 },
    animations: [{ poses: [still(4)] }],
  },
  Bouncing: { type: "animate", border: "floor", animations: [{ poses: [still(18, 128, 4), still(19, 128, 4)] }] }, // 跳ねる
  Tripping: {
    // 転ぶ
    type: "animate",
    border: "floor",
    animations: [
      { poses: [[19, 64, 128, -8, 0, 8], [18, 64, 128, -4, 0, 4], [20, 64, 128, -2, 0, 4], [20, 64, 128, 0, 0, 10], [19, 64, 104, -4, 0, 4]] },
    ],
  },

  // ドラッグ系 -------------------------------------------------------------------
  Pinched: {
    // つままれる
    type: "builtin",
    class: "Dragged",
    animations: [
      { condition: live(({ env, v }) => v.footX < env.cursor.x - 50), poses: [still(9, 128, 5)] },
      { condition: live(({ env, v }) => v.footX < env.cursor.x - 30), poses: [still(7, 128, 5)] },
      { condition: live(({ env, v }) => v.footX < env.cursor.x + 30), poses: [still(1, 128, 5)] },
      { condition: live(({ env, v }) => v.footX < env.cursor.x + 50), poses: [still(8, 128, 5)] },
      { condition: live(({ env, v }) => v.footX >= env.cursor.x + 30), poses: [still(10, 128, 5)] },
    ],
  },
  Resisting: {
    // 抵抗する
    type: "builtin",
    class: "Regist",
    animations: [
      {
        poses: [
          ...[5, 6, 5, 6].map((i) => still(i, 128, 5)),
          still(1, 128, 50),
          ...[5, 6, 5, 6, 5, 6, 5, 6].map((i) => still(i, 128, 5)),
          still(1, 128, 100),
          ...[5, 6, 5, 6, 5, 6, 5, 6].map((i) => still(i, 128, 5)),
          ...[5, 6, 5, 6, 5, 6, 5, 6].map((i) => still(i, 128, 2)),
        ],
      },
    ],
  },

  /* ====================== 実際の行動 (behavior-level actions) ====================== */

  // システムが使用する
  Fall: seq([{ ref: "Falling" }, landOrGrabWall]), // 落下する
  Dragged: { type: "sequence", loop: true, actions: [{ ref: "Pinched" }, { ref: "Resisting" }] }, // ドラッグされる
  Thrown: seq([
    // 投げられる
    {
      ref: "Falling",
      params: { initialVX: once(({ env }) => env.cursor.dx), initialVY: once(({ env }) => env.cursor.dy) },
    },
    landOrGrabWall,
  ]),

  StandUp: seq([{ ref: "Stand", params: { duration: once(() => 500 + R() * 1000) } }]), // 立ってボーっとする
  SitDown: seq([{ ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } }]), // 座ってボーっとする
  LieDown: seq([{ ref: "Sprawl", params: { duration: once(() => 500 + R() * 1000) } }]), // 寝そべってボーっとする
  SitAndDangleLegs: seq([
    // 座って足をぶらぶらさせる
    { ref: "SitWithLegsUp", params: { duration: 10 } },
    { ref: "SitWithLegsDown", params: { duration: once(() => 100 + R() * 100) } },
    { ref: "DangleLegs", params: { duration: once(() => 500 + R() * 100) } },
    { ref: "SitWithLegsDown", params: { duration: once(() => 100 + R() * 100) } },
    { ref: "SitWithLegsUp", params: { duration: 10 } },
  ]),
  HoldOntoWall: seq([{ ref: "GrabWall", params: { duration: once(() => 500 + R() * 1000) } }]), // 壁に掴まってボーっとする
  FallFromWall: seq([
    // 壁から落ちる
    { ref: "Offset", params: { x: once(({ m }) => (m.lookRight ? -1 : 1)) } },
    { ref: "Stand" },
  ]),
  HoldOntoCeiling: seq([{ ref: "GrabCeiling", params: { duration: once(() => 500 + R() * 1000) } }]), // 天井に掴まってボーっとする
  FallFromCeiling: seq([{ ref: "Offset", params: { y: 1 } }, { ref: "Stand" }]), // 天井から落ちる

  // ワークエリアの下辺 (viewport floor) --------------------------------------------
  WalkAlongWorkAreaFloor: seq([
    { ref: "Walk", params: { targetX: once(({ env }) => env.workArea.left + 64 + R() * (env.workArea.width - 128)) } },
  ]),
  RunAlongWorkAreaFloor: seq([
    { ref: "Run", params: { targetX: once(({ env }) => env.workArea.left + 64 + R() * (env.workArea.width - 128)) } },
  ]),
  CrawlAlongWorkAreaFloor: seq([
    { ref: "Creep", params: { targetX: once(({ env }) => env.workArea.left + 64 + R() * (env.workArea.width - 128)) } },
  ]),
  WalkLeftAlongFloorAndSit: seq([
    // ワークエリアの下辺の左の端っこで座る
    { ref: "Walk", params: { targetX: once(({ env }) => env.workArea.left + 100 + R() * 300) } },
    { ref: "Stand", params: { duration: once(() => 20 + R() * 20) } },
    { ref: "Look", params: { lookRight: true } },
    { ref: "Stand", params: { duration: once(() => 20 + R() * 20) } },
    { ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } },
  ]),
  WalkRightAlongFloorAndSit: seq([
    { ref: "Walk", params: { targetX: once(({ env }) => env.workArea.right - 100 - R() * 300) } },
    { ref: "Stand", params: { duration: once(() => 20 + R() * 20) } },
    { ref: "Look", params: { lookRight: false } },
    { ref: "Stand", params: { duration: once(() => 20 + R() * 20) } },
    { ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } },
  ]),
  GrabWorkAreaBottomLeftWall: seq([
    // ワークエリアの下辺から左の壁によじのぼる
    { ref: "Walk", params: { targetX: live(({ env }) => env.workArea.left) } },
    { ref: "ClimbWall", params: { targetY: live(({ env }) => env.workArea.bottom - 64) } },
  ]),
  GrabWorkAreaBottomRightWall: seq([
    { ref: "Walk", params: { targetX: live(({ env }) => env.workArea.right) } },
    { ref: "ClimbWall", params: { targetY: live(({ env }) => env.workArea.bottom - 64) } },
  ]),
  RunLeftAlongFloorAndSit: seq([
    { ref: "Run", params: { targetX: once(({ env }) => env.workArea.left + 100 + R() * 300) } },
    { ref: "Stand", params: { duration: once(() => 20 + R() * 20) } },
    { ref: "Look", params: { lookRight: true } },
    { ref: "Stand", params: { duration: once(() => 20 + R() * 20) } },
    { ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } },
  ]),
  RunRightAlongFloorAndSit: seq([
    { ref: "Run", params: { targetX: once(({ env }) => env.workArea.right - 100 - R() * 300) } },
    { ref: "Stand", params: { duration: once(() => 20 + R() * 20) } },
    { ref: "Look", params: { lookRight: false } },
    { ref: "Stand", params: { duration: once(() => 20 + R() * 20) } },
    { ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } },
  ]),
  RunAndGrabBottomLeftWall: seq([
    { ref: "Run", params: { targetX: live(({ env }) => env.workArea.left) } },
    { ref: "ClimbWall", params: { targetY: live(({ env }) => env.workArea.bottom - 64) } },
  ]),
  RunAndGrabBottomRightWall: seq([
    { ref: "Run", params: { targetX: live(({ env }) => env.workArea.right) } },
    { ref: "ClimbWall", params: { targetY: live(({ env }) => env.workArea.bottom - 64) } },
  ]),

  JumpFromBottomOfIE: seq([
    // IEの下に飛びつく
    {
      ref: "Jumping",
      params: {
        targetX: once(({ m, env }) => (m.anchor.x * 3 + env.activeIE.left + R() * env.activeIE.width) / 4),
        targetY: once(({ env }) => env.activeIE.bottom),
      },
    },
    { ref: "GrabCeiling", params: { duration: once(() => 100 + R() * 100) } },
  ]),

  // ワークエリアの壁・上辺 (viewport sides / top) ----------------------------------
  ClimbHalfwayAlongWall: seq([
    {
      ref: "ClimbWall",
      params: { targetY: once(({ env }) => env.workArea.top + 64 + R() * (env.workArea.height - 128)) },
    },
  ]),
  ClimbAlongWall: seq([
    // ワークエリアの壁を登る
    { ref: "ClimbWall", params: { targetY: live(({ env }) => env.workArea.top + 64) } },
    { ref: "Offset", params: { y: -64 } },
    { ref: "Look" },
    {
      ref: "ClimbCeiling",
      // Original: `...right-Math.random*100` (missing parens -> NaN -> 0). Fixed.
      params: {
        targetX: once(({ m, env }) =>
          m.lookRight ? env.workArea.left + R() * 100 : env.workArea.right - R() * 100
        ),
      },
    },
  ]),
  ClimbAlongCeiling: seq([
    // ワークエリアの上辺を伝う
    {
      ref: "ClimbCeiling",
      params: { targetX: once(({ env }) => env.workArea.left + 64 + R() * (env.workArea.width - 128)) },
    },
  ]),

  // IEの天井 (top of a surface element) ----------------------------------------
  WalkAlongIECeiling: seq([
    { ref: "Walk", params: { targetX: once(({ env }) => env.activeIE.left + 64 + R() * (env.activeIE.width - 128)) } },
  ]),
  RunAlongIECeiling: seq([
    { ref: "Run", params: { targetX: once(({ env }) => env.activeIE.left + 64 + R() * (env.activeIE.width - 128)) } },
  ]),
  CrawlAlongIECeiling: seq([
    { ref: "Creep", params: { targetX: once(({ env }) => env.activeIE.left + 64 + R() * (env.activeIE.width - 128)) } },
  ]),
  SitOnTheLeftEdgeOfIE: seq([
    { ref: "Walk", params: { targetX: once(({ env }) => env.activeIE.left + 100 + R() * 300) } },
    { ref: "Stand", params: { duration: once(() => 100 + R() * 100) } },
    { ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } },
  ]),
  SitOnTheRightEdgeOfIE: seq([
    { ref: "Walk", params: { targetX: once(({ env }) => env.activeIE.right - 100 - R() * 300) } },
    { ref: "Stand", params: { duration: once(() => 100 + R() * 100) } },
    { ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } },
  ]),
  JumpFromLeftEdgeOfIE: seq([
    { ref: "Walk", params: { targetX: once(({ env }) => env.activeIE.left + R() * 50) } },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
    { ref: "Falling", params: { initialVX: once(() => -15 - R() * 5), initialVY: once(() => -20 - R() * 5) } },
    { ref: "Bouncing" },
  ]),
  JumpFromRightEdgeOfIE: seq([
    { ref: "Walk", params: { targetX: once(({ env }) => env.activeIE.right - R() * 50) } },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
    { ref: "Falling", params: { initialVX: once(() => 15 + R() * 5), initialVY: once(() => -20 - R() * 5) } },
    { ref: "Bouncing" },
  ]),
  RunLeftAlongIEAndSit: seq([
    { ref: "Run", params: { targetX: once(({ env }) => env.activeIE.left + 100 + R() * 300) } },
    { ref: "Stand", params: { duration: once(() => 100 + R() * 100) } },
    { ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } },
  ]),
  RunRightAlongIEAndSit: seq([
    { ref: "Run", params: { targetX: once(({ env }) => env.activeIE.right - 100 - R() * 300) } },
    { ref: "Stand", params: { duration: once(() => 100 + R() * 100) } },
    { ref: "Sit", params: { duration: once(() => 500 + R() * 1000) } },
  ]),
  RunLeftAlongIEAndJump: seq([
    { ref: "Run", params: { targetX: once(({ env }) => env.activeIE.left + R() * 50) } },
    { ref: "Falling", params: { initialVX: once(() => -15 - R() * 5), initialVY: once(() => -20 - R() * 5) } },
    { ref: "Bouncing" },
  ]),
  RunRightAlongIEAndJump: seq([
    { ref: "Run", params: { targetX: once(({ env }) => env.activeIE.right - R() * 50) } },
    { ref: "Falling", params: { initialVX: once(() => 15 + R() * 5), initialVY: once(() => -20 - R() * 5) } },
    { ref: "Bouncing" },
  ]),
  DashLeftAlongIEAndJump: seq([
    // 猛ダッシュでIEの天井の左の端っこから飛び降りる
    { ref: "Dash", params: { targetX: once(({ env }) => env.activeIE.left + R() * 20 + 20) } },
    { ref: "Falling", params: { initialVX: once(() => -5 - R() * 2), initialVY: once(() => -20 - R() * 5) } },
    { ref: "Bouncing" },
  ]),
  DashRightAlongIEAndJump: seq([
    { ref: "Dash", params: { targetX: once(({ env }) => env.activeIE.right - R() * 20 - 20) } },
    { ref: "Falling", params: { initialVX: once(() => 5 + R() * 2), initialVY: once(() => -20 - R() * 5) } },
    { ref: "Bouncing" },
  ]),

  // IEの壁・下辺 (sides / underside of a surface element) --------------------------
  ClimbHalfwayAlongIEWall: seq([
    {
      ref: "ClimbWall",
      params: { targetY: once(({ env }) => env.activeIE.top + 64 + R() * (env.activeIE.height - 128)) },
    },
  ]),
  ClimbIEWall: seq([
    // IEの壁を登る
    { ref: "ClimbWall", params: { targetY: live(({ env }) => env.activeIE.top + 64) } },
    { ref: "Offset", params: { y: -64 } },
    { ref: "Sit", params: { duration: 5 } },
    { ref: "Stand", params: { duration: once(() => 10 + R() * 10) } },
    {
      ref: "Walk",
      // Original: `...right-Math.random*100` (missing parens). Fixed.
      params: {
        targetX: once(({ m, env }) =>
          m.lookRight ? env.activeIE.left + R() * 100 : env.activeIE.right - R() * 100
        ),
      },
    },
  ]),
  ClimbIEBottom: seq([
    // IEの下辺を伝う — original parenthesisation `(random*width-128)` corrected
    {
      ref: "ClimbCeiling",
      params: { targetX: once(({ env }) => env.activeIE.left + 64 + R() * (env.activeIE.width - 128)) },
    },
  ]),
  ClimbIEBottomLeftWall: seq([
    { ref: "ClimbCeiling", params: { targetX: live(({ env }) => env.activeIE.left) } },
    { ref: "Look" },
    { ref: "ClimbWall", params: { targetY: live(({ env }) => env.activeIE.bottom - 64) } },
  ]),
  ClimbIEBottomRightWall: seq([
    { ref: "ClimbCeiling", params: { targetX: live(({ env }) => env.activeIE.right) } },
    { ref: "Look" },
    { ref: "ClimbWall", params: { targetY: live(({ env }) => env.activeIE.bottom - 64) } },
  ]),

  // 飛びつく (leap onto walls) ------------------------------------------------------
  JumpOnLeftWall: seq([
    {
      ref: "Jumping",
      params: {
        targetX: once(({ env }) => env.workArea.left),
        targetY: once(({ env }) => env.workArea.bottom - (R() * env.workArea.height) / 4),
      },
    },
    { ref: "GrabWall", params: { duration: once(() => 100 + R() * 100) } },
  ]),
  JumpOnRightWall: seq([
    {
      ref: "Jumping",
      params: {
        targetX: once(({ env }) => env.workArea.right),
        targetY: once(({ env }) => env.workArea.bottom - (R() * env.workArea.height) / 4),
      },
    },
    { ref: "GrabWall", params: { duration: once(() => 100 + R() * 100) } },
  ]),
  JumpOnIELeftWall: seq([
    {
      ref: "Jumping",
      params: {
        targetX: once(({ env }) => env.activeIE.left),
        targetY: once(({ env }) => env.activeIE.bottom - (R() * env.activeIE.height) / 4),
      },
    },
    { ref: "GrabWall", params: { duration: once(() => 100 + R() * 100) } },
  ]),
  JumpOnIERightWall: seq([
    {
      ref: "Jumping",
      params: {
        targetX: once(({ env }) => env.activeIE.right),
        targetY: once(({ env }) => env.activeIE.bottom - (R() * env.activeIE.height) / 4),
      },
    },
    { ref: "GrabWall", params: { duration: once(() => 100 + R() * 100) } },
  ]),

  // IEを投げる (throw the window) — opt-in in the browser -----------------------------
  ThrowIEToRight: seq([
    // IEを右に投げる
    {
      ref: "Jumping",
      params: { targetX: once(({ env }) => env.activeIE.left), targetY: once(({ env }) => env.activeIE.bottom + 64) },
    },
    { ref: "FallWithIE" },
    { ref: "WalkWithIE", params: { targetX: live(({ env }) => env.workArea.right - 400) } },
    { ref: "ThrowIE" },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
    { ref: "Look" },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
  ]),
  ThrowIEToLeft: seq([
    // IEを左に投げる
    {
      ref: "Jumping",
      params: { targetX: once(({ env }) => env.activeIE.right), targetY: once(({ env }) => env.activeIE.bottom + 64) },
    },
    { ref: "FallWithIE" },
    { ref: "WalkWithIE", params: { targetX: live(({ env }) => env.workArea.left + 400) } },
    { ref: "ThrowIE" },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
    { ref: "Look" },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
  ]),
  RunAndThrowIEToRight: seq([
    {
      ref: "Jumping",
      params: { targetX: once(({ env }) => env.activeIE.left), targetY: once(({ env }) => env.activeIE.bottom + 64) },
    },
    { ref: "FallWithIE" },
    { ref: "RunWithIE", params: { targetX: live(({ env }) => env.workArea.right - 400) } },
    { ref: "ThrowIE" },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
    { ref: "Look" },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
  ]),
  RunAndThrowIEToLeft: seq([
    {
      ref: "Jumping",
      params: { targetX: once(({ env }) => env.activeIE.right), targetY: once(({ env }) => env.activeIE.bottom + 64) },
    },
    { ref: "FallWithIE" },
    { ref: "RunWithIE", params: { targetX: live(({ env }) => env.workArea.left + 400) } },
    { ref: "ThrowIE" },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
    { ref: "Look" },
    { ref: "Stand", params: { duration: once(() => 50 + R() * 50) } },
  ]),

  // マウス (cursor) ----------------------------------------------------------------
  ChaseMouse: seq([
    // マウスの周りに集まる
    seq([{ ref: "Offset", params: { y: 1 } }, { ref: "Falling" }, { ref: "Bouncing" }], {
      condition: once(({ m, env }) => env.ceiling.isOn(m.anchor) || env.activeIE.bottomBorder.isOn(m.anchor)),
    }),
    seq([{ ref: "Offset", params: { x: 1 } }, { ref: "Falling" }, { ref: "Bouncing" }], {
      condition: once(
        ({ m, env }) => env.workArea.leftBorder.isOn(m.anchor) || env.activeIE.rightBorder.isOn(m.anchor)
      ),
    }),
    seq([{ ref: "Offset", params: { x: -1 } }, { ref: "Falling" }, { ref: "Bouncing" }], {
      condition: once(
        ({ m, env }) => env.workArea.rightBorder.isOn(m.anchor) || env.activeIE.leftBorder.isOn(m.anchor)
      ),
    }),
    {
      type: "select",
      actions: [
        {
          ref: "DashLeftAlongIEAndJump",
          params: {
            condition: once(
              ({ m, env }) =>
                env.activeIE.topBorder.isOn(m.anchor) &&
                m.anchor.x < (env.activeIE.left + env.activeIE.right) / 2
            ),
          },
        },
        {
          ref: "DashRightAlongIEAndJump",
          params: {
            condition: once(
              ({ m, env }) =>
                env.activeIE.topBorder.isOn(m.anchor) &&
                m.anchor.x >= (env.activeIE.left + env.activeIE.right) / 2
            ),
          },
        },
      ],
    },
    { ref: "Dash", params: { targetX: once(({ m, env }) => m.anchor.x + ((env.cursor.x - m.anchor.x) * R()) / 2) } },
    { ref: "Tripping", params: { condition: once(() => R() < 0.05) } },
    { ref: "Dash", params: { targetX: once(({ m, env }) => m.anchor.x + (env.cursor.x - m.anchor.x) * R()) } },
    { ref: "Tripping", params: { condition: once(() => R() < 0.05) } },
    {
      ref: "Dash",
      params: {
        targetX: live(({ env, v }) => env.cursor.x + v.drift),
        drift: once(({ m, env }) =>
          m.anchor.x < env.cursor.x
            ? -Math.min(env.cursor.x - m.anchor.x, R() * 200)
            : Math.min(m.anchor.x - env.cursor.x, R() * 200)
        ),
      },
    },
    { ref: "Look", params: { lookRight: once(({ m, env }) => m.anchor.x < env.cursor.x) } },
  ]),
  SitAndFaceMouse: seq(
    // 座ってマウスのほうを見る
    Array.from({ length: 10 }).flatMap((): ActionNode[] => [
      { ref: "SitAndLookAtMouse", params: { duration: once(() => 10 + R() * 10) } },
      { ref: "Look", params: { lookRight: once(({ m, env }) => m.anchor.x < env.cursor.x) } },
    ])
  ),
  SitAndSpinHead: seq([{ ref: "SitAndSpinHeadAction" }]), // 座ってマウスのほうを見てたら首が回った

  // 増殖 (breeding) ----------------------------------------------------------------
  PullUpShimeji1: {
    // 引っこ抜く1
    type: "builtin",
    class: "Breed",
    params: { bornX: -32, bornY: 96, bornBehavior: "PulledUpShimeji" },
    animations: [
      {
        poses: [[1, 64, 128, 0, 0, 16], [38, 96, 128, 0, 0, 4], [39, 96, 128, 0, 0, 40], [40, 96, 128, 0, 0, 40], [41, 96, 128, 0, 0, 40]],
      },
    ],
  },
  PullUpShimeji2: {
    // 引っこ抜く2
    type: "animate",
    animations: [{ poses: [[9, 32, 128, 20, -20, 1], [9, 32, 128, 20, -10, 1], [9, 32, 128, 20, -5, 1]] }],
  },
  PullUp: seq([
    // 引っこ抜く
    { ref: "PullUpShimeji1" },
    { ref: "PullUpShimeji2" },
    { ref: "Falling", params: { initialVX: once(({ m }) => (m.lookRight ? -20 : 20)) } },
    { ref: "Bouncing" },
    { ref: "Sprawl", params: { duration: 40 } },
  ]),
  PulledUpShimeji: seq([
    // 引っこ抜かれる
    { ref: "Falling", params: { initialVX: once(({ m }) => (m.lookRight ? 10 : -10)), initialVY: -40 } },
    { ref: "Bouncing" },
  ]),
  SplitIntoTwo1: {
    // 分裂1
    type: "builtin",
    class: "Breed",
    params: { bornX: -16, bornY: 0, bornBehavior: "Divided" },
    animations: [{ poses: [still(42, 128, 5), still(43, 128, 2), still(44, 128, 2), still(45, 128, 5), still(46, 128, 20)] }],
  },
  SplitIntoTwo: seq([
    // 分裂する
    { ref: "SplitIntoTwo1" },
    { ref: "Offset", params: { x: 16 } },
    { ref: "Look" },
    { ref: "Divided" },
  ]),
  Divided: seq([
    // 分裂した
    { ref: "Falling", params: { initialVX: once(({ m }) => (m.lookRight ? 10 : -10)), initialVY: -5 } },
    { ref: "Bouncing" },
  ]),
};
