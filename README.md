# Lumen

Theme-aware desktop widgets for GNOME Shell.

Lumen is a TypeScript-based GNOME Shell extension targeting GNOME
Shell 48, 49, and 50. It provides a modular desktop widget framework
with shared data services, responsive widget layouts, a native Libadwaita
preferences application, real-time edit mode, and strict lifecycle cleanup.

## Included Widgets & Services

- **Clock**: Digital, analog, date, and world clocks with live format preview and time zone support.
- **System**: CPU, RAM, storage, temperature, GPU (`nvidia-smi`), and network throughput statistics with ring gauges, sparklines, and hover popups.
- **Weather**: Current conditions, forecast strips, and GWeather / GeoClue integration.
- **Calendar**: Month grid, locale week start, today highlight, and calendar app integration.
- **Battery**: UPower-powered device and peripheral status reporting with semantic colors.
- **Media**: MPRIS player integration with cover art tinting and playback controls.
- **Todo**: Todo.txt parser with Gio file monitoring, priority coloring, and project groupings.
- **Photos**: Asynchronous folder enumeration and photo slide show viewer.
- **Text / Note**: Static text with tokens (`{date}`, `{time}`, `{user}`, `{host}`, `{uptime}`) and live file reload.
- **Timer / Pomodoro**: Countdown and pomodoro cycle timer with persistent state.

## Requirements

- GNOME Shell 48, 49, or 50
- Node.js 20 or newer
- npm
- TypeScript toolchain dependencies (`npm install`)
- `glib-compile-schemas` and `gnome-extensions` for building and packaging
- GJS for unit tests

## Development setup

```bash
git clone https://github.com/gaurav7902/gnome-widgets.git
cd gnome-widgets
npm install
```

Run the complete local checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run pack
```

The package is compiled to:

```text
build/gaurav7902@thegorav.xyz.shell-extension.zip
```

## Installing locally

Build, package, and install the extension bundle with:

```bash
npm run install-local
```

Enable the extension:

```bash
gnome-extensions enable gaurav7902@thegorav.xyz
```

## Development commands

| Command             | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `npm run build`     | Compile TypeScript, copy metadata and schemas, and build the stylesheet |
| `npm run typecheck` | Run strict TypeScript checking without emitting files                   |
| `npm run lint`      | Run ESLint and Stylelint                                                |
| `npm run format`    | Format project files with Prettier                                      |
| `npm test`          | Run the test harness                                                    |
| `npm run pack`      | Create a GNOME Shell extension ZIP                                      |
| `npm run nested`    | Build/install and launch a nested GNOME Shell where supported           |
| `npm run logs`      | Follow GNOME Shell logs filtered to this extension                      |

## Project structure

```text
src/extension.ts       Thin GNOME Shell entrypoint
src/prefs.ts           Thin Libadwaita preferences entrypoint
src/lib/               Pure logic and testable modules
src/core/              Shell-only runtime services and edit mode
src/services/          Shared ref-counted data services
src/ui/                Reusable shell UI components
src/widgets/           Widget manifests and implementations
schemas/               GSettings schemas
scripts/               Build and test scripts
styles/                CSS source files
docs/architecture.md   Architecture documentation
docs/qa.md             Manual QA procedures
```

The implementation scope and milestone acceptance criteria are maintained in
[implementationPlan.md](./implementationPlan.md). Agent and contribution
workflow rules are in [AGENTS.md](./AGENTS.md).

## Manual QA

Follow [docs/qa.md](./docs/qa.md) to verify lifecycle cleanup, theme switching, layout persistence, and widget behavior.

## Licence

This project is licensed under the MIT licence.
