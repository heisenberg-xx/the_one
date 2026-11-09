"use client";
import { useEffect, useRef, useState } from "react";
import type { Act, MascotConfig } from "./core/config";
import type { Director, StationId } from "./core/director";
import { useReducedMotion } from "./useReducedMotion";

interface Props {
  modelUrl?: string;
  /** per-act animation GLBs sharing the model's skeleton */
  animationUrls?: Partial<Record<Act, string>>;
  /** static image shown on the hero if WebGL or the model fails */
  posterUrl?: string;
  size?: number;
  mobileSize?: number;
  flyPose?: "upright" | "horizontal";
  /** log clip resolution + state changes to the console */
  debug?: boolean;
}

/**
 * One mascot for the whole page. Mount once (e.g. at the end of <main>) and mark the
 * page with data-mascot-spot="hero|about|experience|skills|projects".
 */
export default function PortfolioMascot({
  modelUrl = "/mascot/rajesh.glb",
  animationUrls,
  posterUrl = "/mascot/poster-sleep.png",
  size = 260,
  mobileSize = 170,
  flyPose = "upright",
  debug = false,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const line = useRef<SVGLineElement>(null);
  const zzz = useRef<HTMLDivElement>(null);
  const bubbleEl = useRef<HTMLDivElement>(null);
  const director = useRef<Director | null>(null);
  const [px, setPx] = useState(size);
  const [bubble, setBubble] = useState<string | null>(null);
  const [at, setAt] = useState<StationId>("hero");
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  // stable key so an inline object prop doesn't rebuild the scene every render
  const animKey = JSON.stringify(animationUrls ?? {});

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setPx(mq.matches ? size : mobileSize);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [size, mobileSize]);

  useEffect(() => {
    let alive = true;
    let stage: import("./core/stage").MascotStage | null = null;
    let dir: Director | null = null;
    const start = async () => {
      try {
        // three.js + the rig load after first paint, never blocking the page
        const [{ MascotStage }, { Director }, { defaultStations }] = await Promise.all([
          import("./core/stage"), import("./core/director"), import("./core/stations"),
        ]);
        if (!alive || !host.current || !box.current || !line.current) return;
        stage = new MascotStage(host.current);
        stage.setReducedMotion(reduced);
        const cfg: MascotConfig = { modelUrl, animationUrls: JSON.parse(animKey), posterUrl };
        const { clips } = await stage.load(cfg);
        if (debug) console.info("[mascot] clips in model:", clips);
        if (!alive) return;
        dir = new Director(stage, defaultStations(), {
          box: box.current, line: line.current, zzz: zzz.current, bubble: bubbleEl.current,
          say: setBubble,
          onState: (s) => {
            setAt(s.at);
            setBusy(s.busy);
            if (debug) console.info("[mascot]", s);
          },
        }, { size: px, reduced, flyPose });
        director.current = dir;
        await dir.begin();
        setReady(true);
      } catch (e) {
        console.warn("[mascot] falling back to poster:", e);
        if (alive) setFailed(true);
      }
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = ric ? ric(() => void start()) : window.setTimeout(() => void start(), 200);
    return () => {
      alive = false;
      if (!ric) clearTimeout(id);
      dir?.destroy();
      stage?.destroy();
      director.current = null;
      setReady(false);
    };
  }, [modelUrl, animKey, posterUrl, px, reduced, flyPose, debug]);

  // Poster fallback sits on the hero word itself
  useEffect(() => {
    if (!failed) return;
    const spot = document.querySelector<HTMLElement>('[data-mascot-spot="hero"]');
    if (!spot) return;
    const img = document.createElement("img");
    img.src = posterUrl;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.style.cssText = "position:absolute;left:50%;bottom:86%;width:1.9em;transform:translateX(-50%);pointer-events:none";
    img.onerror = () => img.remove();
    if (getComputedStyle(spot).position === "static") spot.style.position = "relative";
    spot.appendChild(img);
    return () => img.remove();
  }, [failed, posterUrl]);

  const sleeping = ready && at === "hero" && !busy;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <line ref={line} stroke="rgba(226,232,240,.85)" strokeWidth={1.2} strokeLinecap="round" style={{ opacity: 0 }} />
      </svg>
      <div
        ref={box}
        className="absolute left-0 top-0 will-change-transform transition-opacity duration-500"
        style={{ width: px, height: px, opacity: ready ? 1 : 0 }}
      >
        <div ref={host} className="absolute inset-0" />
        <button
          type="button"
          aria-label="Wake up the sleeping mascot"
          aria-disabled={!sleeping}
          tabIndex={sleeping ? 0 : -1}
          onClick={() => void director.current?.greet()}
          className="absolute left-[18%] right-[18%] top-[62%] bottom-[8%] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          style={{ pointerEvents: sleeping ? "auto" : "none", cursor: sleeping ? "pointer" : "default" }}
        />
      </div>
      <div ref={zzz} aria-hidden className="absolute left-0 top-0 text-primary/80 transition-opacity duration-300" style={{ opacity: 0 }}>
        {!reduced ? (
          <>
            <span className="mascot-z" style={{ animationDelay: "0s" }}>z</span>
            <span className="mascot-z" style={{ animationDelay: "1.05s", fontSize: "1.2em" }}>z</span>
            <span className="mascot-z" style={{ animationDelay: "2.1s", fontSize: "1.45em" }}>z</span>
          </>
        ) : (
          <span>z</span>
        )}
      </div>
      <div
        ref={bubbleEl}
        aria-hidden
        className="absolute left-0 top-0 whitespace-nowrap rounded-xl rounded-bl-sm border border-primary/30 bg-background/85 px-3 py-1.5 text-sm text-primary shadow-lg backdrop-blur transition-opacity duration-200"
        style={{ opacity: bubble ? 1 : 0 }}
      >
        {bubble}
      </div>
      <span className="sr-only" aria-live="polite">{bubble ? `The mascot says ${bubble}` : ""}</span>
      <style>{`
        .mascot-z{position:absolute;opacity:0;animation:mascot-z 3.2s ease-out infinite}
        @keyframes mascot-z{0%{opacity:0;transform:translate(0,0)}30%{opacity:.9}100%{opacity:0;transform:translate(1.2em,-2.6em)}}
      `}</style>
    </div>
  );
}
