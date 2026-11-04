/**
 * Port of com.group_finity.mascot.animation.{Pose, Animation}.
 *
 * A Pose shows one image for `duration` ticks and translates the anchor by its
 * velocity on EVERY tick it is active. Images face left; when the mascot looks
 * right the image and its anchor are mirrored and the X velocity is negated.
 */
import type { Expr, VariableMap } from "./expr";
import type { Mascot } from "./Mascot";

export class Pose {
  constructor(
    /** sprite number: shime{image}.png */
    readonly image: number,
    /** 基準座標 – image point placed on the mascot anchor (left-facing) */
    readonly anchorX: number,
    readonly anchorY: number,
    /** 移動速度 – pixels per tick (left-facing) */
    readonly dx: number,
    readonly dy: number,
    /** 長さ – ticks */
    readonly duration: number
  ) {}

  next(m: Mascot) {
    m.anchor = {
      x: m.anchor.x + (m.lookRight ? -this.dx : this.dx),
      y: m.anchor.y + this.dy,
    };
    m.pose = this;
  }
}

export class Animation {
  readonly duration: number;

  constructor(
    /** 条件 – always a live (#{}) expression in the original configs */
    readonly condition: Expr<boolean> | undefined,
    readonly poses: Pose[]
  ) {
    this.duration = poses.reduce((n, p) => n + p.duration, 0);
  }

  isEffective(vars: VariableMap) {
    return this.condition === undefined ? true : Boolean(vars.evaluate(this.condition));
  }

  next(m: Mascot, time: number) {
    this.getPoseAt(time).next(m);
  }

  getPoseAt(time: number): Pose {
    let t = this.duration > 0 ? time % this.duration : 0;
    for (const pose of this.poses) {
      t -= pose.duration;
      if (t < 0) return pose;
    }
    return this.poses[this.poses.length - 1];
  }
}
