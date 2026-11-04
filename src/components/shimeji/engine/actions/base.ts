/**
 * Port of com.group_finity.mascot.action.{Action, ActionBase, BorderedAction}
 * and com.group_finity.mascot.exception.LostGroundException.
 */
import type { Animation } from "../Animation";
import { toInt, type VariableMap } from "../expr";
import type { Border } from "../geometry";
import type { Mascot } from "../Mascot";
import type { BorderType } from "../types";

/**
 * Thrown when a mascot is no longer on the border its action requires
 * (e.g. the floor disappeared, or it walked off the edge of a surface).
 * UserBehavior catches it and switches to the "Fall" behavior.
 */
export class LostGroundError extends Error {
  constructor() {
    super("LostGround");
  }
}

export abstract class ActionBase {
  protected mascot!: Mascot;
  protected time = 0;

  constructor(
    readonly vars: VariableMap,
    readonly animations: readonly Animation[] = []
  ) {}

  protected get env() {
    return this.mascot.environment;
  }

  init(m: Mascot) {
    this.mascot = m;
    this.time = 0;
    this.vars.init(m);
  }

  next() {
    this.tick();
    this.time++;
  }

  /** `条件` must hold and `長さ` must not be exhausted. */
  hasNext(): boolean {
    return this.isEffective() && this.time < this.getDuration();
  }

  protected isEffective() {
    return Boolean(this.vars.get("condition", true));
  }

  protected getDuration() {
    return this.vars.has("duration") ? toInt(this.vars.get("duration")) : Number.POSITIVE_INFINITY;
  }

  /** First animation whose condition holds (conditions are re-evaluated every tick). */
  protected getAnimation(): Animation | null {
    for (const a of this.animations) if (a.isEffective(this.vars)) return a;
    return null;
  }

  protected num(name: string, fallback: number) {
    const v = Number(this.vars.get(name, fallback));
    return Number.isFinite(v) ? v : fallback;
  }

  protected abstract tick(): void;
}

/** Actions bound to a floor / wall / ceiling (枠). */
export abstract class BorderedAction extends ActionBase {
  protected border: Border | null = null;

  override init(m: Mascot) {
    super.init(m);
    const type = this.vars.get<BorderType | undefined>("border");
    const p = m.anchor;
    this.border =
      type === "floor"
        ? this.env.getFloor(p)
        : type === "wall"
          ? this.env.getWall(p)
          : type === "ceiling"
            ? this.env.getCeiling(p)
            : null;
  }

  /** Ride along with a moving border (scrolling element / resized viewport). */
  protected tick() {
    if (this.border) this.mascot.anchor = this.border.move(this.mascot.anchor);
  }

  protected checkBorder() {
    if (this.border && !this.border.isOn(this.mascot.anchor)) throw new LostGroundError();
  }
}
