/**
 * Replaces the original per-window AWT MouseListener (Mascot.mousePressed /
 * mouseReleased) and the global cursor poller (Environment.getCursor()).
 *
 * Rules that keep the host page fully usable:
 *  - The canvas never receives events (pointer-events: none).
 *  - Pointer listeners are passive observers on `window` (capture phase); an
 *    event is only claimed when it lands on an OPAQUE pixel of a mascot.
 *  - A tiny hotspot element exists only while the mouse hovers an opaque pixel,
 *    purely to show a grab cursor; it disappears as soon as the pointer leaves.
 *  - Scrolling is only blocked for the duration of an active touch drag.
 */
import type { Mascot } from "./Mascot";
import type { ShimejiEngine } from "./ShimejiEngine";

export class InteractionController {
  private hotspot: HTMLDivElement | null = null;
  private dragged: Mascot | null = null;
  private pointerId: number | null = null;
  private suppressClick = false;
  private claimTouch = false;

  constructor(
    private readonly engine: ShimejiEngine,
    private readonly zIndex: number
  ) {}

  attach() {
    const h = document.createElement("div");
    h.setAttribute("aria-hidden", "true");
    h.dataset.shimeji = "hotspot";
    Object.assign(h.style, {
      position: "fixed",
      display: "none",
      zIndex: String(this.zIndex + 1),
      cursor: "grab",
      touchAction: "none",
      background: "transparent",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(h);
    this.hotspot = h;

    const cap = { capture: true } as const;
    window.addEventListener("pointermove", this.onMove, { capture: true, passive: true });
    window.addEventListener("pointerdown", this.onDown, cap);
    window.addEventListener("pointerup", this.onUp, cap);
    window.addEventListener("pointercancel", this.onUp, cap);
    window.addEventListener("click", this.onClick, cap);
    window.addEventListener("touchstart", this.onTouch, { capture: true, passive: false });
    window.addEventListener("touchmove", this.onTouch, { capture: true, passive: false });
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    window.removeEventListener("pointermove", this.onMove, true);
    window.removeEventListener("pointerdown", this.onDown, true);
    window.removeEventListener("pointerup", this.onUp, true);
    window.removeEventListener("pointercancel", this.onUp, true);
    window.removeEventListener("click", this.onClick, true);
    window.removeEventListener("touchstart", this.onTouch, true);
    window.removeEventListener("touchmove", this.onTouch, true);
    window.removeEventListener("blur", this.onBlur);
    this.hotspot?.remove();
    this.hotspot = null;
  }

  /** Called by the engine after each render so the hover hotspot tracks a moving mascot. */
  refreshHover(cssX: number | null, cssY: number | null) {
    if (this.dragged || cssX === null || cssY === null) return;
    this.updateHover(cssX, cssY);
  }

  private lastMouse: { x: number; y: number } | null = null;
  get lastMousePosition() {
    return this.lastMouse;
  }

  private onMove = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    this.engine.env.setCursor(e.clientX, e.clientY);
    if (e.pointerType === "mouse") {
      this.lastMouse = { x: e.clientX, y: e.clientY };
      if (!this.dragged) this.updateHover(e.clientX, e.clientY);
    }
  };

  private onDown = (e: PointerEvent) => {
    if (!e.isPrimary || this.dragged) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const m = this.engine.hitTest(e.clientX, e.clientY);
    if (!m || !m.behavior) return;

    // Claim this gesture: the page underneath must not see it.
    e.preventDefault();
    e.stopPropagation();
    this.dragged = m;
    this.pointerId = e.pointerId;
    this.suppressClick = true;
    this.claimTouch = e.pointerType !== "mouse";
    this.engine.env.setCursor(e.clientX, e.clientY, true);
    m.behavior.mousePressed();
    this.setDragCursor(true);
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const m = this.dragged;
    this.dragged = null;
    this.pointerId = null;
    this.claimTouch = false;
    this.setDragCursor(false);
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "pointerup") this.engine.env.setCursor(e.clientX, e.clientY);
    // Throw with the cursor velocity of the last tick (投げられる uses cursor.dx/dy).
    if (m && this.engine.mascots.includes(m)) m.behavior?.mouseReleased();
    window.setTimeout(() => (this.suppressClick = false), 0);
  };

  private onClick = (e: MouseEvent) => {
    if (!this.suppressClick) return;
    this.suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  };

  private onTouch = (e: TouchEvent) => {
    if (this.claimTouch && e.cancelable) e.preventDefault();
  };

  private onBlur = () => {
    if (!this.dragged) return;
    const m = this.dragged;
    this.dragged = null;
    this.pointerId = null;
    this.claimTouch = false;
    this.setDragCursor(false);
    m.behavior?.mouseReleased();
  };

  private updateHover(x: number, y: number) {
    const h = this.hotspot;
    if (!h) return;
    const m = this.engine.hitTest(x, y);
    const box = m ? this.engine.cssBox(m) : null;
    if (!box) {
      if (h.style.display !== "none") h.style.display = "none";
      return;
    }
    Object.assign(h.style, {
      display: "block",
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.size}px`,
      height: `${box.size}px`,
      inset: "",
    });
  }

  /** While dragging, a full-viewport hotspot shows "grabbing" and shields hover effects. */
  private setDragCursor(on: boolean) {
    const h = this.hotspot;
    if (!h) return;
    if (on) {
      Object.assign(h.style, {
        display: "block",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        cursor: "grabbing",
      });
    } else {
      Object.assign(h.style, { display: "none", cursor: "grab" });
    }
  }
}
