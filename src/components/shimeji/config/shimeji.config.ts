/**
 * Browser-side settings that have no equivalent in the original XML
 * (or that replace hard-coded desktop values).
 */
export interface ShimejiSettings {
  /** Public folder holding shime1.png … shime46.png. */
  imageBasePath: string;
  imageCount: number;
  /** Native sprite size (all original sprites are 128×128). */
  imageSize: number;
  /** Simulation step. The original Manager ticks every 40 ms – keep it. */
  tickMs: number;
  /** Mascots created on mount. */
  initialCount: number;
  /** Replaces the original `totalCount < 50` breeding cap. */
  maxMascots: number;
  /**
   * CSS px per world px. The XML uses absolute desktop pixel values
   * (e.g. "workArea.right - 400"), so small screens get a smaller scale
   * instead of rewriting the numbers.
   */
  scale: (viewportWidth: number) => number;
  /** Stacking order of the overlay canvas. */
  zIndex: number;
  /** Elements that act like the original's "active IE window". null = none. */
  surfaceSelector: string | null;
  /** Let Spider-Man pick up and throw surface elements (moves page content!). */
  allowSurfaceThrowing: boolean;
  /** Alpha (0-255) above which a sprite pixel can be grabbed. */
  hitAlphaThreshold: number;
  /** Do not mount at all when the user prefers reduced motion. */
  respectReducedMotion: boolean;
}

export const SHIMEJI_CONFIG: ShimejiSettings = {
  imageBasePath: "/shimeji/spiderman/",
  imageCount: 46,
  imageSize: 128,
  tickMs: 40,
  initialCount: 1,
  maxMascots: 5,
  scale: (w) => (w < 640 ? 0.6 : w < 1024 ? 0.8 : 1),
  zIndex: 60,
  surfaceSelector: "[data-shimeji-surface]",
  allowSurfaceThrowing: false,
  hitAlphaThreshold: 24,
  respectReducedMotion: true,
};
