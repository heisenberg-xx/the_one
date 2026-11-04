/**
 * Port of com.group_finity.mascot.action.{Dragged, Regist, Breed,
 * FallWithIE, WalkWithIE, ThrowIE}.
 */
import { toInt } from "../expr";
import type { Mascot } from "../Mascot";
import { ActionBase, LostGroundError } from "./base";
import { Animate, Move } from "./basic";
import { Fall } from "./physics";

/* --------------------------------- dragging -------------------------------- */

/** The mascot hangs 120px below the cursor (it is held by the head). */
const DRAG_OFFSET_Y = 120;
/** Ticks without moving the cursor before the mascot starts to resist. */
const TIME_TO_RESIST = 250;

/**
 * つままれる – follow the cursor. `footX` is a damped spring that lags behind
 * the cursor; the animation conditions compare it with cursor.x, so the legs
 * swing like a pendulum when the mascot is moved sideways.
 */
export class Dragged extends ActionBase {
  private footX = 0;
  private footDx = 0;

  override init(m: Mascot) {
    super.init(m);
    this.footX = this.env.cursor.x;
    this.footDx = 0;
    this.vars.put("footX", this.footX);
  }

  override hasNext() {
    return super.hasNext() && this.time < TIME_TO_RESIST;
  }

  protected tick() {
    const m = this.mascot;
    const c = this.env.cursor;
    m.lookRight = false;
    m.dragging = true;

    if (Math.abs(c.x - m.anchor.x) >= 5) this.time = 0; // still being moved: postpone resisting

    this.footDx = (this.footDx + (c.x - this.footX) * 0.1) * 0.8;
    this.footX += this.footDx;
    this.vars.put("footX", this.footX);

    this.getAnimation()?.next(m, this.time);
    m.anchor = { x: c.x, y: c.y + DRAG_OFFSET_Y };
  }
}

/** 抵抗する – wriggle; when the animation ends the mascot breaks free and falls. */
export class Regist extends ActionBase {
  override hasNext() {
    const a = this.getAnimation();
    return super.hasNext() && a !== null && this.time < a.duration;
  }

  protected tick() {
    const m = this.mascot;
    const a = this.getAnimation();
    a?.next(m, this.time);
    if (a && this.time + 1 >= a.duration) {
      m.lookRight = Math.random() < 0.5;
      m.dragging = false;
      throw new LostGroundError();
    }
  }
}

/* ---------------------------------- breed ---------------------------------- */

/**
 * Breed – play the animation, then create a new mascot at
 * anchor + (生まれる場所X mirrored by facing, 生まれる場所Y) running 生まれた時の行動.
 */
export class Breed extends ActionBase {
  override hasNext() {
    const a = this.getAnimation();
    return super.hasNext() && a !== null && this.time < a.duration;
  }

  protected tick() {
    const m = this.mascot;
    const a = this.getAnimation();
    a?.next(m, this.time);
    if (a && this.time + 1 >= a.duration) {
      const bx = toInt(this.vars.get("bornX", 0));
      const by = toInt(this.vars.get("bornY", 0));
      m.engine.spawn(
        { x: m.anchor.x + (m.lookRight ? -bx : bx), y: m.anchor.y + by },
        m.lookRight,
        String(this.vars.get("bornBehavior"))
      );
    }
  }
}

/* ------------------------- carrying the "IE" window ------------------------- */
/* Browser adaptation: the IE is a [data-shimeji-surface] element moved with CSS
 * `translate`. Only reachable when `allowSurfaceThrowing` is enabled.          */

function ieAttached(m: Mascot, ox: number, oy: number) {
  const ie = m.environment.activeIE;
  if (!ie.visible || !m.environment.canThrowIE) return false;
  const a = m.anchor;
  return m.lookRight
    ? a.x - ox === ie.left && a.y + oy === ie.bottom
    : a.x + ox === ie.right && a.y + oy === ie.bottom;
}

function carryIE(m: Mascot, ox: number, oy: number) {
  const ie = m.environment.activeIE;
  const a = m.anchor;
  m.holdingIE = true;
  if (m.lookRight) m.environment.moveActiveIE(a.x - ox, a.y + oy - ie.height);
  else m.environment.moveActiveIE(a.x + ox - ie.width, a.y + oy - ie.height);
}

/** IEを持って落ちる – fall while holding the window overhead. */
export class FallWithIE extends Fall {
  protected override tick() {
    const ox = toInt(this.vars.get("ieOffsetX", 0));
    const oy = toInt(this.vars.get("ieOffsetY", 0));
    if (!ieAttached(this.mascot, ox, oy)) throw new LostGroundError();
    super.tick();
    carryIE(this.mascot, ox, oy);
  }
}

/** IEを持って歩く / 走る – walk while holding the window overhead. */
export class WalkWithIE extends Move {
  protected override tick() {
    const ox = toInt(this.vars.get("ieOffsetX", 0));
    const oy = toInt(this.vars.get("ieOffsetY", 0));
    if (!ieAttached(this.mascot, ox, oy)) throw new LostGroundError();
    super.tick();
    carryIE(this.mascot, ox, oy);
  }
}

/** IEを投げる – fling the window: constant X speed, parabolic Y. */
export class ThrowIE extends Animate {
  protected override tick() {
    super.tick();
    const m = this.mascot;
    const env = this.env;
    const ie = env.activeIE;
    if (m.holdingIE && env.holdingIE) {
      const vx = this.num("initialVX", 32);
      const vy = this.num("initialVY", -10);
      const g = this.num("gravity", 0.5);
      env.moveActiveIE(
        Math.trunc(m.lookRight ? ie.left + vx : ie.left - vx),
        Math.trunc(ie.top + vy + this.time * g)
      );
    }
    const a = this.getAnimation();
    if (a && this.time + 1 >= a.duration && m.holdingIE) {
      m.holdingIE = false;
      env.releaseActiveIE();
    }
  }
}
