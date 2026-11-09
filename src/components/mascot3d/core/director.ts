import type { Act, Outfit } from "./config";
import { GROUND_Y, INVERTED_Y, type MascotStage } from "./stage";

export type StationId = "hero" | "about" | "experience" | "skills" | "projects";
export const ORDER: StationId[] = ["hero", "about", "experience", "skills", "projects"];

type P = { x: number; y: number };

export interface Station {
  id: StationId;
  /** element he sleeps on / hangs beside / crawls under / cooks on / stands on */
  spot: () => Element | null;
  outfit: Outfit;
  act: Act;
  /** yaw in degrees (0 = facing the visitor, 90 = facing right) */
  facing: number;
  /** where his feet go, in viewport px */
  ground: (spot: DOMRect) => P;
  inverted?: boolean;
  /** silk-line anchor while at this station */
  line?: (spot: DOMRect, section: DOMRect) => P | null;
  /** crawl back and forth along the spot */
  patrol?: boolean;
}

export interface DirectorUI {
  /** fixed-position box holding the canvas */
  box: HTMLElement;
  /** <line> in a full-viewport fixed <svg> */
  line: SVGLineElement;
  onState?: (s: { at: StationId; busy: boolean; outfit: Outfit }) => void;
  /** floating "z z z", positioned at his head while he sleeps on the hero */
  zzz?: HTMLElement | null;
  /** speech bubble, positioned above his head */
  bubble?: HTMLElement | null;
  say?: (text: string | null) => void;
}

export interface DirectorOptions {
  size: number;
  reduced: boolean;
  /** "upright": lean the body toward the flight path; "horizontal": the fly clip is already horizontal */
  flyPose?: "upright" | "horizontal";
}

const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t,
  sine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};
const bez = (a: P, c: P, b: P, t: number): P => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Director {
  private at = 0;
  private busy = false;
  private pending = false;
  private p: P = { x: -999, y: -999 };
  private anchorY = GROUND_Y;
  private travelling = false;
  /** live point he stays glued to while a beat plays in place */
  private hold: (() => P) | null = null;
  private lineAnchor: (() => P | null) | null = null;
  private dir: "up" | "down" = "down";
  private lastY = 0;
  private lastScroll = 0;
  private jumped = false;
  private idle = 0;
  private raf = 0;
  private patrolX = 0;
  private patrolDir = 1;
  private outfit: Outfit = "default";
  private alive = true;
  private lastFrame = performance.now();

  constructor(
    private stage: MascotStage,
    private stations: Station[],
    private ui: DirectorUI,
    private o: DirectorOptions,
  ) {
    this.lastY = window.scrollY;
    addEventListener("scroll", this.onScroll, { passive: true });
    addEventListener("resize", this.onResize);
    this.loop();
  }

  /** Put him on the hero (or wherever the page was reloaded to) without travelling. */
  async begin() {
    const want = this.visibleIndex();
    const st = this.stations[want];
    this.at = want;
    this.applyStation(st, true);
    await this.stage.setOutfit(st.outfit, true);
    await this.stage.play(st.act, 0);
    this.emit();
  }

  /** Click on the sleeping hero: a quiet wave, then back to sleep. */
  async greet() {
    if (this.busy || ORDER[this.at] !== "hero") return false;
    await this.run(async () => {
      this.ui.say?.("Hey! 👋");
      await this.stage.play("wake", 0.4);
      this.stage.setFacing(0);
      await this.stage.play("greet", 0.3);
      await sleep(400);
      this.ui.say?.(null);
      this.stage.setFacing(this.stations[0].facing);
      await this.stage.play("sleep", 0.6);
    });
    return true;
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    removeEventListener("scroll", this.onScroll);
    removeEventListener("resize", this.onResize);
    clearTimeout(this.idle);
  }

  /* ------------------------------------------------------------ */
  /*  Scroll logic                                                  */
  /* ------------------------------------------------------------ */
  private onScroll = () => {
    const y = window.scrollY;
    const d = y - this.lastY;
    if (Math.abs(d) > 2) this.dir = d > 0 ? "down" : "up";
    if (Math.abs(d) > window.innerHeight * 0.9) this.jumped = true; // nav click / page-down spam
    this.lastY = y;
    this.lastScroll = performance.now();
    this.evaluate();
    clearTimeout(this.idle);
    this.idle = window.setTimeout(() => this.evaluate(), 240);
  };

  private onResize = () => this.evaluate();

  private visibleIndex() {
    const mid = window.innerHeight * 0.5;
    if (window.scrollY < window.innerHeight * 0.25) return 0;
    let best = 0;
    this.stations.forEach((st, i) => {
      const sec = this.sectionOf(st);
      if (!sec) return;
      const r = sec.getBoundingClientRect();
      if (r.top <= mid) best = i;
    });
    return best;
  }

  private evaluate() {
    if (!this.alive) return;
    if (this.busy) {
      this.pending = true;
      return;
    }
    const want = this.visibleIndex();
    const at = this.at;
    const settled = performance.now() - this.lastScroll > 220;

    // first scroll down wakes him on the hero
    if (at === 0 && this.dir === "down" && window.scrollY > 30 && want <= 1 && !this.jumped) {
      void this.run(() => this.down(0));
      return;
    }
    if (want === at) {
      this.jumped = false;
      return;
    }
    // continuous scroll down into the next section: scripted beat
    if (this.dir === "down" && want === at + 1 && !this.jumped) {
      void this.run(() => this.down(at));
      return;
    }
    // he's already ahead of a slow scroller: wait for them
    if (this.dir === "down" && want < at && !this.jumped) return;
    // anything else (scrolling up, skipping sections, uneven scrolling): fly once it settles
    if (settled) void this.run(() => this.fly(want));
  }

  private async run(fn: () => Promise<void>) {
    const st = this.stations[this.at];
    this.hold = () => this.groundOf(st);
    this.busy = true;
    this.jumped = false;
    this.emit();
    try {
      await fn();
    } finally {
      this.busy = false;
      this.emit();
      // re-check: the visitor may have kept scrolling while he was busy
      this.pending = false;
      setTimeout(() => this.evaluate(), 60);
    }
  }

  /* ------------------------------------------------------------ */
  /*  Beats                                                         */
  /* ------------------------------------------------------------ */
  private async down(from: number) {
    const next = this.stations[from + 1];
    const cur = this.stations[from];
    switch (cur.id) {
      case "hero": {
        // wake, mask on, jump off, shoot a line back to the name, swing into About
        await this.stage.play("wake", 0.4);
        this.stage.setFacing(20);
        await this.setOutfit("vigilante");
        void this.stage.play("jump", 0.2);
        const hop = { x: this.p.x + 40, y: this.p.y - 70 };
        await this.travel(() => hop, 380, "line", ease.out);
        this.stage.setShadow(false);
        // the line hooks onto the end of the name he was sleeping on
        this.lineAnchor = () => {
          const r = this.spotRect(cur);
          return r ? { x: r.right - 6, y: r.top + 6 } : null;
        };
        void this.stage.play("swing", 0.25);
        this.stage.setFacing(70);
        await this.travel(() => this.groundOf(next), 1500, "swing", ease.sine, () => this.lineAnchor?.() ?? null);
        this.lineAnchor = null;
        await sleep(60);
        this.arrive(next);
        await this.stage.play(next.act, 0.35);
        return;
      }
      case "about": {
        // let go, drop onto the bar, roll underneath and crawl
        this.lineAnchor = null;
        void this.stage.play("fall", 0.2);
        const bar = () => {
          const r = this.spotRect(next);
          return r ? { x: r.left + r.width * 0.25, y: r.top } : this.p;
        };
        await this.travel(bar, 800, "arc", ease.in);
        this.stage.setShadow(true);
        await this.stage.play("land", 0.15);
        // swing under the bar
        this.stage.setShadow(false);
        this.stage.setTilt(180);
        await this.travel(() => {
          const r = this.spotRect(next);
          return r ? { x: r.left + r.width * 0.25, y: r.bottom } : this.p;
        }, 520, "line", ease.inOut, null, INVERTED_Y);
        this.patrolX = -(this.spotRect(next)?.width ?? 0) * 0.25;
        this.arrive(next);
        await this.stage.play(next.act, 0.3);
        return;
      }
      case "experience": {
        // wake from the crawl, mask off, goggles + apron on, drop onto the skills card
        this.stage.setTilt(0);
        void this.stage.play("fall", 0.25);
        const x0 = this.p.x;
        await this.travel(() => {
          const r = this.spotRect(cur);
          return r ? { x: x0, y: r.bottom + 40 } : { x: x0, y: this.p.y };
        }, 360, "line", ease.out, null, GROUND_Y);
        await this.setOutfit("default");
        await this.setOutfit("chemist");
        await this.travel(() => this.groundOf(next), 850, "arc", ease.in);
        this.stage.setShadow(true);
        await this.stage.play("land", 0.15);
        this.arrive(next);
        await this.stage.play(next.act, 0.35);
        return;
      }
      case "skills": {
        // gear off, fedora on, hop up onto the Works heading, proud
        await this.setOutfit("default");
        await this.setOutfit("fedora");
        void this.stage.play("jump", 0.2);
        this.stage.setShadow(false);
        await this.travel(() => this.groundOf(next), 1100, "arc", ease.inOut);
        this.stage.setShadow(true);
        await this.stage.play("land", 0.15);
        this.arrive(next);
        await this.stage.play(next.act, 0.35);
        return;
      }
      default:
        return;
    }
  }

  /** Jet flight to any station (scrolling up, skipped sections, uneven scrolling). */
  private async fly(to: number) {
    const st = this.stations[to];
    const reduced = this.o.reduced;
    this.lineAnchor = null;
    if (!reduced) {
      this.stage.setTilt(0);
      await this.setOutfit("jet");
      this.stage.setShadow(false);
      void this.stage.play("takeoff", 0.2);
      const lift = { x: this.p.x, y: this.p.y - 50 };
      await this.travel(() => lift, 320, "line", ease.out);
      void this.stage.play("fly", 0.25);
      const target = () => this.groundOf(st);
      const start = { ...this.p };
      const dist = Math.hypot(target().x - start.x, target().y - start.y);
      await this.travel(target, Math.min(2200, Math.max(900, dist * 1.3)), "arc", ease.inOut, null, undefined, true);
      this.stage.setTilt(0);
      this.stage.setShadow(true);
      await this.stage.play("touchdown", 0.2);
    }
    await this.setOutfit(st.outfit);
    this.arrive(st);
    if (st.inverted) {
      this.stage.setTilt(180);
      this.anchorY = INVERTED_Y;
    }
    await this.stage.play(st.act, 0.4);
  }

  /* ------------------------------------------------------------ */
  /*  Movement                                                      */
  /* ------------------------------------------------------------ */
  private sectionOf(st: Station) {
    return st.spot()?.closest("section") ?? st.spot();
  }

  private spotRect(st: Station) {
    const el = st.spot();
    return el && el.getClientRects().length ? el.getBoundingClientRect() : null;
  }

  private groundOf(st: Station): P {
    const r = this.spotRect(st);
    if (!r) return this.p;
    return st.ground(r);
  }

  private arrive(st: Station) {
    this.hold = null;
    this.at = ORDER.indexOf(st.id);
    this.applyStation(st, false);
    this.emit();
  }

  private applyStation(st: Station, instant: boolean) {
    this.travelling = false;
    this.anchorY = st.inverted ? INVERTED_Y : GROUND_Y;
    this.stage.setTilt(st.inverted ? 180 : 0, instant);
    this.stage.setFacing(st.facing, instant);
    this.stage.setShadow(!st.inverted && st.id !== "about");
    const sec = this.sectionOf(st);
    this.lineAnchor = st.line
      ? () => {
          const r = this.spotRect(st);
          const s = sec?.getBoundingClientRect();
          return r && s ? st.line!(r, s) : null;
        }
      : null;
    if (!st.patrol) this.patrolX = 0;
    this.p = this.groundOf(st);
  }

  private async setOutfit(o: Outfit) {
    this.outfit = o;
    this.emit();
    await this.stage.setOutfit(o);
  }

  /**
   * Moves the feet point from where it is to a live target.
   * "swing" hangs from the current silk-line anchor like a pendulum.
   */
  private travel(
    target: () => P,
    ms: number,
    kind: "line" | "arc" | "swing",
    e: (t: number) => number,
    pivot: (() => P | null) | null = null,
    toAnchorY?: number,
    lean = false,
  ) {
    const from = { ...this.p };
    const fromAY = this.anchorY;
    if (this.o.reduced) ms = 0;
    this.travelling = true;
    return new Promise<void>((res) => {
      const t0 = performance.now();
      const step = () => {
        if (!this.alive) return res();
        const k = ms ? Math.min(1, (performance.now() - t0) / ms) : 1;
        const t = e(k);
        const to = target();
        let c: P;
        if (kind === "line") c = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        else if (kind === "arc") c = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - Math.max(80, Math.abs(to.x - from.x) * 0.35) };
        else {
          const pv = pivot?.() ?? { x: (from.x + to.x) / 2, y: from.y };
          c = { x: pv.x + (to.x - from.x) * 0.15, y: Math.max(from.y, to.y) + Math.abs(to.x - from.x) * 0.25 + 60 };
        }
        const prev = this.p;
        this.p = bez(from, c, to, t);
        if (toAnchorY !== undefined) this.anchorY = fromAY + (toAnchorY - fromAY) * t;
        const dx = this.p.x - prev.x, dy = this.p.y - prev.y;
        if (Math.abs(dx) > 0.5) this.stage.setFacing(dx > 0 ? 90 : -90);
        if (lean && (this.o.flyPose ?? "upright") === "upright" && Math.hypot(dx, dy) > 0.5) {
          // head points along the flight path (screen-plane tilt)
          const ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
          this.stage.setTilt(-Math.max(-75, Math.min(75, ang)));
        }
        if (k < 1) requestAnimationFrame(step);
        else {
          this.travelling = false;
          this.hold = target;
          res();
        }
      };
      step();
    });
  }

  /* ------------------------------------------------------------ */
  /*  Frame                                                         */
  /* ------------------------------------------------------------ */
  private loop() {
    const tick = () => {
      if (!this.alive) return;
      this.raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      const st = this.stations[this.at];
      if (!this.travelling && !this.busy) {
        this.p = this.groundOf(st);
        if (st.patrol) {
          const r = this.spotRect(st);
          if (r) {
            const half = r.width * 0.38;
            this.patrolX += this.patrolDir * 55 * dt * (this.o.reduced ? 0 : 1);
            if (this.patrolX > half) this.patrolDir = -1;
            if (this.patrolX < -half) this.patrolDir = 1;
            this.p = { x: this.p.x + this.patrolX, y: this.p.y };
            // upside down, the facing that walks right is mirrored
            const right = this.patrolDir > 0;
            this.stage.setFacing((right ? 90 : -90) * (st.inverted ? -1 : 1));
          }
        }
      } else if (!this.travelling && this.busy && this.hold) {
        // beats that play in place keep following the page as it scrolls
        this.p = this.hold();
      }
      const size = this.o.size;
      this.ui.box.style.transform = `translate3d(${(this.p.x - size / 2).toFixed(1)}px, ${(this.p.y - this.anchorY * size).toFixed(1)}px, 0)`;

      const bx0 = this.p.x - size / 2, by0 = this.p.y - this.anchorY * size;
      const head = this.ui.zzz || this.ui.bubble ? this.stage.point("head") : null;
      if (this.ui.zzz) {
        const show = this.at === 0 && !this.busy && !!head;
        this.ui.zzz.style.opacity = show ? "1" : "0";
        if (head) this.ui.zzz.style.transform = `translate3d(${bx0 + head.x + 8}px, ${by0 + head.y - 26}px, 0)`;
      }
      if (this.ui.bubble && head) {
        this.ui.bubble.style.transform = `translate3d(${bx0 + head.x + 14}px, ${by0 + head.y - 34}px, 0) translateY(-100%)`;
      }
      const a = this.lineAnchor?.();
      const hand = a ? this.stage.point("handR") : null;
      if (a && hand) {
        const bx = this.p.x - size / 2, by = this.p.y - this.anchorY * size;
        this.ui.line.setAttribute("x1", String(a.x));
        this.ui.line.setAttribute("y1", String(a.y));
        this.ui.line.setAttribute("x2", String(bx + hand.x));
        this.ui.line.setAttribute("y2", String(by + hand.y));
        this.ui.line.style.opacity = "1";
      } else this.ui.line.style.opacity = "0";
    };
    this.raf = requestAnimationFrame(tick);
  }

  private emit() {
    this.ui.onState?.({ at: ORDER[this.at], busy: this.busy, outfit: this.outfit });
  }
}
