/**
 * Port of com.group_finity.mascot.environment.{Area, Border, FloorCeiling, Wall, NotOnBorder}.
 *
 * All coordinates are integer "world" pixels (CSS px / render scale). The
 * original engine relies on exact integer equality for `isOn` checks, so every
 * position written into the world is integral.
 */
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Border {
  /** True when the point lies exactly on this border line. */
  isOn(p: Point): boolean;
  /**
   * Carries a point that was on the border's PREVIOUS position to its new
   * position (the original uses this to ride on windows that are moved or
   * resized; in the browser it lets Spider-Man ride DOM elements while the page
   * scrolls, and follow the viewport floor when the window is resized).
   */
  move(p: Point): Point;
  readonly kind: "floor" | "ceiling" | "wall" | "none";
  /** For walls: +1 if the walkable/free side is to the right, -1 if to the left. */
  readonly freeSide?: 1 | -1;
}

export const NotOnBorder: Border = {
  kind: "none",
  isOn: () => false,
  move: (p) => p,
};

export class Area implements Rect {
  visible = false;
  left = 0;
  top = 0;
  right = 0;
  bottom = 0;
  dleft = 0;
  dtop = 0;
  dright = 0;
  dbottom = 0;

  readonly topBorder: FloorCeiling;
  readonly bottomBorder: FloorCeiling;
  readonly leftBorder: Wall;
  readonly rightBorder: Wall;

  /**
   * @param inner true for areas the mascot lives INSIDE (screen / work area),
   *              false for obstacles it lives on the OUTSIDE of (the "IE" window).
   */
  constructor(inner: boolean) {
    this.topBorder = new FloorCeiling(this, "top", inner ? "ceiling" : "floor");
    this.bottomBorder = new FloorCeiling(this, "bottom", inner ? "floor" : "ceiling");
    this.leftBorder = new Wall(this, "left", inner ? 1 : -1);
    this.rightBorder = new Wall(this, "right", inner ? -1 : 1);
  }

  get width() {
    return this.right - this.left;
  }
  get height() {
    return this.bottom - this.top;
  }

  set(rect: Rect | null) {
    if (!rect) {
      this.visible = false;
      this.dleft = this.dtop = this.dright = this.dbottom = 0;
      this.left = this.top = this.right = this.bottom = 0;
      return;
    }
    const wasVisible = this.visible;
    this.dleft = wasVisible ? rect.left - this.left : 0;
    this.dtop = wasVisible ? rect.top - this.top : 0;
    this.dright = wasVisible ? rect.right - this.right : 0;
    this.dbottom = wasVisible ? rect.bottom - this.bottom : 0;
    this.left = rect.left;
    this.top = rect.top;
    this.right = rect.right;
    this.bottom = rect.bottom;
    this.visible = true;
  }

  /** Clears movement deltas (used when the engine moves the area itself). */
  settle() {
    this.dleft = this.dtop = this.dright = this.dbottom = 0;
  }
}

export class FloorCeiling implements Border {
  constructor(
    private readonly area: Area,
    private readonly edge: "top" | "bottom",
    readonly kind: "floor" | "ceiling"
  ) {}

  get y() {
    return this.edge === "top" ? this.area.top : this.area.bottom;
  }

  isOn(p: Point) {
    const a = this.area;
    return a.visible && p.y === this.y && a.left <= p.x && p.x <= a.right;
  }

  move(p: Point): Point {
    const a = this.area;
    if (!a.visible) return p;
    const dy = this.edge === "top" ? a.dtop : a.dbottom;
    if (dy === 0 && a.dleft === 0 && a.dright === 0) return p;
    const oldY = this.y - dy;
    const oldLeft = a.left - a.dleft;
    const oldRight = a.right - a.dright;
    if (p.y !== oldY || p.x < oldLeft || p.x > oldRight) return p;
    const oldW = oldRight - oldLeft;
    const newW = a.right - a.left;
    const x = oldW > 0 ? Math.round(((p.x - oldLeft) * newW) / oldW) + a.left : p.x + a.dleft;
    return { x, y: this.y };
  }
}

export class Wall implements Border {
  readonly kind = "wall" as const;
  constructor(
    private readonly area: Area,
    private readonly edge: "left" | "right",
    readonly freeSide: 1 | -1
  ) {}

  get x() {
    return this.edge === "left" ? this.area.left : this.area.right;
  }

  isOn(p: Point) {
    const a = this.area;
    return a.visible && p.x === this.x && a.top <= p.y && p.y <= a.bottom;
  }

  move(p: Point): Point {
    const a = this.area;
    if (!a.visible) return p;
    const dx = this.edge === "left" ? a.dleft : a.dright;
    if (dx === 0 && a.dtop === 0 && a.dbottom === 0) return p;
    const oldX = this.x - dx;
    const oldTop = a.top - a.dtop;
    const oldBottom = a.bottom - a.dbottom;
    if (p.x !== oldX || p.y < oldTop || p.y > oldBottom) return p;
    const oldH = oldBottom - oldTop;
    const newH = a.bottom - a.top;
    const y = oldH > 0 ? Math.round(((p.y - oldTop) * newH) / oldH) + a.top : p.y + a.dtop;
    return { x: this.x, y };
  }
}
