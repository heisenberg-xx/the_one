/**
 * Replaces the original AWT/Swing per-mascot translucent windows
 * (com.group_finity.mascot.win.WindowsTranslucentWindow + image.MascotImage).
 *
 * One full-viewport, pointer-events:none canvas draws every mascot. Mirrored
 * images (lookRight) are produced at draw time instead of pre-flipped copies.
 * Each sprite's alpha channel is cached so hit-testing can be pixel-exact.
 */
import type { EffectSystem } from "./Effects";
import type { Mascot } from "./Mascot";

export interface RendererOptions {
  basePath: string;
  ext: string;
  imageCount: number;
  imageSize: number;
  zIndex: number;
  alphaThreshold: number;
}

export class SpriteRenderer {
  private readonly images: (HTMLImageElement | undefined)[] = [];
  private readonly alpha: (Uint8ClampedArray | undefined)[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  constructor(private readonly opts: RendererOptions) {}

  async load(): Promise<void> {
    const { basePath, ext, imageCount, imageSize } = this.opts;
    const scratch = document.createElement("canvas");
    scratch.width = scratch.height = imageSize;
    const sctx = scratch.getContext("2d", { willReadFrequently: true });

    await Promise.all(
      Array.from({ length: imageCount }, async (_, i) => {
        const n = i + 1;
        const img = new Image();
        img.decoding = "async";
        img.src = `${basePath}shime${n}.${ext}`;
        try {
          await img.decode();
        } catch {
          return; // missing sprite: render nothing for it
        }
        this.images[n] = img;
        if (sctx) {
          sctx.clearRect(0, 0, imageSize, imageSize);
          sctx.drawImage(img, 0, 0, imageSize, imageSize);
          const data = sctx.getImageData(0, 0, imageSize, imageSize).data;
          const a = new Uint8ClampedArray(imageSize * imageSize);
          for (let p = 0; p < a.length; p++) a[p] = data[p * 4 + 3];
          this.alpha[n] = a;
        }
      })
    );
  }

  mount() {
    const c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    c.dataset.shimeji = "canvas";
    Object.assign(c.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: String(this.opts.zIndex),
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(c);
    this.canvas = c;
    this.ctx = c.getContext("2d");
  }

  private resize() {
    const c = this.canvas;
    if (!c) return;
    const de = document.documentElement;
    const w = de.clientWidth;
    const h = de.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.cssW && h === this.cssH && dpr === this.dpr) return;
    this.cssW = w;
    this.cssH = h;
    this.dpr = dpr;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }

  render(mascots: readonly Mascot[], scale: number, effects?: EffectSystem) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.resize();
    const size = this.opts.imageSize;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.imageSmoothingQuality = "high";
    const d = size * scale;

    for (const m of mascots) {
      const b = m.bounds(size);
      const img = m.pose ? this.images[m.pose.image] : undefined;
      if (!b || !img) continue;
      const x = b.left * scale;
      const y = b.top * scale;
      if (x > this.cssW || y > this.cssH || x + d < 0 || y + d < 0) continue;
      if (m.lookRight) {
        ctx.save();
        ctx.translate(x + d, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, d, d);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, y, d, d);
      }
    }
    effects?.render(ctx, scale);
  }

  /** Top-most mascot with an opaque pixel under the CSS point, if any. */
  hitTest(cssX: number, cssY: number, mascots: readonly Mascot[], scale: number): Mascot | null {
    const size = this.opts.imageSize;
    for (let i = mascots.length - 1; i >= 0; i--) {
      const m = mascots[i];
      const b = m.bounds(size);
      if (!b || !m.pose) continue;
      let lx = Math.floor(cssX / scale - b.left);
      const ly = Math.floor(cssY / scale - b.top);
      if (lx < 0 || ly < 0 || lx >= size || ly >= size) continue;
      if (m.lookRight) lx = size - 1 - lx;
      const a = this.alpha[m.pose.image];
      if (a && a[ly * size + lx] > this.opts.alphaThreshold) return m;
    }
    return null;
  }

  /** CSS-pixel box of a mascot (used to place the hover cursor hotspot). */
  cssBox(m: Mascot, scale: number) {
    const b = m.bounds(this.opts.imageSize);
    if (!b) return null;
    return {
      left: b.left * scale,
      top: b.top * scale,
      size: this.opts.imageSize * scale,
    };
  }

  destroy() {
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }
}
