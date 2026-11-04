/**
 * Browser-readable form of the original XML configuration
 * (conf/動作.xml = actions, conf/行動.xml = behaviors).
 */
import type { Expr, Params } from "./expr";

/** [image number, anchorX, anchorY, velocityX, velocityY, duration (ticks)] */
export type PoseDef = readonly [number, number, number, number, number, number];

export interface AnimationDef {
  /** 条件 */
  condition?: Expr<boolean>;
  poses: readonly PoseDef[];
}

/** 枠 */
export type BorderType = "floor" | "wall" | "ceiling";

/** クラス – built-in Java action classes (com.group_finity.mascot.action.*) */
export type BuiltinClass =
  | "Look"
  | "Offset"
  | "Fall"
  | "Jump"
  | "Dragged"
  | "Regist"
  | "Breed"
  | "FallWithIE"
  | "WalkWithIE"
  | "ThrowIE";

/**
 * 種類:
 *  静止 stay, 移動 move, 固定 animate, 組み込み builtin, 複合 sequence, 選択 select
 */
export type ActionDef =
  | {
      type: "stay" | "move" | "animate";
      border?: BorderType;
      animations: readonly AnimationDef[];
      params?: Params;
    }
  | {
      type: "builtin";
      class: BuiltinClass;
      border?: BorderType;
      animations?: readonly AnimationDef[];
      params?: Params;
    }
  | { type: "sequence"; loop?: boolean; actions: readonly ActionNode[]; params?: Params }
  | { type: "select"; actions: readonly ActionNode[]; params?: Params };

/** 動作参照 – reference to a named action with parameter overrides */
export interface ActionRef {
  ref: string;
  params?: Params;
}

export type ActionNode = ActionRef | ActionDef;

/** 行動参照 inside 次の行動リスト */
export interface NextBehaviorRef {
  name: string;
  frequency: number;
  condition?: Expr<boolean>;
}

/** 行動 */
export interface BehaviorDef {
  name: string;
  /** 頻度 – weight in the random selection; 0 = only reachable explicitly */
  frequency: number;
  /** 条件 – enclosing <条件> groups plus the behavior's own condition */
  conditions?: readonly Expr<boolean>[];
  /** 次の行動リスト; additive (追加) = also consider the global list */
  next?: { additive: boolean; list: readonly NextBehaviorRef[] };
}
