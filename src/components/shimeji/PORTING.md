# Shimeji → browser port (Spider-Man)

## What was in the archive

`src/8lvnztxu.zip` contains:

| Path | Content |
|---|---|
| `conf/動作.xml` | Action definitions: 46 actions, every pose, the embedded Rhino scripts |
| `conf/行動.xml` | Behavior definitions: weights, condition groups, next-behavior lists |
| `img/shime1–46.png` | 128×128 sprites, all facing left |
| `lib/jna.jar`, `lib/examples.jar` | JNA, the Java↔Win32 native bridge. **No Shimeji code.** |
| `ライセンス.txt` | zlib-style license, © 2009 Yuki Yamada (Shift-JIS) |

**The archive has no `.java` files and no `Shimeji.jar`.** The engine itself (`com.group_finity.mascot.*`) is missing. The behavior spec comes from the two XML files, which drive everything in Shimeji. The engine algorithms (tick loop, Fall/Jump physics, Dragged spring, border model, behavior selection) were reconstructed from the original group-finity Shimeji 1.0 engine that these configs target. All class names and constants below come from that engine.

## Original architecture → port

```
Main / Manager ───────── tick thread (40 ms) ──► Environment.tick() then Mascot.tick() ×N
   │                                                   │
Configuration ── ActionBuilder / BehaviorBuilder        ▼
   │  (parses XML, evaluates Rhino scripts)      UserBehavior.next()
   │                                              ├─ action.hasNext()? action.next()
   └─ buildNextBehavior(weighted random) ◄────────┤─ finished → Configuration.buildNextBehavior
                                                  ├─ LostGroundException → "落下する" (Fall)
                                                  └─ off-screen → respawn above screen
Action tree: Sequence/Select ─► Stay/Move/Animate (BorderedAction) / Fall / Jump / Dragged / …
   each tick: Animation.getPoseAt(time).next(mascot) → moves anchor, sets image
Environment: screen, workArea, activeIE (Areas with Floor/Ceiling/Wall borders), cursor
Win32 layer (JNA): translucent windows, IE window enumeration/moving, cursor polling
```

| Java (com.group_finity.mascot…) | Port (`src/components/shimeji/`) |
|---|---|
| `Main`, `Manager` | `engine/ShimejiEngine.ts` |
| `Mascot` | `engine/Mascot.ts` (state), `engine/SpriteRenderer.ts` (drawing) |
| `config.Configuration`, `ActionBuilder`, `BehaviorBuilder`, `ActionRef` | `engine/Behavior.ts` → `Configuration` |
| `behavior.UserBehavior` | `engine/Behavior.ts` → `UserBehavior` |
| `script.Variable/Constant/Script/VariableMap` | `engine/expr.ts` (`once()` = `${}`, `live()` = `#{}`) |
| `animation.Pose`, `Animation` | `engine/Animation.ts` |
| `action.ActionBase`, `BorderedAction`, `LostGroundException` | `engine/actions/base.ts` |
| `action.Stay`, `Move`, `Animate`, `Look`, `Offset` | `engine/actions/basic.ts` |
| `action.Fall`, `Jump` | `engine/actions/physics.ts` |
| `action.Dragged`, `Regist`, `Breed`, `FallWithIE`, `WalkWithIE`, `ThrowIE` | `engine/actions/special.ts` |
| `action.ComplexAction`, `Sequence`, `Select` | `engine/actions/complex.ts` |
| `environment.Area`, `FloorCeiling`, `Wall`, `NotOnBorder` | `engine/geometry.ts` |
| `environment.Environment`, `MascotEnvironment`, `win.WindowsEnvironment` | `engine/Environment.ts` |
| `win.WindowsTranslucentWindow`, `image.MascotImage` | `engine/SpriteRenderer.ts` |
| AWT `MouseListener` on each window | `engine/InteractionController.ts` |
| `conf/動作.xml` | `config/actions.ts` |
| `conf/行動.xml` | `config/behaviors.ts` |

## Conversion report

| Original Java functionality | Browser implementation | Status |
|---|---|---|
| Manager tick thread, `Thread.sleep(40)` | `requestAnimationFrame` with a fixed 40 ms accumulator (catch-up capped at 5 ticks; resets when the tab is hidden) | Preserved. Every tick-based duration and velocity is unchanged |
| Animation engine (Pose/Animation, mirroring for `lookRight`) | `Animation.ts`; mirroring at draw time | Preserved |
| Action types: 静止/移動/固定/組み込み/複合/選択 | Typed classes and an action factory | Preserved |
| Script variables `${}` (once) / `#{}` (live) | Hand-translated TS functions wrapped in `once()` / `live()`; no `eval` | Preserved semantics |
| Behavior selection (`buildNextBehavior`, 頻度 weights, 条件 groups, 次の行動リスト 追加) | `Configuration.buildNextBehavior` | Preserved |
| Gravity / air resistance (`Fall`) | `Fall` with mod accumulation and a 1 px swept move | Preserved. See note 1 |
| Jump arc (`Jump`, `distY − |distX|/2`) | `Jump` | Preserved |
| Border collision (`isOn` exact-equality model) | `geometry.ts` on integer world px | Preserved |
| Riding moving windows (`Border.move`) | Same algorithm; carries the mascot along a surface while the page scrolls, and along the floor on resize | Preserved, re-targeted |
| LostGroundException → fall | `LostGroundError` | Preserved |
| Off-screen respawn (left/right/bottom) | `Mascot.isOutOfScreen` → `dropFromTop` | Preserved |
| Mouse dragging (`Dragged`, footX spring, 120 px hang offset, resist after 250 idle ticks) | Pointer Events (mouse, touch, pen) | Preserved |
| Resisting (`Regist`) and breaking free | `Regist` | Preserved |
| Throwing (cursor dx/dy → initial velocity) | Per-tick cursor delta | Preserved |
| Breeding (`Breed`: pull-up, split) | `Breed` → `engine.spawn` | Adapted: cap is `maxMascots` (default 5) instead of 50 |
| Sprite rendering (per-mascot translucent window) | One `pointer-events:none` canvas, DPR-aware | Adapted |
| Desktop screen / work area | Layout viewport (`documentElement.clientWidth/Height`) | Adapted |
| Taskbar edge / screen top / sides | Viewport bottom / top / sides | Adapted |
| Active IE window | First fully visible `[data-shimeji-surface]` element | Adapted |
| IE pick-up, carry, throw (`FallWithIE`, `WalkWithIE`, `ThrowIE`) | CSS `translate` on the surface; it glides back after 2.5 s | Ported, **off by default** (`allowSurfaceThrowing`) because it moves page content |
| Global cursor polling | Last pointer position (viewport centre until the first move) | Adapted |
| Tray / right-click menu (call, follow cursor, reduce, restore IE, exit) | `window.dispatchEvent(new CustomEvent("shimeji:command", {detail}))` with `spawn`, `gather`, `reduce`, `restore`, `dismiss` | Adapted (no visible menu) |
| Multi-monitor handling | — | Not applicable |
| Win32 / JNA native calls | — | Not needed |

### Deviations and fixes (all intentional)

1. **Fall stop condition.** Landing counts only while moving down (`vy ≥ 0`). A wall stops the mascot only when it moves into that wall, or has no horizontal speed. Without this, the "jump off the edge of the window" behaviors and the "pulled up from the ground" clone would stop on their first tick. The intra-tick sweep always moves 1 px at a time, so exact-equality borders cannot be skipped through.
2. **Script bugs in the original XML were fixed:**
   - `Math.random*100` (missing `()`, evaluates to NaN → 0) in `ワークエリアの壁を登る` and `IEの壁を登る`.
   - `(Math.random()*width-128)` in `IEの下辺を伝う` should be `random()*(width-128)`.
3. **`mascot.environment.floor` / `ceiling` mean the work-area borders only.** The XML always ORs the IE border in separately, and its comments ("ワークエリアの下辺") show this was the intent. Bordered actions (枠) still accept either border, as in the original.
4. **Scale.** The XML uses absolute desktop pixels (for example `workArea.right-400`). Instead of rewriting those numbers, the world is scaled: 1× from 1024 px up, 0.8× on tablets, 0.6× on phones.
5. **A surface must be fully inside the viewport to count as visible.** When one scrolls out of view, a mascot standing on it loses ground and falls, the same as when an IE window is minimised.

## Not interfering with the site

- The canvas uses `pointer-events: none`. Page clicks, scrolling, links and forms are never intercepted.
- Input is claimed only when a press lands on an opaque sprite pixel (alpha hit test). A grab cursor appears only while hovering such a pixel.
- Touch scrolling is blocked only during an active drag. The click that ends a drag is swallowed so nothing underneath gets clicked.
- The engine doesn't start when `prefers-reduced-motion: reduce` is set. It starts on `requestIdleCallback`, after page load, and pauses in background tabs.

## Usage

```tsx
<Shimeji character="heisenberg" />                 // mounted in app/layout.tsx
<Shimeji character="spiderman" maxMascots={1} />   // the original set; overrides from config/shimeji.config.ts
```

### Characters

`config/characters.ts` registers sprite sets. A character reuses the ported
actions/behaviors and may override them:

- **spiderman**: the original 46 PNGs, 128×128, config exactly as the XML.
- **heisenberg** (`config/heisenberg.ts`): 83 WebP frames (≈400 KB) cut from
  `heisenberg_animation_overview.png` onto a 256×256 canvas (anchors shifted
  +64,+64). It keeps slots 1–46 with the same pose meanings and adds frames
  47–83 for the guide's full idle/walk/run cycles plus 14 new floor behaviors
  from its "Actions / Interactions" and "Special Poses" rows. Wall and ceiling
  poses are derived from the walk frames (rotated 90° / upside-down), and the
  held-by-cursor swing comes from the idle frame tilted ±10°/±20°. Cloning is
  off (`maxMascots: 1`) because the guide has no art for it.

### Effects (browser addition)

`engine/Effects.ts` is a small particle layer drawn on the same canvas after
the sprites and advanced on the same 40 ms tick. Actions trigger it in two ways:

- The `Effect` built-in action (`params: { kind, x, y }`, an offset from the
  feet, mirrored with facing). Heisenberg's `ShootGun` uses it for a muzzle
  flash, a bullet tracer that sparks at the screen edge, an ejected shell and
  smoke.
- `Fall` params `landEffect` / `landMinSpeed`. Heisenberg's `Falling` sets
  `landEffect: "slam"`, so any landing at ≥ 12 px/tick shows the "SLAM IT!"
  starburst, shockwave and dust.

Any behavior can be triggered by name for testing:
`window.dispatchEvent(new CustomEvent("shimeji:command", { detail: "behavior:ShootGun" }))`.

To mark an element as a climbable "window", add `data-shimeji-surface` to it. The Skills icon dock is marked now. Spider-Man walks on its top, hangs underneath it, climbs its sides and jumps between it and the viewport walls.
