/**
 * Port of com.group_finity.mascot.action.{ComplexAction, Sequence, Select}.
 */
import type { VariableMap } from "../expr";
import type { Mascot } from "../Mascot";
import { ActionBase } from "./base";

export abstract class ComplexAction extends ActionBase {
  protected index = 0;

  constructor(
    vars: VariableMap,
    readonly children: readonly ActionBase[]
  ) {
    super(vars);
  }

  protected get current(): ActionBase | undefined {
    return this.children[this.index];
  }

  override init(m: Mascot) {
    super.init(m);
    this.index = this.children.length;
    if (super.hasNext()) {
      this.setIndex(0);
      this.seek();
    }
  }

  protected setIndex(i: number) {
    this.index = i;
    if (i < this.children.length) this.children[i].init(this.mascot);
  }

  /** Skip children that are not runnable (condition false / zero length). */
  protected seek() {
    if (!super.hasNext()) return;
    while (this.index < this.children.length) {
      if (this.children[this.index].hasNext()) break;
      this.setIndex(this.index + 1);
    }
  }

  override hasNext() {
    const c = this.current;
    return super.hasNext() && c !== undefined && c.hasNext();
  }

  protected tick() {
    const c = this.current;
    if (c?.hasNext()) c.next();
    this.seek();
  }
}

/** 複合 – run children in order; 繰り返し = loop. */
export class Sequence extends ComplexAction {
  constructor(
    vars: VariableMap,
    children: readonly ActionBase[],
    private readonly loop: boolean
  ) {
    super(vars, children);
  }

  protected override setIndex(i: number) {
    super.setIndex(this.loop && this.children.length > 0 ? i % this.children.length : i);
  }

  protected override seek() {
    if (!this.loop) return super.seek();
    // Looping sequence: give up after one full lap of non-runnable children.
    for (let guard = 0; guard <= this.children.length; guard++) {
      const c = this.current;
      if (!c || c.hasNext()) return;
      this.setIndex(this.index + 1);
    }
    this.index = this.children.length;
  }
}

/** 選択 – run only the first child that is runnable at initialisation. */
export class Select extends ComplexAction {
  protected override tick() {
    const c = this.current;
    if (c?.hasNext()) c.next();
  }
}
