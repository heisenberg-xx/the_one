/**
 * Translation of Shimeji_Spiderman/conf/行動.xml (behaviors).
 *
 * <条件> groups are flattened: each behavior carries the conditions of its
 * enclosing groups plus its own. Frequencies (頻度) are copied verbatim.
 */
import { live, once, type Expr } from "../engine/expr";
import type { BehaviorDef } from "../engine/types";

type B = Omit<BehaviorDef, "conditions"> & { condition?: Expr<boolean> };

const group = (cond: Expr<boolean>, list: B[]): BehaviorDef[] =>
  list.map(({ condition, ...b }) => ({ ...b, conditions: condition ? [cond, condition] : [cond] }));

const single = ({ condition, ...b }: B): BehaviorDef => ({ ...b, conditions: condition ? [condition] : [] });

/* ---- reusable conditions ---- */
const onAnyFloor = live<boolean>(({ m, env }) => env.floor.isOn(m.anchor) || env.activeIE.topBorder.isOn(m.anchor));
const onWorkAreaFloor = live<boolean>(({ m, env }) => env.floor.isOn(m.anchor));
const onIETop = live<boolean>(({ m, env }) => env.activeIE.topBorder.isOn(m.anchor));
/** Browser adaptation of `mascot.totalCount < 50` (configurable cap). */
const canBreed = live<boolean>(({ m }) => m.totalCount < m.maxCount);

export const BEHAVIORS: BehaviorDef[] = [
  /* ------------------------------ システムが使用する ------------------------------ */
  single({ name: "ChaseMouse", frequency: 0, next: { additive: false, list: [{ name: "SitAndFaceMouse", frequency: 1 }] } }),
  single({
    name: "SitAndFaceMouse",
    frequency: 0,
    next: {
      additive: false,
      list: [
        { name: "SitAndFaceMouse", frequency: 100 },
        { name: "SitAndSpinHead", frequency: 10 },
        { name: "SitAndDangleLegs", frequency: 1 },
      ],
    },
  }),
  single({ name: "SitAndSpinHead", frequency: 5, next: { additive: false, list: [{ name: "SitAndFaceMouse", frequency: 1 }] } }),
  single({ name: "Fall", frequency: 0 }),
  single({ name: "Dragged", frequency: 0 }),
  single({ name: "Thrown", frequency: 0 }),
  single({ name: "PulledUpShimeji", frequency: 0 }),
  single({ name: "Divided", frequency: 0 }),

  /* ------------------------------ 地面に接しているとき ------------------------------ */
  ...group(onAnyFloor, [
    { name: "StandUp", frequency: 200 },
    {
      name: "SitDown",
      frequency: 200,
      next: {
        additive: true,
        list: [
          { name: "SitAndDangleLegs", frequency: 100 },
          { name: "LieDown", frequency: 100 },
        ],
      },
    },
    { name: "SitAndDangleLegs", frequency: 0 },
    {
      name: "LieDown",
      frequency: 0,
      next: {
        additive: false,
        list: [
          { name: "SitDown", frequency: 100 },
          { name: "CrawlAlongIECeiling", frequency: 100, condition: once(({ m, env }) => env.activeIE.topBorder.isOn(m.anchor)) },
          { name: "CrawlAlongWorkAreaFloor", frequency: 100, condition: once(({ m, env }) => env.floor.isOn(m.anchor)) },
        ],
      },
    },
    { name: "SplitIntoTwo", frequency: 50, condition: canBreed },
  ]),

  /* ------------------------------ 壁に接しているとき ------------------------------ */
  ...group(
    live(({ m, env }) =>
      m.lookRight
        ? env.workArea.rightBorder.isOn(m.anchor) || env.activeIE.leftBorder.isOn(m.anchor)
        : env.workArea.leftBorder.isOn(m.anchor) || env.activeIE.rightBorder.isOn(m.anchor)
    ),
    [
      { name: "HoldOntoWall", frequency: 100 },
      { name: "FallFromWall", frequency: 50, condition: once(({ m, env }) => !env.floor.isOn(m.anchor)) },
    ]
  ),

  /* ------------------------------ 天井に接しているとき ------------------------------ */
  ...group(
    live(({ m, env }) => env.ceiling.isOn(m.anchor) || env.activeIE.bottomBorder.isOn(m.anchor)),
    [
      { name: "HoldOntoCeiling", frequency: 100 },
      { name: "FallFromCeiling", frequency: 50 },
    ]
  ),

  /* --------------------------- ワークエリアの下辺に接しているとき --------------------------- */
  ...group(onWorkAreaFloor, [
    { name: "WalkAlongWorkAreaFloor", frequency: 100 },
    { name: "RunAlongWorkAreaFloor", frequency: 100 },
    { name: "CrawlAlongWorkAreaFloor", frequency: 10, next: { additive: false, list: [{ name: "LieDown", frequency: 1 }] } },
    { name: "WalkLeftAlongFloorAndSit", frequency: 100 },
    { name: "WalkRightAlongFloorAndSit", frequency: 100 },
    { name: "GrabWorkAreaBottomLeftWall", frequency: 100 },
    { name: "GrabWorkAreaBottomRightWall", frequency: 100 },
    { name: "RunLeftAlongFloorAndSit", frequency: 100 },
    { name: "RunRightAlongFloorAndSit", frequency: 100 },
    { name: "RunAndGrabBottomLeftWall", frequency: 100 },
    { name: "RunAndGrabBottomRightWall", frequency: 100 },
    {
      name: "JumpFromBottomOfIE",
      frequency: 50,
      condition: live(({ m, env }) => m.anchor.x >= env.activeIE.left && m.anchor.x < env.activeIE.right),
    },
    { name: "PullUp", frequency: 50, condition: canBreed },
  ]),

  /* --------------------------- ワークエリアの壁に接しているとき --------------------------- */
  ...group(
    live(({ m, env }) => (m.lookRight ? env.workArea.rightBorder.isOn(m.anchor) : env.workArea.leftBorder.isOn(m.anchor))),
    [
      { name: "ClimbHalfwayAlongWall", frequency: 100 },
      { name: "ClimbAlongWall", frequency: 100 },
    ]
  ),

  /* --------------------------- ワークエリアの上辺に接しているとき --------------------------- */
  ...group(live(({ m, env }) => env.ceiling.isOn(m.anchor)), [{ name: "ClimbAlongCeiling", frequency: 100 }]),

  /* ------------------------------ IEの上辺に接しているとき ------------------------------ */
  ...group(onIETop, [
    { name: "WalkAlongIECeiling", frequency: 100 },
    { name: "RunAlongIECeiling", frequency: 100 },
    { name: "CrawlAlongIECeiling", frequency: 10, next: { additive: false, list: [{ name: "LieDown", frequency: 1 }] } },
    { name: "SitOnTheLeftEdgeOfIE", frequency: 100 },
    { name: "SitOnTheRightEdgeOfIE", frequency: 100 },
    { name: "JumpFromLeftEdgeOfIE", frequency: 100 },
    { name: "JumpFromRightEdgeOfIE", frequency: 100 },
    { name: "RunLeftAlongIEAndSit", frequency: 100 },
    { name: "RunRightAlongIEAndSit", frequency: 100 },
    { name: "RunLeftAlongIEAndJump", frequency: 100 },
    { name: "RunRightAlongIEAndJump", frequency: 100 },
  ]),

  /* ------------------------------ IEの壁に接しているとき ------------------------------ */
  ...group(
    live(({ m, env }) => (m.lookRight ? env.activeIE.leftBorder.isOn(m.anchor) : env.activeIE.rightBorder.isOn(m.anchor))),
    [
      { name: "ClimbHalfwayAlongIEWall", frequency: 100 },
      { name: "ClimbIEWall", frequency: 100 },
    ]
  ),

  /* ------------------------------ IEの下辺に接しているとき ------------------------------ */
  ...group(live(({ m, env }) => env.activeIE.bottomBorder.isOn(m.anchor)), [
    { name: "ClimbIEBottom", frequency: 100 },
    { name: "ClimbIEBottomLeftWall", frequency: 100 },
    { name: "ClimbIEBottomRightWall", frequency: 100 },
  ]),

  /* ------------------------------ 壁に飛びつく (ungrouped) ------------------------------ */
  single({
    name: "JumpOnLeftWall",
    frequency: 50,
    condition: live(
      ({ m, env }) =>
        !env.workArea.leftBorder.isOn(m.anchor) &&
        m.anchor.x < env.workArea.left + 400 &&
        Math.abs(env.workArea.bottom - m.anchor.y) < env.workArea.height / 4
    ),
  }),
  single({
    name: "JumpOnRightWall",
    frequency: 50,
    condition: live(
      ({ m, env }) =>
        !env.workArea.rightBorder.isOn(m.anchor) &&
        m.anchor.x >= env.workArea.right - 400 &&
        Math.abs(env.workArea.bottom - m.anchor.y) < env.workArea.height / 4
    ),
  }),

  /* ------------------------------ IEが見えるとき ------------------------------ */
  ...group(live(({ env }) => env.activeIE.visible), [
    {
      name: "JumpOnIELeftWall",
      frequency: 50,
      condition: live(
        ({ m, env }) =>
          m.anchor.x < env.activeIE.left && Math.abs(env.activeIE.bottom - m.anchor.y) < env.activeIE.height / 4
      ),
    },
    {
      name: "JumpOnIERightWall",
      frequency: 50,
      condition: live(
        ({ m, env }) =>
          m.anchor.x > env.activeIE.right && Math.abs(env.activeIE.bottom - m.anchor.y) < env.activeIE.height / 4
      ),
    },
    // IE throwing: additionally gated by `allowSurfaceThrowing` (env.canThrowIE).
    {
      name: "ThrowIEToRight",
      frequency: 20,
      condition: live(
        ({ m, env }) => env.canThrowIE && env.activeIE.bottom < m.anchor.y - 64 && m.anchor.x < env.activeIE.left
      ),
    },
    {
      name: "ThrowIEToLeft",
      frequency: 20,
      condition: live(
        ({ m, env }) => env.canThrowIE && env.activeIE.bottom < m.anchor.y - 64 && m.anchor.x > env.activeIE.right
      ),
    },
    {
      name: "RunAndThrowIEToRight",
      frequency: 20,
      condition: live(
        ({ m, env }) => env.canThrowIE && env.activeIE.bottom < m.anchor.y - 64 && m.anchor.x < env.activeIE.left
      ),
    },
    {
      name: "RunAndThrowIEToLeft",
      frequency: 20,
      condition: live(
        ({ m, env }) => env.canThrowIE && env.activeIE.bottom < m.anchor.y - 64 && m.anchor.x > env.activeIE.right
      ),
    },
  ]),
];
