/**
 * Port of com.group_finity.mascot.action.{Stay, Move, Animate, Look, Offset}.
 */
import { toInt } from "../expr";
import type { Mascot } from "../Mascot";
import { ActionBase, BorderedAction } from "./base";

/** 静止 – loop an animation in place while on the border, for `長さ` ticks. */
export class Stay extends BorderedAction {
  protected override tick() {
    super.tick();
    this.checkBorder();
    this.getAnimation()?.next(this.mascot, this.time);
  }
}

/** 固定 – play the animation exactly once. */
export class Animate extends BorderedAction {
  override hasNext() {
    const a = this.getAnimation();
    return super.hasNext() && a !== null && this.time < a.duration;
  }

  protected override tick() {
    super.tick();
    this.checkBorder();
    this.getAnimation()?.next(this.mascot, this.time);
  }
}

/**
 * 移動 – advance with the pose velocities until 目的地X / 目的地Y is reached.
 * Facing is derived from the target; overshoot is clamped onto the target.
 */
export class Move extends BorderedAction {
  protected target(name: "targetX" | "targetY"): number | null {
    return this.vars.has(name) ? toInt(this.vars.get(name)) : null;
  }

  override hasNext() {
    const tx = this.target("targetX");
    const ty = this.target("targetY");
    const a = this.mascot.anchor;
    const noMoveX = tx === null || a.x === tx;
    const noMoveY = ty === null || a.y === ty;
    return super.hasNext() && !(noMoveX && noMoveY);
  }

  protected override tick() {
    super.tick();
    this.checkBorder();
    const m = this.mascot;
    const tx = this.target("targetX");
    const ty = this.target("targetY");

    let down = false;
    if (tx !== null && m.anchor.x !== tx) m.lookRight = m.anchor.x < tx;
    if (ty !== null) down = m.anchor.y < ty;

    this.getAnimation()?.next(m, this.time);

    let { x, y } = m.anchor;
    if (tx !== null && ((m.lookRight && x >= tx) || (!m.lookRight && x <= tx))) x = tx;
    if (ty !== null && ((down && y >= ty) || (!down && y <= ty))) y = ty;
    m.anchor = { x, y };
  }
}

/** 振り向く – set the facing (右向き), default: turn around. One tick. */
export class Look extends ActionBase {
  private targetRight = false;

  override init(m: Mascot) {
    super.init(m);
    this.targetRight = this.vars.has("lookRight") ? Boolean(this.vars.get("lookRight")) : !m.lookRight;
  }

  override hasNext() {
    return super.hasNext() && this.time < 1;
  }

  protected tick() {
    this.mascot.lookRight = this.targetRight;
  }
}

/** 変位 – translate the anchor by (X, Y). One tick. */
export class Offset extends ActionBase {
  override hasNext() {
    return super.hasNext() && this.time < 1;
  }

  protected tick() {
    const m = this.mascot;
    m.anchor = {
      x: m.anchor.x + toInt(this.vars.get("x", 0)),
      y: m.anchor.y + toInt(this.vars.get("y", 0)),
    };
  }
}
