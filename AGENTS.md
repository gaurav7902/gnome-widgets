# AGENTS.md — Instructions for AI agents working on Lumen

Lumen is a TypeScript GNOME Shell extension (48–51) that draws configurable
desktop widgets, with an Adw preferences app.
**Source of truth for scope, order of work and acceptance criteria:
`implementationPlan.md`.** If this file and the plan disagree, stop and ask
the human. Do not silently pick one.

---

## 0. Current phase and gate (read this first)

The extension loads but is **not yet trustworthy**: it has crashed the user's
shell twice, "Reset layout" stacks widgets on top of each other, and widgets
render without a surface or spacing. Work follows `implementationPlan.md`
milestones **R0 → R1 → R2 → R3 → R4 → R5**.

- Do **not** start R2 until the human has confirmed gate G1 (nested-shell test
  of R0 and R1). Do not add features, widgets or settings before then.
- The user's desktop is the host session. **Never tell the user to enable or
  test a change in the host session first.** Always nested shell first.
- A green `typecheck`/`lint`/`test`/`build` does **not** mean it works.
  `ambient.d.ts` is hand-written, and no test exercises `src/core`, `src/ui` or
  `src/widgets`. Treat every Shell/St/Clutter/Meta call as unverified until a
  human has run it in a nested shell.

---

## 1. Operating principles

1. **One task = one small, reviewable change** (≤ 5 files where possible).
   Reference the task ID (e.g. `R1.2`) in commit messages and PR titles.
2. **Pure logic first.** Anything testable goes in `src/lib/` (no Shell
   imports) with a failing test written first. If a bug lives in `core/`, move
   the decision logic into `lib/` and test it there. (The reset-layout bug
   existed because its formula lived untested in `core/runtime.ts`.)
3. **Evidence before diagnosis.** Do not claim a root cause you did not observe.
   Say "hypothesis" and list what log, backtrace or screenshot would confirm
   it. Never invent log lines, coredumps or test results.
4. **Never claim what you could not verify.** You usually cannot run a GNOME
   session. Every handoff lists what was verified and what is **NOT VERIFIED**
   (needs a human), and the manual steps go into `docs/qa.md`.
5. **Ask before guessing** on: licence choice, project name/uuid, any public
   settings key, the profiles JSON shape, adding a dependency, or any
   widget/runtime contract change.
6. **Keep the change minimal.** No drive-by refactors, no reformatting of
   unrelated files, no new dependencies without justification.
7. **Check licences before borrowing.** The inspiration repos in `inspo-repos/`
   have different licences. Re-implement ideas in your own code; never copy code
   or assets without human approval. Do not edit anything under `inspo-repos/`.

---

## 2. Environment & commands

Node ≥ 20, TypeScript 5.x, GJS for unit tests. A GNOME Shell session is **not**
guaranteed.

| Command                | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `npm ci`               | Install pinned deps                                               |
| `npm run typecheck`    | `tsc --noEmit`                                                    |
| `npm run lint`         | ESLint (+ import-boundary rules) and stylelint                    |
| `npm run format:check` | Prettier check                                                    |
| `npm test`             | Run unit tests                                                    |
| `npm run build`        | Compile to `dist/`, copy assets, concat CSS, compile schemas      |
| `npm run pack`         | Zip into `build/`                                                 |
| `npm run verify-pack`  | Fail if the zip is missing required files                         |
| `make nested`          | Nested shell (`--devkit` on 49+, `--nested` on 48) — **human**    |
| `make logs`            | Tail shell logs filtered by uuid — **human**                      |
| `make install`         | Install into `~/.local/share/gnome-shell/extensions/` — **human** |

Before finishing any task run: `typecheck`, `lint`, `test`, `build`, and for
milestone boundaries `pack` + `verify-pack`. If something is unavailable, say so.

---

## 3. Repository map & import boundaries

```
src/extension.ts, src/prefs.ts   thin entrypoints only
src/lib/        PURE logic (no resource:///org/gnome/shell, no St/Clutter/Meta/Shell/Gtk/Adw)
src/core/       shell-only runtime (canvas, store, registry, theme, lifecycle, editmode…)
src/services/   shell-only, ref-counted data sources (sysstats, battery, files, photos…)
src/ui/         shell-only reusable components (Card, WidgetFrame, RingGauge, Sparkline, Bar…)
src/widgets/<name>/{manifest.ts, widget.ts}
src/prefs/      prefs-process only (Adw/Gtk)
styles/         CSS partials → concatenated into stylesheet.css at build
tests/          *.test.mjs for src/lib/** (and any pure helper)
docs/           architecture.md, qa.md, compat.md, spikes/, archive/
```

**Hard boundaries (lint-enforced; never weaken the rules):**
- `lib/**` imports nothing from core/services/ui/prefs/shell resources.
- Prefs code never imports `resource:///org/gnome/shell/*`, `gi://St`,
  `gi://Clutter`, `gi://Meta`, `gi://Shell`.
- Shell code never imports `gi://Gtk` or `gi://Adw`.
- `manifest.ts` is imported by both processes, so it must be pure.

---

## 4. Non-negotiable rules (stability + EGO review)

**Crash safety (new, from real incidents)**
- A native name passed by string (GSettings key, keybinding name, signal name)
  must be validated against its source of truth (schema XML, GIR) before use.
  A bad GSettings key **aborts gnome-shell**; `try/catch` cannot stop it.
  `tests/schema-keys.test.mjs` guards this. Extend it when you add a key.
- **Edit mode is session-only.** It must never be restored from a persisted
  value at login. `edit-mode` is forced to `false` in `enable()` before the
  runtime starts and again in `disable()`. A crash while editing must not turn
  into a crash loop.
- `enable()` never throws and rolls back on partial failure. Risky native hooks
  (keybindings, private Main.* fields, stage-level event handlers) are set up
  last and torn down first.
- Stage-level handlers (`captured-event`) exist **only for the duration of a
  drag**, are disconnected in `finally`, on `exit()` and on `destroy()`.
- Every signal handler and timeout callback is wrapped so an exception is
  logged once (`core/log.ts`) and never escapes into the shell.
- Idempotent sync: re-applying the same state (edit mode, lock, widget set)
  must be a no-op, not a teardown/rebuild.

**Lifecycle**
- No work at import time or in constructors (field init only). Create things in
  `enable()`/`create()`.
- Everything created is destroyed: actors, signals, `GLib.Source.remove(id)`
  for every timer, `Gio.Cancellable.cancel()`, keybindings, theme listeners.
- Use `core/lifecycle.ts` helpers (`Signals`, `Timers`, `Cancellables`,
  `Disposables`); do not hand-roll signal ID bookkeeping.
- After every `await`, check `destroyed` / `cancellable.is_cancelled()` before
  touching actors. `disable()` is idempotent and safe after a partial `enable()`.

**Performance**
- No synchronous I/O in the shell process (no sync `load_contents`, sync D-Bus,
  sync subprocess). Use `*_async` + `Gio._promisify`.
- No per-widget timers. Use shared services with `acquire()/release()`
  (the shared ticker).
- Never read GSettings inside `vfunc_repaint`; cache on change. Call
  `cr.$dispose()` on every Cairo context from `get_context()`.
- Do not write GSettings during drag/motion. Commit on release, debounced.
- Do not rebuild widgets on config change; call `instance.update(config)`.
- Ignore our own writes to `profiles-json` (compare against the last saved JSON).

**Safety**
- No `eval`, `new Function`, or user-provided shell strings. Subprocesses and
  network code need human approval.
- No telemetry. Do not minify or obfuscate.
- Treat settings JSON, files (todo.txt, text files), MPRIS metadata and D-Bus
  values as **untrusted input**: validate, clamp, escape.

**Compatibility**
- Target only the shell versions in `metadata.json`. Prefer feature detection.
- Private Shell API (e.g. `Main.layoutManager._backgroundGroup`) only inside
  `core/canvas.ts`, documented in `docs/compat.md`, with a guard that fails soft.
- Optional typelibs are imported dynamically inside try/catch.

**Code quality**
- `strict` TS. No `any` without a `// why:` comment. No `!` in `core/`.
  (`edit-integration.ts` currently violates this; fixing it is task R0.4.)
- Do not declare `gi://*` or `resource:///org/gnome/shell/*` modules by hand in
  `ambient.d.ts` when `@girs/*` types exist. Prefer the real typings.
- File size: soft cap 300 lines, hard cap 500.
- Never `console.log` in committed code; use `core/log.ts`.

---

## 5. GNOME Shell / St reality rules (the CSS and layout lessons)

These exist because the current UI is broken in exactly these ways.

1. **St is not a browser.** No `gap`, no `display:flex`, no grid, no `%` border
   radius, no `border-style`. Spacing inside an `St.BoxLayout` uses the St
   `spacing` property; if that is not honoured for a container, use margins or
   padding on the children. Unsupported CSS is ignored silently, so the layout
   just looks broken (icon on top of caption, buttons glued together).
2. **Use only properties verified against the shell's own sources**
   (`st-theme-node.c`, `gnome-shell.css`). Record the list and the file you
   checked in `docs/compat.md`. Anything unverified is "unverified": do not use
   it. `tests/css-supported.test.mjs` fails the build on banned properties.
3. Colour syntax: use `rgba(r, g, b, a)` / hex, not `rgb(0 0 0 / 24%)`, unless
   verified. Opacity and motion go through actor APIs (`actor.opacity`,
   `actor.ease()`), not CSS.
4. **Every widget root is created with `ui/widget-frame.ts`**: a card surface
   with padding, radius, `clip_to_allocation`, and a header (icon + caption).
   Content must never paint outside the frame. Never place a bare
   `St.BoxLayout` on the canvas.
5. **No hard-coded colours.** Use palette tokens from `core/theme.ts`, which is
   created in `enable()` and passed through `WidgetContext.theme`. Light and
   dark must both work; theme/accent changes update in place.
6. A widget must look correct at its manifest `minSize`, its `defaultSize` and
   a larger size. Implement `setSizeClass` (compact/regular/large) — the runtime
   calls it.
7. **Layout is pure math.** Positions, reset, add-slot and clamping live in
   `lib/arrange.ts` / `lib/layout.ts` with tests that assert **zero overlaps**
   for the stated screen sizes. Never position widgets with magic constants
   such as a fixed x or a fixed y-step. New widgets use `manifest.defaultSize`.
8. **Widgets are non-reactive** unless they have real controls. Edit-mode input
   is handled by an overlay layer, not by making widgets reactive and stealing
   their events.
9. Widget state that must survive a reload (timer, text, todo path) is saved
   through `WidgetContext.saveConfig(patch)` into the store. Mutating the
   in-memory config object does not persist anything.
10. Keyboard input in `_backgroundGroup` is unproven (spike S2). Do not build
    typing UI before S2 is resolved.

---

## 6. Self-review checklist (use before every handoff)

- [ ] Every created actor/signal/timer/async op has matching teardown
- [ ] No sync I/O, no per-widget timers, no settings reads in repaint
- [ ] Cairo contexts disposed; no `any`; no `!` in core
- [ ] Every string passed to a native API is validated against schema/GIR
- [ ] Handlers wrapped; exceptions cannot escape; stage handlers are scoped to a drag
- [ ] State sync is idempotent (calling twice does nothing extra)
- [ ] CSS uses only verified properties; widget uses `createWidgetFrame`
- [ ] No hard-coded colours; works in light and dark and with accent changes
- [ ] Works at min, default and large size; no overlap in layout tests
- [ ] Input validated (settings, files, D-Bus)
- [ ] Import boundaries respected; file sizes within caps; no stray debug code
- [ ] Empty / error / offline states exist
- [ ] Strings wrapped in `_()` (UI code)

---

## 7. Task execution protocol

1. **Read** the task's row in `implementationPlan.md` and the files you will touch.
2. **Restate** the goal and acceptance criteria in 2–4 lines.
3. **Plan** the file-level changes; if you would exceed ~5 files or need a
   contract change, split or ask.
4. **Test first** for `lib/` code (failing test → implement → passing).
5. **Implement** following §4 and §5.
6. **Self-review** with §6.
7. **Verify** with the §2 commands.
8. **Handoff message** (always this format; do not skip NOT VERIFIED):

```
Task: R1.2 — resetLayout uses arrangeWidgets
Changed: <files>
Verified: typecheck ✅ lint ✅ test ✅ (n new tests) build ✅ pack ✅
NOT VERIFIED (needs human, steps added to docs/qa.md §R1):
  - 10 widgets after Reset layout: no overlap (nested shell, screenshot please)
Hypotheses (unconfirmed): …
Decisions/assumptions: …
Follow-ups / risks: …
```

If you changed anything visual, ask the human for a **screenshot** from the
nested shell. Do not describe how it "should" look as if you had seen it.

---

## 8. Definition of Done

**Task done when:** code + tests are green; §6 is complete; the handoff is
written; `docs/qa.md` has manual steps for every visual/behavioural change.

**Milestone done when:** every acceptance criterion has an automated test or a
recorded, human-signed manual result; no new lint warnings; the human gate
(G1 after R1, G2 after R3) passed, including nested-shell enable/disable ×20
and edit-mode toggle ×30 without shell errors.

---

## 9. Roles (when work is split)

| Role | Owns | Must not touch |
| ---- | ---- | -------------- |
| Architect/Lead | `implementationPlan.md`, `docs/architecture.md`, public contracts (manifest, `WidgetContext`, `WidgetInstance`, schema keys, profiles JSON) | feature code |
| Core engineer | `src/core/*`, `src/lib/layout.ts`, `src/lib/arrange.ts`, `src/lib/config.ts`, `extension.ts` | widget internals |
| Design-system engineer | `src/ui/*`, `styles/*`, `core/theme.ts`, `docs/compat.md` CSS list | services |
| Widget engineer | one `src/widgets/<name>/` at a time | other widgets, contracts |
| Services engineer | `src/services/*`, parsers in `src/lib/*` | UI |
| Prefs engineer | `src/prefs/*`, `src/prefs.ts` | shell-process code |
| QA/Release | `scripts/*`, `docs/qa.md`, packaging | feature code |
| Reviewer (read-only, not the author) | reviews diffs against §4–§6 | writing code in the same PR |

Parallelise only across disjoint file sets. Contract changes
(`WidgetContext.theme`, `saveConfig`, `setSizeClass`, manifest `experimental`)
land first in their own small PR by the Architect.

---

## 10. Prompt templates

**Implement a task**
> You are the _<role>_ on Lumen. Read `AGENTS.md` and `implementationPlan.md`
> (task _<Rx.y>_). Implement only that task. Follow §4 and §5 and the §7
> protocol. Files you may modify: _<list>_. Do not change contracts. Finish with
> the §7 handoff including NOT VERIFIED.

**Debug a crash or visual bug**
> Do not guess. List what evidence you have (logs, backtrace, screenshot) and
> what is missing. State hypotheses as hypotheses. Move the decision logic into
> `lib/`, write a failing test that reproduces it, then fix. Add the manual
> repro to `docs/qa.md`.

**Independent review**
> You are the Reviewer and did not write this diff. Check it against `AGENTS.md`
> §4–§6 and the task's acceptance criteria. List violations with file:line,
> severity (blocker/major/minor) and a suggested fix. Do not rewrite code.
> Focus on teardown, async-after-destroy, sync I/O, unsupported St CSS,
> unvalidated native names, edit-mode input handling.

**Spike**
> Run spike _<S#>_ in its time box. Produce `docs/spikes/<S#>.md`: question,
> method, results per GNOME version tested (or "not testable here"), decision,
> minimal snippet. Do not integrate without Architect approval.

---

## 11. Things agents must NOT do

- Weaken lint rules, skip tests, or mark criteria done without evidence.
- Tell the user to enable the extension in their main session before the
  nested-shell gate passes.
- Add dependencies, subprocesses, network access or private-API usage without
  approval.
- Change `uuid`, `settings-schema`, schema key names/types, or the profiles JSON
  shape without the Architect and a migration.
- Persist edit mode, or register any keybinding/GSettings binding by an
  unvalidated name.
- Put unsupported CSS (`gap`, flex/grid, `%` radius…) in `styles/`.
- Position widgets with hard-coded constants instead of `lib/arrange.ts`.
- Commit generated output (`dist/`, `build/`, `*.zip`, `gschemas.compiled`,
  `node_modules/`).
- Run `rm -rf` outside the repo or touch `~/.local/share/gnome-shell/` except
  through `make install`.
- Fabricate screenshots, logs, test results or performance numbers.

---

## 12. Quick reference

- **Shell-version-sensitive spots (see `docs/compat.md`):** `_backgroundGroup`,
  drag/grab APIs, St CSS property support, blur effects, Adw widget availability.
- **Logging:** `core/log.ts` → `warn(key, msg)` (rate-limited), `debug(msg)`
  (only if `debug-logging`).
- **Recover a user stuck in edit mode (human, from a TTY):**
  `dbus-run-session -- dconf write /org/gnome/shell/extensions/lumen/edit-mode false`
  and, if the layout is broken,
  `dbus-run-session -- dconf reset /org/gnome/shell/extensions/lumen/profiles-json`.
- **Where decisions live:** contracts → `docs/architecture.md`; spikes →
  `docs/spikes/`; version quirks and supported CSS → `docs/compat.md`; manual
  tests → `docs/qa.md`.
