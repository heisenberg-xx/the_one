/**
 * Port of com.group_finity.mascot.action.{Fall, Jump}.
 *
 * All velocities are pixels per tick (1 tick = 40 ms, as in the original
 * Manager thread). Units and constants are untouched from the XML.
 */
import { toInt } from "../expr";
import type { Mascot } from "../Mascot";
import { ActionBase } from "./base";

/**
 * 落ちる – ballistic motion with linear air resistance and constant gravity:
 *   vx -= vx * 空気抵抗X
 *   vy -= vy * 空気抵抗Y - 重力
 * Fractional velocity is accumulated in modX/modY so sub-pixel speeds still move.
 * Movement is swept one pixel at a time so the exact-equality border checks
 * (land on a floor, hit a wall) can never be tunnelled through.
 */
export class Fall extends ActionBase {
  protected vx = 0;
  protected vy = 0;
  private modX = 0;
  private modY = 0;

  override init(m: Mascot) {
    super.init(m);
    this.vx = this.num("initialVX", 0);
    this.vy = this.num("initialVY", 0);
    this.modX = 0;
    this.modY = 0;
  }

  override hasNext() {
    return super.hasNext() && !this.stopped();
  }

  /** Landed on a floor while moving down, or touching a wall it isn't moving away from. */
  private stopped() {
    const p = this.mascot.anchor;
    if (this.vy >= 0 && this.env.isOnFloor(p)) return true;
    const wall = this.env.wallAt(p);
    return wall !== null && (this.vx === 0 || Math.sign(this.vx) === -(wall.freeSide ?? 0));
  }

  protected tick() {
    const m = this.mascot;
    const rx = this.num("resistanceX", 0.05);
    const ry = this.num("resistanceY", 0.1);
    const g = this.num("gravity", 2);

    if (this.vx !== 0) m.lookRight = this.vx > 0;

    this.vx -= this.vx * rx;
    this.vy -= this.vy * ry - g;

    this.modX += this.vx % 1;
    this.modY += this.vy % 1;
    const dx = Math.trunc(this.vx) + Math.trunc(this.modX);
    const dy = Math.trunc(this.vy) + Math.trunc(this.modY);
    this.modX %= 1;
    this.modY %= 1;

    const dev = Math.max(Math.abs(dx), Math.abs(dy));
    const start = m.anchor;
    for (let i = 1; i <= dev; i++) {
      const p = {
        x: start.x + Math.trunc((dx * i) / dev),
        y: start.y + Math.trunc((dy * i) / dev),
      };
      m.anchor = p;
      if (dy > 0 && this.env.isOnFloor(p)) break;
      const wall = this.env.wallAt(p);
      if (wall && (dx === 0 || Math.sign(dx) === -(wall.freeSide ?? 0))) break;
    }

    this.getAnimation()?.next(m, this.time);
  }
}

/**
 * ジャンプ – fly toward (目的地X, 目的地Y) at constant 速度. Subtracting |dx|/2
 * from the vertical distance bends the straight line into an arc.
 */
export class Jump extends ActionBase {
  private target() {
    return { x: toInt(this.vars.get("targetX", 0)), y: toInt(this.vars.get("targetY", 0)) };
  }

  private distance() {
    const t = this.target();
    const a = this.mascot.anchor;
    const dX = t.x - a.x;
    const dY = t.y - a.y - Math.abs(dX) / 2;
    return { t, dX, dY, d: Math.sqrt(dX * dX + dY * dY) };
  }

  override hasNext() {
    return super.hasNext() && this.distance().d !== 0;
  }

  protected tick() {
    const m = this.mascot;
    const { t, dX, dY, d } = this.distance();
    const velocity = this.num("velocity", 20);
    m.lookRight = m.anchor.x < t.x;
    if (d !== 0) {
      m.anchor = {
        x: m.anchor.x + Math.trunc((velocity * dX) / d),
        y: m.anchor.y + Math.trunc((velocity * dY) / d),
      };
      this.getAnimation()?.next(m, this.time);
    }
    if (d <= velocity) m.anchor = { x: t.x, y: t.y };
  }
}
