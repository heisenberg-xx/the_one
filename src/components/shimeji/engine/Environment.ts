/**
 * Port of com.group_finity.mascot.environment.{Environment, MascotEnvironment}
 * plus the platform layer (win.WindowsEnvironment) re-targeted at the browser.
 *
 * Desktop concept            -> Browser equivalent
 * ----------------------------------------------------------------------------
 * screen / work area         -> the layout viewport (document.documentElement)
 * work area bottom (taskbar) -> bottom edge of the viewport ("floor")
 * work area top              -> top edge of the viewport ("ceiling")
 * active IE window           -> the first fully visible [data-shimeji-surface] element
 * global mouse cursor        -> last known pointer position (Pointer Events)
 * moving IE window (throw)   -> CSS `translate` on the surface element (opt-in)
 */
import { Area, type Border, NotOnBorder, type Point, type Rect } from "./geometry";

export interface EnvironmentOptions {
  getScale: () => number;
  surfaceSelector: string | null;
  allowSurfaceThrowing: boolean;
}

const MIN_SURFACE_W = 96;
const MIN_SURFACE_H = 32;

export class Environment {
  readonly screen = new Area(true);
  readonly workArea = new Area(true);
  readonly activeIE = new Area(false);
  readonly cursor = { x: 0, y: 0, dx: 0, dy: 0 };
  scale = 1;

  private cssCursor: Point | null = null;
  private lastCursor: Point | null = null;
  private surface: HTMLElement | null = null;
  private held: HTMLElement | null = null;
  private readonly translations = new Map<HTMLElement, { x: number; y: number; prevTransition: string }>();
  private readonly restoreTimers = new Map<HTMLElement, number>();

  constructor(private readonly opts: EnvironmentOptions) {}

  /* ---------------- script-facing API (mascot.environment.*) ---------------- */

  /** `mascot.environment.floor` – the bottom of the work area. */
  get floor(): Border {
    return this.workArea.bottomBorder;
  }
  /** `mascot.environment.ceiling` – the top of the work area. */
  get ceiling(): Border {
    return this.workArea.topBorder;
  }
  /** Browser adaptation flag consulted by the IE-throwing behaviors. */
  get canThrowIE() {
    return this.opts.allowSurfaceThrowing && this.activeIE.visible && this.surface !== null;
  }

  /* ------------------------------- engine API ------------------------------- */

  /** Environment.tick() – refresh geometry once per engine tick. */
  tick() {
    const s = (this.scale = this.opts.getScale());
    const de = document.documentElement;
    const rect: Rect = {
      left: 0,
      top: 0,
      right: Math.floor(de.clientWidth / s),
      bottom: Math.floor(de.clientHeight / s),
    };
    this.screen.set(rect);
    this.workArea.set(rect);

    const c = this.cssCursor ?? { x: (de.clientWidth / 2), y: de.clientHeight / 2 };
    const x = Math.round(c.x / s);
    const y = Math.round(c.y / s);
    this.cursor.dx = this.lastCursor ? x - this.lastCursor.x : 0;
    this.cursor.dy = this.lastCursor ? y - this.lastCursor.y : 0;
    this.cursor.x = x;
    this.cursor.y = y;
    this.lastCursor = { x, y };

    this.updateSurface();
  }

  /** Pointer position in CSS px. `reset` suppresses the dx/dy jump on touch-down. */
  setCursor(cssX: number, cssY: number, reset = false) {
    this.cssCursor = { x: cssX, y: cssY };
    if (reset) {
      const s = this.scale;
      const x = Math.round(cssX / s);
      const y = Math.round(cssY / s);
      this.cursor.x = x;
      this.cursor.y = y;
      this.cursor.dx = this.cursor.dy = 0;
      this.lastCursor = { x, y };
    }
  }

  /** Environment.getFloor(): the floor the point stands on (IE top first). */
  getFloor(p: Point): Border {
    return this.pick(p, [this.activeIE.topBorder, this.workArea.bottomBorder]);
  }
  getCeiling(p: Point): Border {
    return this.pick(p, [this.activeIE.bottomBorder, this.workArea.topBorder]);
  }
  getWall(p: Point): Border {
    return this.pick(p, [
      this.activeIE.leftBorder,
      this.activeIE.rightBorder,
      this.workArea.leftBorder,
      this.workArea.rightBorder,
    ]);
  }
  isOnFloor(p: Point) {
    return this.activeIE.topBorder.isOn(p) || this.workArea.bottomBorder.isOn(p);
  }
  /** Strict (no movement compensation) wall lookup used by the Fall sweep. */
  wallAt(p: Point): Border | null {
    for (const b of [
      this.activeIE.leftBorder,
      this.activeIE.rightBorder,
      this.workArea.leftBorder,
      this.workArea.rightBorder,
    ]) {
      if (b.isOn(p)) return b;
    }
    return null;
  }

  private pick(p: Point, borders: Border[]): Border {
    for (const b of borders) if (b.isOn(p) || b.isOn(b.move(p))) return b;
    return NotOnBorder;
  }

  /* ------------------------ active "IE" (DOM surface) ----------------------- */

  private updateSurface() {
    if (this.held) {
      this.activeIE.settle();
      return;
    }
    const sel = this.opts.surfaceSelector;
    if (!sel) {
      this.activeIE.set(null);
      return;
    }
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(sel));
    let rect = this.surface && candidates.includes(this.surface) ? this.rectOf(this.surface) : null;
    if (!rect) {
      const prev = this.surface;
      this.surface = null;
      for (const el of candidates) {
        const r = this.rectOf(el);
        if (r) {
          this.surface = el;
          rect = r;
          break;
        }
      }
      if (this.surface !== prev) this.activeIE.set(null); // no deltas across a switch
    }
    this.activeIE.set(rect);
  }

  /** A surface counts as "visible" only when it is fully inside the viewport. */
  private rectOf(el: HTMLElement): Rect | null {
    const r = el.getBoundingClientRect();
    const s = this.scale;
    const rect = {
      left: Math.round(r.left / s),
      top: Math.round(r.top / s),
      right: Math.round(r.right / s),
      bottom: Math.round(r.bottom / s),
    };
    const wa = this.workArea;
    if (rect.right - rect.left < MIN_SURFACE_W || rect.bottom - rect.top < MIN_SURFACE_H) return null;
    if (rect.left < wa.left || rect.top < wa.top || rect.right > wa.right || rect.bottom > wa.bottom) return null;
    return rect;
  }

  /** Environment.moveActiveIE(point) – top-left of the IE in world px. */
  moveActiveIE(x: number, y: number) {
    const el = this.surface;
    if (!el || !this.opts.allowSurfaceThrowing) return;
    this.held = el;
    const timer = this.restoreTimers.get(el);
    if (timer) {
      clearTimeout(timer);
      this.restoreTimers.delete(el);
    }
    const a = this.activeIE;
    const s = this.scale;
    const t = this.translations.get(el) ?? { x: 0, y: 0, prevTransition: el.style.transition };
    t.x += (x - a.left) * s;
    t.y += (y - a.top) * s;
    this.translations.set(el, t);
    el.style.transition = "none";
    el.style.translate = `${t.x}px ${t.y}px`;
    const w = a.width;
    const h = a.height;
    a.set({ left: x, top: y, right: x + w, bottom: y + h });
    a.settle();
  }

  /** Let go of a carried/thrown surface; it glides back to its place later. */
  releaseActiveIE() {
    const el = this.held;
    if (!el) return;
    this.held = null;
    this.surface = null;
    this.activeIE.set(null);
    this.restoreTimers.set(
      el,
      window.setTimeout(() => this.restore(el, true), 2500)
    );
  }

  get holdingIE() {
    return this.held !== null;
  }

  private restore(el: HTMLElement, animate: boolean) {
    const t = this.translations.get(el);
    this.restoreTimers.delete(el);
    if (!t) return;
    this.translations.delete(el);
    if (!animate) {
      el.style.translate = "";
      el.style.transition = t.prevTransition;
      return;
    }
    el.style.transition = "translate 700ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.translate = "";
    window.setTimeout(() => {
      if (!this.translations.has(el)) el.style.transition = t.prevTransition;
    }, 750);
  }

  destroy() {
    for (const timer of this.restoreTimers.values()) clearTimeout(timer);
    this.restoreTimers.clear();
    for (const el of Array.from(this.translations.keys())) this.restore(el, false);
    this.held = null;
  }
}
