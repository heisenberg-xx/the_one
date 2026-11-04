/**
 * Port of the original Shimeji script variable system
 * (com.group_finity.mascot.script.{Variable, Constant, Script, VariableMap}).
 *
 * The XML configuration embeds Rhino JavaScript in two forms:
 *   ${ expr }  evaluated ONCE when the owning action is initialised (cached)
 *   #{ expr }  evaluated EVERY time the value is read (live)
 *
 * In the browser port the expressions are hand-translated into TypeScript
 * functions (no eval / new Function, CSP safe), wrapped with `once()` or `live()`
 * so the original evaluation semantics are preserved exactly.
 */
import type { Environment } from "./Environment";
import type { Mascot } from "./Mascot";

export interface ScriptContext {
  /** `mascot` in the original scripts */
  m: Mascot;
  /** `mascot.environment` in the original scripts */
  env: Environment;
  /** Other variables of the same action (e.g. 目的地Y, footX, ずれ) */
  v: Record<string, any>;
}

export type ScriptFn<T> = (c: ScriptContext) => T;

export class OnceExpr<T> {
  constructor(readonly fn: ScriptFn<T>) {}
}
export class LiveExpr<T> {
  constructor(readonly fn: ScriptFn<T>) {}
}

export type Expr<T = unknown> = T | OnceExpr<T> | LiveExpr<T>;
export type Params = Record<string, Expr<any>>;

/** `${ ... }` – evaluated once per action initialisation */
export const once = <T>(fn: ScriptFn<T>) => new OnceExpr<T>(fn);
/** `#{ ... }` – evaluated every time it is read */
export const live = <T>(fn: ScriptFn<T>) => new LiveExpr<T>(fn);

const isExpr = (x: unknown): x is OnceExpr<unknown> | LiveExpr<unknown> =>
  x instanceof OnceExpr || x instanceof LiveExpr;

/** Java `(int)` cast semantics: truncate toward zero, NaN -> 0. */
export const toInt = (x: unknown): number => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export class VariableMap {
  private readonly raw = new Map<string, Expr>();
  private readonly cache = new Map<string, unknown>();
  private readonly runtime = new Map<string, unknown>();
  private mascot: Mascot | null = null;
  private readonly proxy: Record<string, any>;

  constructor(params: Params = {}) {
    for (const [k, val] of Object.entries(params)) this.raw.set(k, val);
    this.proxy = new Proxy({} as Record<string, any>, {
      get: (_, key) => (typeof key === "string" ? this.get(key) : undefined),
    });
  }

  /** Called from ActionBase.init – clears `${}` caches like the original. */
  init(mascot: Mascot) {
    this.mascot = mascot;
    this.cache.clear();
    this.runtime.clear();
  }

  has(name: string) {
    return this.raw.has(name) || this.runtime.has(name);
  }

  /** Runtime variables put by built-in actions (e.g. Dragged puts footX). */
  put(name: string, value: unknown) {
    this.runtime.set(name, value);
  }

  get<T = any>(name: string, fallback?: T): T {
    if (this.runtime.has(name)) return this.runtime.get(name) as T;
    if (!this.raw.has(name)) return fallback as T;
    const val = this.raw.get(name);
    if (val instanceof OnceExpr) {
      if (!this.cache.has(name)) this.cache.set(name, this.run(val.fn));
      return this.cache.get(name) as T;
    }
    if (val instanceof LiveExpr) return this.run(val.fn) as T;
    return val as T;
  }

  /** Evaluate an expression that is not stored in the map (animation conditions). */
  evaluate<T>(e: Expr<T>): T {
    return isExpr(e) ? (this.run(e.fn) as T) : (e as T);
  }

  context(): ScriptContext {
    const m = this.mascot!;
    return { m, env: m.environment, v: this.proxy };
  }

  private run<T>(fn: ScriptFn<T>): T {
    return fn(this.context());
  }
}

/** Stand-alone evaluation (used by behavior selection, which only has `mascot`). */
export function evalWith<T>(e: Expr<T> | undefined, m: Mascot, fallback: T): T {
  if (e === undefined) return fallback;
  if (!isExpr(e)) return e as T;
  return e.fn({ m, env: m.environment, v: {} });
}
