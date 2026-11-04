/**
 * Port of com.group_finity.mascot.Mascot (state only – rendering lives in
 * SpriteRenderer, input in InteractionController).
 */
import type { Pose } from "./Animation";
import { BEHAVIOR_FALL, type UserBehavior } from "./Behavior";
import type { Point, Rect } from "./geometry";
import type { ShimejiEngine } from "./ShimejiEngine";

let nextId = 1;
const MAX_BEHAVIOR_CHAIN = 24;

export class Mascot {
  readonly id = nextId++;
  /** Feet position in world px (the point all 基準座標 are aligned to). */
  anchor: Point = { x: 0, y: 0 };
  /** Images face left; true = mirrored. */
  lookRight = false;
  pose: Pose | null = null;
  dragging = false;
  holdingIE = false;
  behavior: UserBehavior | null = null;
  private chainDepth = 0;

  constructor(readonly engine: ShimejiEngine) {}

  /* ---------------- script-facing API (mascot.*) ---------------- */
  get environment() {
    return this.engine.env;
  }
  get totalCount() {
    return this.engine.count;
  }
  /** Browser adaptation of the hard-coded `totalCount < 50` clone limit. */
  get maxCount() {
    return this.engine.maxCount;
  }

  /* ------------------------------ engine API ------------------------------ */

  setBehavior(b: UserBehavior) {
    if (this.holdingIE) {
      this.holdingIE = false;
      this.environment.releaseActiveIE();
    }
    this.behavior = b;
    if (++this.chainDepth > MAX_BEHAVIOR_CHAIN) {
      // Behaviors that end instantly keep chaining: bail out like a respawn.
      this.chainDepth = 0;
      this.dropFromTop();
      const fall = this.engine.config.buildBehavior(BEHAVIOR_FALL);
      this.behavior = fall;
      fall.action.init(this);
      return;
    }
    try {
      b.init(this);
    } finally {
      this.chainDepth = Math.max(0, this.chainDepth - 1);
    }
  }

  tick() {
    this.behavior?.next();
  }

  /** Place above a random point of the screen (Manager / UserBehavior respawn). */
  dropFromTop() {
    const s = this.environment.screen;
    this.anchor = {
      x: Math.trunc(Math.random() * (s.right - s.left)) + s.left,
      y: s.top - 256,
    };
  }

  /** World-space image rectangle, or null before the first pose. */
  bounds(size: number): Rect | null {
    const p = this.pose;
    if (!p) return null;
    const left = this.anchor.x - (this.lookRight ? size - p.anchorX : p.anchorX);
    const top = this.anchor.y - p.anchorY;
    return { left, top, right: left + size, bottom: top + size };
  }

  /** UserBehavior's out-of-screen test (left, right and bottom only, like the original). */
  isOutOfScreen() {
    const b = this.bounds(this.engine.imageSize);
    if (!b) return false;
    const s = this.environment.screen;
    return b.right <= s.left || s.right <= b.left || s.bottom <= b.top;
  }
}
