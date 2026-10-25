# Lumen Architecture

> Theme-aware desktop widgets for GNOME Shell (48–50).

## 1. Overview

Lumen is designed with a strict separation of concerns across processes (GNOME Shell extension runtime vs. Libadwaita preferences app) and execution layers (pure logic vs. Shell actors).

```
src/extension.ts, src/prefs.ts   thin entrypoints only
src/lib/        PURE logic (no Shell imports, fully unit-testable in Node/GJS)
src/core/       shell-only runtime (canvas, store, registry, theme, lifecycle, editmode…)
src/services/   shell-only, ref-counted data sources (ticker, sysstats, weather, battery, mpris…)
src/ui/         shell-only reusable components (Card, RingGauge, Sparkline, Bar…)
src/widgets/<name>/{manifest.ts, widget.ts, prefs.ts}
src/prefs/      prefs-process only (Adw/Gtk)
styles/         CSS partials → concatenated into stylesheet.css at build
tests/          *.test.ts for src/lib/**
docs/           architecture.md, qa.md, compat.md, spikes/
```

## 2. Hard Import Boundaries

Enforced via ESLint and static boundaries:

1. **`lib/**`** → May import nothing from `core`, `services`, `ui`, `prefs`, nor `resource:///org/gnome/shell/*`.
2. **Prefs code (`src/prefs/**`, `*/prefs.ts`)** → Never imports `resource:///org/gnome/shell/*`, `gi://St`, `gi://Clutter`, `gi://Meta`, `gi://Shell`.
3. **Shell code (`src/core/**`, `src/services/**`, `src/ui/**`, `*/widget.ts`)** → Never imports `gi://Gtk` or `gi://Adw`.
4. **`manifest.ts`** → Must be pure and importable by both processes.

## 3. Runtime & Lifecycle

- **Idempotent Enable/Disable**: Everything created is registered and cleaned up via `core/lifecycle.ts` helpers (`Signals`, `Timers`, `Cancellables`, `Disposables`).
- **Shared Ref-Counted Services**: Ticker, system statistics, file monitors, photo sources, and battery state are shared and ref-counted, pausing or stopping when no widgets subscribe.
- **Asynchronous I/O**: No synchronous file reads or blocking D-Bus calls in the shell process. All I/O uses `*_async` + `Gio._promisify`.

## 4. Theme & Glass System

- **Palette Tokens**: `core/theme.ts` exposes light and dark palettes with accent-color awareness and semantic colors (`ok`, `warn`, `crit`, `surface`, `border`, `text`).
- **Glass Tiers**: Supports solid surfaces (Tier 0) and translucent frosted styles with hairline borders and soft shadows (Tier 1).
- **No Repaint GSettings Reads**: Styles and palettes are cached and updated only on theme or preference change events, keeping `vfunc_repaint` fast.

## 5. Widget Contract

Each widget encapsulates:

- **`manifest.ts`**: Pure metadata, configuration schema, and validation/migration rules.
- **`widget.ts`**: Shell-only actor implementation adhering to `WidgetInstance` (methods: `update`, `setSizeClass`, `onThemeChanged`, `destroy`).
- **`prefs.ts`**: Adw-based preferences building function for the settings app.
