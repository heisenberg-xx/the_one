/**
 * Port of com.group_finity.mascot.{Main, Manager}.
 *
 * The original Manager runs a dedicated thread that sleeps 40 ms between
 * ticks (25 ticks/s) and ticks the environment, then every mascot. All XML
 * durations and velocities are expressed in those ticks, so the browser port
 * keeps a FIXED 40 ms simulation step driven by requestAnimationFrame
 * (accumulator pattern) and only redraws when at least one tick ran.
 * The loop naturally pauses in background tabs.
 */
import { BEHAVIOR_CHASE_MOUSE, BEHAVIOR_FALL, Configuration } from "./Behavior";
import { EffectSystem } from "./Effects";
import { Environment } from "./Environment";
import type { Point } from "./geometry";
import { InteractionController } from "./InteractionController";
import { Mascot } from "./Mascot";
import { SpriteRenderer } from "./SpriteRenderer";
import type { ActionDef, BehaviorDef } from "./types";

export interface ShimejiEngineOptions {
  actions: Readonly<Record<string, ActionDef>>;
  behaviors: readonly BehaviorDef[];
  imageBasePath: string;
  /** File extension of the sprites, e.g. "png" or "webp". */
  imageExt: string;
  imageCount: number;
  imageSize: number;
  /** Added to every pose anchor (sprite sets drawn on a larger canvas). */
  anchorOffset: { x: number; y: number };
  tickMs: number;
  initialCount: number;
  maxMascots: number;
  scale: (viewportWidth: number) => number;
  zIndex: number;
  surfaceSelector: string | null;
  allowSurfaceThrowing: boolean;
  hitAlphaThreshold: number;
}

/** Commands of the original tray / right-click menu. */
export type ShimejiCommand =
  | "spawn"
  | "gather"
  | "reduce"
  | "dismiss"
  | "restore"
  /** Run any behavior by name, e.g. "behavior:ShootGun". */
  | `behavior:${string}`;

const MAX_CATCHUP_TICKS = 5;

export class ShimejiEngine {
  readonly env: Environment;
  readonly config: Configuration;
  readonly effects: EffectSystem;
  readonly mascots: Mascot[] = [];
  private readonly renderer: SpriteRenderer;
  private readonly interaction: InteractionController;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;
  private destroyed = false;

  constructor(private readonly opts: ShimejiEngineOptions) {
    this.env = new Environment({
      getScale: () => opts.scale(document.documentElement.clientWidth),
      surfaceSelector: opts.surfaceSelector,
      allowSurfaceThrowing: opts.allowSurfaceThrowing,
    });
    this.config = new Configuration(opts.actions, opts.behaviors, opts.anchorOffset);
    this.effects = new EffectSystem(this.env);
    this.renderer = new SpriteRenderer({
      basePath: opts.imageBasePath,
      ext: opts.imageExt,
      imageCount: opts.imageCount,
      imageSize: opts.imageSize,
      zIndex: opts.zIndex,
      alphaThreshold: opts.hitAlphaThreshold,
    });
    this.interaction = new InteractionController(this, opts.zIndex);
  }

  get count() {
    return this.mascots.length;
  }
  get maxCount() {
    return this.opts.maxMascots;
  }
  get imageSize() {
    return this.opts.imageSize;
  }

  async start() {
    await this.renderer.load();
    if (this.destroyed) return;
    this.renderer.mount();
    this.interaction.attach();
    this.env.tick();
    for (let i = 0; i < this.opts.initialCount; i++) this.spawn();
    document.addEventListener("visibilitychange", this.onVisibility);
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  /**
   * Manager.add / Main.createMascot. Without an anchor the mascot drops in from
   * above a random x (the original's out-of-screen respawn), facing randomly.
   */
  spawn(anchor?: Point, lookRight?: boolean, behavior = BEHAVIOR_FALL): Mascot | null {
    if (this.mascots.length >= this.opts.maxMascots) return null;
    const m = new Mascot(this);
    if (anchor) m.anchor = { x: Math.trunc(anchor.x), y: Math.trunc(anchor.y) };
    else m.dropFromTop();
    m.lookRight = lookRight ?? Math.random() < 0.5;
    this.mascots.push(m);
    m.setBehavior(this.config.buildBehavior(behavior));
    return m;
  }

  remove(m: Mascot) {
    const i = this.mascots.indexOf(m);
    if (i < 0) return;
    if (m.holdingIE) this.env.releaseActiveIE();
    this.mascots.splice(i, 1);
  }

  hitTest(cssX: number, cssY: number) {
    return this.renderer.hitTest(cssX, cssY, this.mascots, this.env.scale);
  }
  cssBox(m: Mascot) {
    return this.renderer.cssBox(m, this.env.scale);
  }

  command(cmd: ShimejiCommand) {
    if (cmd.startsWith("behavior:")) {
      const name = cmd.slice("behavior:".length);
      for (const m of this.mascots) {
        if (m.dragging) continue;
        try {
          m.setBehavior(this.config.buildBehavior(name));
        } catch (e) {
          console.warn(`[shimeji] unknown behavior "${name}"`, e);
          return;
        }
      }
      return;
    }
    switch (cmd) {
      case "spawn":
        this.spawn();
        break;
      case "gather": // "Follow cursor"
        for (const m of this.mascots) {
          if (!m.dragging) m.setBehavior(this.config.buildBehavior(BEHAVIOR_CHASE_MOUSE));
        }
        break;
      case "reduce": // "Reduce to one"
        for (const m of this.mascots.slice(1)) this.remove(m);
        break;
      case "dismiss": // "Dismiss all"
        for (const m of this.mascots.slice()) this.remove(m);
        this.effects.clear();
        this.renderer.render(this.mascots, this.env.scale, this.effects);
        break;
      case "restore": // "Restore IE"
        this.env.destroy();
        break;
    }
  }

  /** Manager.tick(): environment first, then every mascot. */
  private tick() {
    this.env.tick();
    for (const m of this.mascots.slice()) {
      if (this.mascots.includes(m)) m.tick();
    }
    this.effects.tick();
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.acc += Math.min(now - this.last, 250);
    this.last = now;
    let ticks = 0;
    while (this.acc >= this.opts.tickMs && ticks < MAX_CATCHUP_TICKS) {
      this.acc -= this.opts.tickMs;
      this.tick();
      ticks++;
    }
    if (ticks === MAX_CATCHUP_TICKS) this.acc = 0;
    if (ticks > 0) {
      this.renderer.render(this.mascots, this.env.scale, this.effects);
      const p = this.interaction.lastMousePosition;
      this.interaction.refreshHover(p?.x ?? null, p?.y ?? null);
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private onVisibility = () => {
    // Do not fast-forward the simulation after the tab was hidden.
    this.last = performance.now();
    this.acc = 0;
  };

  destroy() {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.interaction.detach();
    this.renderer.destroy();
    this.env.destroy();
    this.mascots.length = 0;
  }
}
