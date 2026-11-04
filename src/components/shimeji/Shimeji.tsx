"use client";

import { useEffect } from "react";
import { type CharacterDef, CHARACTERS, type CharacterName } from "./config/characters";
import { SHIMEJI_CONFIG, type ShimejiSettings } from "./config/shimeji.config";
import { type ShimejiCommand, ShimejiEngine } from "./engine/ShimejiEngine";

type Props = Partial<Omit<ShimejiSettings, "scale">> & {
  /** Which sprite set + behavior config to run. */
  character?: CharacterName;
};

/**
 * Mounts the ported Shimeji engine as a fixed, click-through overlay.
 * Renders nothing into the React tree; the engine owns its own canvas.
 *
 * Commands from the original tray menu can be sent from anywhere:
 *   window.dispatchEvent(new CustomEvent("shimeji:command", { detail: "gather" }))
 *   detail: "spawn" | "gather" | "reduce" | "dismiss" | "restore"
 */
export default function Shimeji({ character = "heisenberg", ...overrides }: Props) {
  useEffect(() => {
    const settings: ShimejiSettings = { ...SHIMEJI_CONFIG, ...overrides };
    if (settings.respectReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const def: CharacterDef = CHARACTERS[character];
    const engine = new ShimejiEngine({
      ...settings,
      ...def,
      maxMascots: Math.min(settings.maxMascots, def.maxMascots ?? Infinity),
    });

    // Start when the browser is idle so the sprites never compete with page load.
    // Call through `window` – detached references throw "Illegal invocation".
    const hasIdle = typeof window.requestIdleCallback === "function";
    const startEngine = () => {
      engine.start().catch((e) => console.warn("[shimeji] failed to start", e));
    };
    const handle = hasIdle
      ? window.requestIdleCallback(startEngine, { timeout: 2000 })
      : window.setTimeout(startEngine, 300);
    const cancelStart = () =>
      hasIdle ? window.cancelIdleCallback(handle) : window.clearTimeout(handle);

    const onCommand = (e: Event) => {
      const cmd = (e as CustomEvent<ShimejiCommand>).detail;
      if (cmd) engine.command(cmd);
    };
    window.addEventListener("shimeji:command", onCommand);

    return () => {
      cancelStart();
      window.removeEventListener("shimeji:command", onCommand);
      engine.destroy();
    };
    // Settings are read once on mount, like the original's config loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  return null;
}
