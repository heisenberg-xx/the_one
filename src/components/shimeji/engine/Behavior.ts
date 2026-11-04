/**
 * Port of com.group_finity.mascot.config.{Configuration, ActionBuilder,
 * ActionRef, BehaviorBuilder} and com.group_finity.mascot.behavior.UserBehavior.
 */
import { Animation, Pose } from "./Animation";
import { type ActionBase, LostGroundError } from "./actions/base";
import { Animate, Look, Move, Offset, Stay } from "./actions/basic";
import { Select, Sequence } from "./actions/complex";
import { Fall, Jump } from "./actions/physics";
import { Breed, Dragged, FallWithIE, Regist, ThrowIE, WalkWithIE } from "./actions/special";
import { evalWith, type Params, VariableMap } from "./expr";
import type { Mascot } from "./Mascot";
import type { ActionDef, ActionNode, AnimationDef, BehaviorDef } from "./types";

/** Behaviors the system itself invokes (システムが使用する). */
export const BEHAVIOR_FALL = "Fall";
export const BEHAVIOR_DRAGGED = "Dragged";
export const BEHAVIOR_THROWN = "Thrown";
export const BEHAVIOR_CHASE_MOUSE = "ChaseMouse";

const isRef = (n: ActionNode): n is { ref: string; params?: Params } => "ref" in n;

export class Configuration {
  private readonly behaviors = new Map<string, BehaviorDef>();

  constructor(
    private readonly actions: Readonly<Record<string, ActionDef>>,
    behaviors: readonly BehaviorDef[]
  ) {
    for (const b of behaviors) this.behaviors.set(b.name, b);
  }

  /* ------------------------------ ActionBuilder ------------------------------ */

  buildAction(node: ActionNode, overrides: Params = {}): ActionBase {
    if (isRef(node)) {
      const def = this.actions[node.ref];
      if (!def) throw new Error(`[shimeji] unknown action "${node.ref}"`);
      return this.buildAction(def, { ...node.params, ...overrides });
    }
    const def = node;
    const params: Params = { ...def.params, ...overrides };
    if ("border" in def && def.border && !("border" in params)) params.border = def.border;
    const vars = new VariableMap(params);

    switch (def.type) {
      case "sequence":
        return new Sequence(vars, def.actions.map((a) => this.buildAction(a)), Boolean(def.loop));
      case "select":
        return new Select(vars, def.actions.map((a) => this.buildAction(a)));
      case "stay":
        return new Stay(vars, toAnimations(def.animations));
      case "move":
        return new Move(vars, toAnimations(def.animations));
      case "animate":
        return new Animate(vars, toAnimations(def.animations));
      case "builtin": {
        const anims = toAnimations(def.animations ?? []);
        switch (def.class) {
          case "Look":
            return new Look(vars);
          case "Offset":
            return new Offset(vars);
          case "Fall":
            return new Fall(vars, anims);
          case "Jump":
            return new Jump(vars, anims);
          case "Dragged":
            return new Dragged(vars, anims);
          case "Regist":
            return new Regist(vars, anims);
          case "Breed":
            return new Breed(vars, anims);
          case "FallWithIE":
            return new FallWithIE(vars, anims);
          case "WalkWithIE":
            return new WalkWithIE(vars, anims);
          case "ThrowIE":
            return new ThrowIE(vars, anims);
        }
      }
    }
  }

  /* ----------------------------- BehaviorBuilder ----------------------------- */

  buildBehavior(name: string): UserBehavior {
    return new UserBehavior(name, this.buildAction({ ref: name }), this);
  }

  /**
   * Configuration.buildNextBehavior – weighted random choice among:
   *  - every behavior whose (group + own) conditions hold, unless the previous
   *    behavior's 次の行動リスト is non-additive, plus
   *  - the previous behavior's 次の行動リスト entries whose conditions hold.
   * With nothing to choose from, the mascot is dropped in from above.
   */
  buildNextBehavior(previous: string | null, m: Mascot): UserBehavior {
    const candidates: { name: string; weight: number }[] = [];
    const prev = previous ? this.behaviors.get(previous) : undefined;

    if (!prev?.next || prev.next.additive) {
      for (const b of this.behaviors.values()) {
        if (b.frequency <= 0) continue;
        if ((b.conditions ?? []).every((c) => evalWith(c, m, true))) {
          candidates.push({ name: b.name, weight: b.frequency });
        }
      }
    }
    for (const r of prev?.next?.list ?? []) {
      if (r.frequency > 0 && evalWith(r.condition, m, true)) {
        candidates.push({ name: r.name, weight: r.frequency });
      }
    }

    const total = candidates.reduce((n, c) => n + c.weight, 0);
    if (total <= 0) {
      m.dropFromTop();
      return this.buildBehavior(BEHAVIOR_FALL);
    }
    let r = Math.random() * total;
    for (const c of candidates) {
      r -= c.weight;
      if (r < 0) return this.buildBehavior(c.name);
    }
    return this.buildBehavior(candidates[candidates.length - 1].name);
  }
}

function toAnimations(defs: readonly AnimationDef[]): Animation[] {
  return defs.map(
    (a) => new Animation(a.condition, a.poses.map((p) => new Pose(p[0], p[1], p[2], p[3], p[4], p[5])))
  );
}

/* --------------------------------- UserBehavior ------------------------------- */

export class UserBehavior {
  private mascot!: Mascot;

  constructor(
    readonly name: string,
    readonly action: ActionBase,
    private readonly config: Configuration
  ) {}

  init(m: Mascot) {
    this.mascot = m;
    this.action.init(m);
    if (!this.action.hasNext()) m.setBehavior(this.config.buildNextBehavior(this.name, m));
  }

  /** Advance one tick; handles completion, lost ground and leaving the screen. */
  next() {
    const m = this.mascot;
    try {
      if (this.action.hasNext()) this.action.next();
      if (m.behavior !== this) return; // replaced during the tick (e.g. drag started)

      if (this.action.hasNext()) {
        if (m.isOutOfScreen()) {
          m.dropFromTop();
          m.setBehavior(this.config.buildBehavior(BEHAVIOR_FALL));
        }
      } else {
        m.setBehavior(this.config.buildNextBehavior(this.name, m));
      }
    } catch (e) {
      if (!(e instanceof LostGroundError)) console.warn("[shimeji]", e);
      m.dragging = false;
      m.setBehavior(this.config.buildBehavior(BEHAVIOR_FALL));
    }
  }

  mousePressed() {
    // Set immediately so a press+release inside one tick still counts as a throw.
    this.mascot.dragging = true;
    this.mascot.setBehavior(this.config.buildBehavior(BEHAVIOR_DRAGGED));
  }

  mouseReleased() {
    const m = this.mascot;
    if (!m.dragging) return;
    m.dragging = false;
    m.setBehavior(this.config.buildBehavior(BEHAVIOR_THROWN));
  }
}
