import type { ActionDef, BehaviorDef } from "../engine/types";
import { ACTIONS } from "./actions";
import { BEHAVIORS } from "./behaviors";
import { HEISENBERG } from "./heisenberg";

export interface CharacterDef {
  imageBasePath: string;
  imageExt: string;
  imageCount: number;
  imageSize: number;
  anchorOffset: { x: number; y: number };
  actions: Readonly<Record<string, ActionDef>>;
  behaviors: readonly BehaviorDef[];
  /** Overrides the global mascot cap (e.g. no cloning). */
  maxMascots?: number;
}

export const CHARACTERS = {
  /** The original Shimeji Spider-Man set, ported 1:1 from the XML. */
  spiderman: {
    imageBasePath: "/shimeji/spiderman/",
    imageExt: "png",
    imageCount: 46,
    imageSize: 128,
    anchorOffset: { x: 0, y: 0 },
    actions: ACTIONS,
    behaviors: BEHAVIORS,
  },
  heisenberg: HEISENBERG,
} satisfies Record<string, CharacterDef>;

export type CharacterName = keyof typeof CHARACTERS;
