# implementationPlan.md — Lumen v2 ("stabilize, make it render, then finish")

Supersedes the **execution order** of the old plan (M0–M9). Product scope
(themed desktop widgets for GNOME Shell 48–51 with an Adw prefs app) is
unchanged. Move the old plan to `docs/archive/implementationPlan-v1.md`; it is
still a useful feature inventory, but do not follow its milestone order.

Read `AGENTS.md` first. If the two files disagree, stop and ask the human.

---

## 1. Verified state of the repo (snapshot: `extension_7cf30e.zip`)

| Check                                                | Result                                         |
| ---------------------------------------------------- | ---------------------------------------------- |
| `typecheck`, `lint`, `test`, `build`                 | all pass                                       |
| Enabling the extension                               | works (keybinding crash fixed, schema-key test added) |
| Widgets drawn on desktop                             | yes, but unstyled and overlapping              |
| "Reset layout"                                       | stacks widgets on top of each other            |
| Edit widgets / Lock layout toggles                   | crashed the shell; edit mode is re-entered on the next login |
| `prefs.ts`, UPower battery wiring, Weather, Media    | files exist; **not reviewed, never run in a real shell** |

**Passing automated checks proves very little here.** `ambient.d.ts` is still
hand-written (15 `declare module` blocks for St/Clutter/Main/PopupMenu/...), and
no test touches `src/core`, `src/ui` or `src/widgets`. Every bug below got
through green CI.

---

## 2. Findings (evidence in the code)

### F1 — Reset layout overlaps widgets (`src/core/runtime.ts` → `resetLayout`)
- Every widget gets `pos.x = 0.78`, `anchor = "top-right"`, and
  `pos.y = 0.12 + (index % 6) * 0.14` (a fraction of screen height).
- The y-step is about 150 px at 1080p, but widget heights are 100–280 px
  (calendar 280, todo 220, photos 220). Neighbours overlap.
- `index % 6` wraps: with 7+ widgets, widgets 7, 8, 9... land **exactly** on
  widgets 1, 2, 3.
- It keeps each widget's old `size` instead of restoring `manifest.defaultSize`.
- This is the screenshot you sent: several "Clock/Calendar/Todo/Text" cards on
  top of each other.

### F2 — `addWidget` ignores the manifest
- Always creates `size {w: 320, h: 150}` instead of `manifest.defaultSize`, and
  does collision checks with that fake size.

### F3 — No widget has a surface; the design system is not connected
- Zero references to `Card`, `createCard` or `Theme` in `src/widgets/**`.
  `core/theme.ts` defines a theme service class that nothing instantiates.
- Widgets are bare `St.BoxLayout`s: no background, border, radius, padding,
  palette, glass tier, or clipping. Light/dark and accent settings do nothing.
- `Canvas.applyLayout` forces `set_size(w, h)` on these roots, so content that
  is taller than the box simply overflows into its neighbours.

### F4 — `styles/base.css` uses CSS that St does not support
- `gap:` appears 8 times (`.lm-widget-header`, `.lm-system`, `.lm-system-row`,
  `.lm-calendar`, `.lm-calendar-week`, `.lm-battery`, `.lm-todo`, `.lm-photos`).
  St has no `gap`. This is why the screenshot shows the icon on top of the
  caption, `StartPauseReset` glued together, `Add` jammed against the entry and
  calendar days as `27282930123`.
- Also suspect, verify against the shell's own CSS before keeping them:
  `rgb(255 255 255 / 20%)` (space/slash colour syntax), `border-style: solid`,
  `border-radius: 50%`, `opacity: 0` in `.lm-hidden`, and the `box-shadow` forms.
- Nothing in the build or tests would fail on any of this.

### F5 — Edit mode state is persisted, so a crash becomes a crash loop
- `edit-mode` is a normal GSettings key. `WidgetRuntime.enable()` ends with
  `syncEditMode()`, which re-enters edit mode if the key is still `true`.
- If the shell dies while edit mode is on, the next login re-enters it
  automatically. That matches "next boot makes it toggle".
- Edit mode must be **session-only**.

### F6 — Edit-mode integration is fragile (root cause of the crash not yet proven)
I could not identify the exact crash line by reading code, and I did not run a
shell. These are the suspicious spots, in priority order. They are hypotheses,
not conclusions:
1. `syncEditMode()` is called from five places (`enable`, `applyDiff`,
   `reconcile().then`, and the `edit-mode` and `lock-layout` signals). Each call
   runs `editMode.enter()` and re-registers every widget, which disconnects and
   reconnects `button-press-event` handlers every time.
2. `stage.connect("captured-event")` is stored in one field. `endDrag()` only
   disconnects when `dragState.actor instanceof St.Widget`; `exit()` calls
   `endDrag()` after clearing state, so the stage handler can leak.
3. Widgets are made `reactive` and given `track_hover`. In edit mode the press
   handler returns `EVENT_STOP`, which also blocks the widgets' own buttons.
4. `edit-integration.ts` is full of `any` (12 occurrences in `src/`), so the
   compiler cannot help.
5. The controller supports resize, guides and undo, but the integration only
   implements dragging. No outline, handles or lock indicator exist.

### F7 — Timer state is never saved
- `TimerWidget.persist()` mutates `this.config.config.timer` in memory.
  Nothing writes it to the store, so it is lost on reload. `update(_config)`
  ignores new config. Widgets have no `saveConfig` channel.

### F8 — Size classes are dead code
- `setSizeClass` exists only on the clock widget and nothing calls it.

### F9 — Self-writes trigger full reconcile
- `store.save()` writes `profiles-json`, which fires `changed::profiles-json`,
  which calls `store.load()` + `reconcile()` + `syncEditMode()` for every save.

### F10 — Todo entry may not accept keyboard input
- An `St.Entry` inside `Main.layoutManager._backgroundGroup` is not guaranteed
  to receive key focus. Needs a spike (see §6).

### F11 — Weather and Media are in the Add menu but were never reviewed
- Both exist in `widgets/index.ts`. Treat them as experimental until reviewed
  against `AGENTS.md`.

---

## 3. Milestones (do in order; each ends with a human gate)

Gate rule: **R2 does not start until R0 and R1 pass the human nested-shell
checklist.** Do not add features before the gates pass.

### R0 — Stop the crash loop (safety first)

| ID   | Task | Files | Acceptance criteria |
| ---- | ---- | ----- | ------------------- |
| R0.1 | **Human:** capture crash evidence (commands in §5) and write `docs/spikes/edit-crash.md`. | docs | File names the last log lines or the coredump backtrace. If no evidence can be obtained, say so; do not invent a cause. |
| R0.2 | Make edit mode session-only. `extension.enable()` sets `edit-mode` to `false` **before** creating the runtime; `disable()` sets it to `false` after tearing down. Put it in `core/session.ts` (`resetSessionState(settings)`). | `core/session.ts`, `extension.ts` | Unit test with a fake settings object: after `resetSessionState`, `edit-mode` is `false` even if it was `true`. Booting with a stale `true` never enters edit mode. |
| R0.3 | Make `syncEditMode` idempotent. Track the last applied `{editMode, locked, widgetIds}` and only act on change. No `enter()` on every diff. | `core/runtime.ts`, `core/edit-integration.ts` | Test via a fake integration: 5 repeated syncs with the same state cause exactly 1 `enter()`. |
| R0.4 | Harden `EditModeIntegration`: wrap every signal handler in try/catch with a rate-limited log; connect the stage capture **only for the duration of a drag** and always disconnect in `finally`, in `exit()`, and in `destroy()`; connect each actor's `destroy` signal to unregister; replace `any` with real types. | `core/edit-integration.ts` | No `any`. Review checklist in AGENTS.md §6 passes. Human: toggle edit 30 times in the nested shell without a shell error. |
| R0.5 | Reproduce in the nested shell, fix the actual cause found in R0.1, add a regression note to `docs/qa.md`. | varies | Human-signed result. |

### R1 — Layout correctness (pure logic, fully tested)

| ID   | Task | Files | Acceptance criteria |
| ---- | ---- | ----- | ------------------- |
| R1.1 | New `lib/arrange.ts`: `arrangeWidgets(items, area, {gap, margin, snap})`. Right-aligned column flow: fill a column top to bottom; when the next item does not fit, start a new column to the left. Honour each item's own size. If it cannot fit, shrink toward `minSize`; if it still cannot fit, return the ids in `overflow` and place them cascaded with a visible offset, **never exactly stacked**. | `lib/arrange.ts`, `tests/arrange.test.mjs` | Tests: zero overlaps whenever the total area fits; everything inside the work area; stable order; idempotent; deterministic seeded random cases; 1366x768, 1920x1080, 3840x2160 and portrait; 12 widgets of mixed manifest sizes; overflow reported, not hidden. |
| R1.2 | `resetLayout` restores each widget's `manifest.defaultSize`, calls `arrangeWidgets`, converts to normalised positions with `anchor: "top-left"`, and saves once. The runtime must receive manifests (registry) for sizes. | `core/runtime.ts` | The old y-step formula is gone. Test the pure part; human check with 10 widgets on screen: nothing overlaps. |
| R1.3 | `addWidget` uses `manifest.defaultSize` and a pure `findFreeSlot(existing, size, area, gap)` from `lib/arrange.ts`. | `core/runtime.ts`, `lib/arrange.ts` | Test: new widget never overlaps; falls back to a clearly offset spot when full. |
| R1.4 | Clamp rects to the work area when applying layout (monitor change, 4K to 1080p). Enforce `minSize` in the runtime when creating or resizing. | `core/canvas.ts` | Test `clampRect` cases; no widget can be placed fully off-screen. |
| R1.5 | Ignore our own writes: remember the last JSON we saved and skip `changed::profiles-json` when it matches. | `core/runtime.ts`, `core/store.ts` | Test: save then signal with the same string causes zero reconciles. |

**Human gate G1 (nested shell):** reset layout with 10 widgets; add each type;
no overlap; edit toggle x30; enable/disable x20.

### R2 — Make widgets actually render (CSS truth + design system)

| ID   | Task | Files | Acceptance criteria |
| ---- | ---- | ----- | ------------------- |
| R2.1 | Write the supported-CSS list from the **shell's own sources** (`st-theme-node.c`, `gnome-shell.css`) into `docs/compat.md` and cite the file used. Mark unknown properties "unverified". Add `tests/css-supported.test.mjs` and a stylelint `property-disallowed-list` that fail on `gap`, `display`, `flex*`, `grid*`, `border-style`, percentage radii and `rgb( / )` syntax. | `docs/compat.md`, `tests`, `.stylelintrc.json` | Test fails on the current `base.css` (red first), passes after R2.2. |
| R2.2 | Fix `styles/base.css`: replace `gap` with BoxLayout `spacing` (or margins if `spacing` is not honoured; verify in the nested shell), fix colour syntax, drop unsupported properties. Use actor APIs (`actor.opacity`, `ease()`) instead of CSS for opacity and motion. | `styles/base.css` | Test from R2.1 is green. Human screenshot: icon and caption no longer overlap; buttons are separated; calendar digits are spaced. |
| R2.3 | New `ui/widget-frame.ts`: `createWidgetFrame({theme, tier, style, title, icon})` returns `{root, header, body}`. `root` is a vertical `St.BoxLayout` using the existing `Card` surface, with padding, radius, `clip_to_allocation`, and a header (icon + caption with spacing). `root` is what the canvas positions. | `ui/widget-frame.ts` | Content can never paint outside `root`. Unit-test the pure sizing helpers; the visual part is human-verified. |
| R2.4 | Create the theme service in `extension.enable()` and destroy it in `disable()`. Pass it to widgets via `WidgetContext.theme`. Re-apply on theme change. Honour `theme-preset`, `glass-tier`, `corner-radius`, `global-opacity`, `follow-system-accent`. | `extension.ts`, `core/runtime.ts`, `core/registry.ts` | Light/dark switch and accent change update visible widgets without recreating them. |
| R2.5 | Compute `sizeClassForRect` per widget on layout and call optional `setSizeClass`. Add compact/regular/large to clock first. | `core/runtime.ts`, `widgets/clock` | Test the mapping; human check at three sizes. |

### R3 — Repair widgets one at a time (each its own task and PR)

Each widget must: use `createWidgetFrame`, look right at `minSize`, default and
a larger size, show empty/error states, free everything on `destroy()`, and use
only shared services (no per-widget timers; the clock's own GLib timer is
replaced by the shared ticker).

| ID   | Widget | Specific work |
| ---- | ------ | ------------- |
| R3.1 | Clock | Use shared ticker; compact/regular/large; secondary/tertiary lines wrap or hide cleanly. |
| R3.2 | System | Confirm snapshots arrive; draw rings/bars/sparkline; sensible first-sample placeholder; clip rows. |
| R3.3 | Calendar | Real 7-column grid: one fixed-width centred label per day, header row, today highlight, working prev/today/next. |
| R3.4 | Battery | "No battery" is a valid state (desktop PC); verify the UPower path with a fake and with a real laptop. |
| R3.5 | Todo | Rows render, add and toggle work, file writes are async and atomic, key-focus spike (S2) resolved first. |
| R3.6 | Text | Wrap or ellipsize; file-backed text updates when the file changes. |
| R3.7 | Timer | Add `WidgetContext.saveConfig(patch)` (contract change, Architect only). Persist and restore across reload. Use shared ticker. |
| R3.8 | Photos | Async enumeration; list or thumbnails; empty/error state; no sync I/O. |
| R3.9 | Weather, Media | Review against AGENTS.md. Add `experimental: true` to their manifests and hide them from "Add" until they pass review. |

### R4 — Edit mode UX (rebuilt on top of R0)

Design: **overlays handle input, widgets stay non-reactive.**
- A separate overlay layer on the canvas draws one frame per widget (accent
  outline, 8 resize handles, size label, lock icon). Dragging and resizing are
  done on the overlay, so widget buttons and entries are never touched.
- Pure state stays in `EditModeController` (move, resize, nudge, undo/redo,
  snap-back). Add `minSize` from the manifest to the controller; add tests for
  starting from an already-overlapping layout and for locked widgets.
- No GSettings writes during drag. Commit on release, debounced.
- Exit edit mode on `Esc`, on screen lock, when the Overview opens, and on
  `disable()`.
- Acceptance: human checklist in `docs/qa.md` (drag, resize, lock, undo, Esc,
  Overview, shell restart).

### R5 — Preferences, polish, release
Keep the old plan's M4 (prefs), M8 (polish) and M9 (QA/release) unchanged,
starting after G2 (below). Do not touch them earlier.

**Human gate G2:** every R3 widget passes the checklist at three sizes in light
and dark; enable/disable x20 shows no actor/timer growth; screenshot attached.

---

## 4. Verification protocol

**Agent (automated):** `npm run typecheck && npm run lint && npm test &&
npm run build && npm run pack && npm run verify-pack`, plus the new tests named
above.

**Human only. The agent must list these as NOT VERIFIED and never tick them:**
1. `make nested` (49+: `gnome-shell --devkit`; 48: `--nested`). Never test
   first in the host session.
2. `journalctl -f -o cat /usr/bin/gnome-shell | grep -i -E "lumen|critical|css"`.
   Expect no Lumen errors and no stylesheet warnings.
3. Per-milestone checklist in `docs/qa.md`, with a screenshot for anything visual.
4. Only after G1 passes: try the extension in the host session.

---

## 5. Human-only runbooks

**Evidence after a crash** (run after logging back in, or from a TTY):
```bash
journalctl -b -1 -o cat /usr/bin/gnome-shell | grep -i -E "lumen|critical|assert|segfault" | tail -40
coredumpctl list gnome-shell | tail -3
coredumpctl info gnome-shell | head -60
```

**Shell loops back into edit mode / bad layout on login** (from a TTY, as your user):
```bash
dbus-run-session -- dconf write /org/gnome/shell/extensions/lumen/edit-mode false
# if the layout itself is broken:
dbus-run-session -- dconf reset /org/gnome/shell/extensions/lumen/profiles-json
```

---

## 6. Spikes (time-boxed, write `docs/spikes/<id>.md`)

- **S1 — Unsupported CSS:** which properties in `base.css` does St honour on
  shells 48/49/50? Method: the shell sources + nested shell log. Output: the
  list used by R2.1.
- **S2 — Keyboard focus in the background group:** can `St.Entry` receive typing
  there? If not, choose: `Main.pushModal` while editing, a separate top-layer
  entry, or edit tasks in prefs only. Decide before R3.5.
- **S3 — Edit-mode crash:** R0.1/R0.5.

---

## 7. Risks

| Risk | Mitigation |
| ---- | ---------- |
| Crash cause is never captured | Session-only edit mode (R0.2) removes the loop; overlay design (R4) removes the suspected input paths. |
| `spacing` not honoured for some containers | Fall back to margins; verify in S1. |
| Contract changes ripple (`theme`, `saveConfig`, `setSizeClass`, `experimental`) | Architect lands them first in one small PR with tests. |
| Agent claims success from green CI | Handoff template requires a NOT VERIFIED list and a screenshot request. |
