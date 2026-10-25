# Contributing to Lumen

Thank you for your interest in Lumen. Lumen is a TypeScript GNOME Shell
extension that provides theme-aware desktop widgets and a Libadwaita
preferences application. Contributions are welcome, but stability is the first
priority: Lumen runs inside GNOME Shell, so a small mistake can crash or disrupt
the user's desktop.

Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.
The project is currently following the milestones and acceptance criteria in
[`implementationPlan.md`](./implementationPlan.md). When this guide conflicts
with that plan or with [`AGENTS.md`](./AGENTS.md), stop and ask a maintainer
before proceeding.

## Before you start

1. Search existing [issues](https://github.com/gaurav7902/gnome-widgets/issues)
   and pull requests before opening a new one.
2. For a substantial change, open an issue first so the scope and design can be
   agreed on.
3. Keep each change small and reviewable. Do not combine unrelated refactors
   with a bug fix or feature.
4. Do not edit anything under `inspo-repos/` or copy its code or assets. Check
   the licence of any reference project before re-implementing an idea.

## Development setup

Lumen targets GNOME Shell 48, 49, 50, and 51. Development requires Node.js 20
or newer, npm, TypeScript dependencies, `glib-compile-schemas`,
`gnome-extensions`, and GJS for the test harness.

```bash
git clone https://github.com/gaurav7902/gnome-widgets.git
cd gnome-widgets
npm ci
```

Useful commands:

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `npm run typecheck`    | Run strict TypeScript checking without emitting files.     |
| `npm run lint`         | Run ESLint and Stylelint.                                  |
| `npm run format:check` | Check formatting with Prettier.                            |
| `npm test`             | Run the unit-test harness.                                 |
| `npm run build`        | Compile the extension, schemas, and stylesheet.            |
| `npm run pack`         | Create the GNOME Shell extension archive.                  |
| `npm run verify-pack`  | Check that the archive contains required files.            |
| `make nested`          | Install and start a nested GNOME Shell for manual testing. |
| `make logs`            | Follow GNOME Shell logs filtered for Lumen.                |

Before submitting code, run at least:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run pack
npm run verify-pack
```

A passing automated check is not a substitute for a nested-shell test. Never
ask someone to test an unverified change in their main desktop session. Use the
nested shell first and record manual procedures or results in
[`docs/qa.md`](./docs/qa.md). Visual changes require a screenshot from the
nested shell during review.

## Repository boundaries

- `src/lib/` contains pure, testable logic. It must not import GNOME Shell,
  St, Clutter, Meta, Gtk, Adw, core, services, or UI modules.
- `src/core/`, `src/services/`, `src/ui/`, and widget implementations run in
  the shell process and must follow the lifecycle and crash-safety rules in
  [`AGENTS.md`](./AGENTS.md).
- `src/prefs/` and `src/prefs.ts` run in the preferences process and must not
  import shell-only modules.
- `schemas/` contains the GSettings schema; validate every native key before
  using it.
- `styles/` contains source CSS. GNOME Shell's St toolkit is not a browser:
  do not add unsupported properties such as `gap`, flex/grid layout, or
  unverified colour syntax.

Pure logic should be implemented and tested before shell integration. Do not
add dependencies, settings keys, public contract changes, subprocesses,
network access, or private GNOME APIs without maintainer approval.

## Reporting bugs

Open a GitHub issue unless the report contains sensitive information. Include:

- Lumen version or commit, GNOME Shell version, distribution, display server
  (Wayland or X11), and relevant Node/GJS versions;
- the exact steps to reproduce, expected behaviour, and actual behaviour;
- whether the issue reproduces in a nested shell;
- relevant `make logs` output, a backtrace, or a screenshot, with personal data
  and secrets removed; and
- a minimal configuration or widget set when applicable.

For crashes, do not guess at the cause. Preserve the last relevant log lines or
backtrace and state clearly when evidence is unavailable. Do not include private
files, credentials, personal paths, or unrelated logs in a public issue.

Do not report security vulnerabilities in a public issue. Contact the
maintainers through a private GitHub channel and include only the information
needed to reproduce the problem. If you cannot find a private channel, open a
non-sensitive issue asking for one without disclosing the vulnerability.

## Suggesting features

Search existing issues first, then describe:

- the user problem and the proposed behaviour;
- why it fits Lumen's desktop-widget scope;
- alternatives considered and compatibility implications for GNOME Shell 48–51;
- whether it changes a settings key, profiles format, widget contract, or
  dependency; and
- screenshots, mock-ups, or a small proof of concept when useful.

New features must not bypass the milestone order. In particular, do not start
R2 work until the human G1 gate for R0 and R1 has been confirmed.

## Implementing changes

1. Read the relevant task in `implementationPlan.md` and the files you will
   touch.
2. State the goal and acceptance criteria in the pull request description.
3. Add a failing test first for pure logic, then implement the smallest fix.
4. Use shared lifecycle helpers for signals, timers, cancellables, and
   disposables. Clean up everything created by the extension.
5. Keep edit mode session-only, make state synchronization idempotent, and
   guard asynchronous callbacks after destruction.
6. Update directly related documentation, especially `docs/qa.md` for manual
   behaviour and `docs/compat.md` for version-sensitive APIs or CSS.
7. Review the diff for secrets, generated files, unrelated formatting, and
   unsupported GNOME APIs before opening a pull request.

Never commit `dist/`, `node_modules/`, generated archives, compiled schemas,
credentials, or debug dumps.

## Pull requests

Use a clear title, preferably including the implementation-plan task ID (for
example, `R1.2: arrange reset layout without overlaps`). A pull request should
explain the problem, the approach, affected files, and how it was verified.
List automated results separately from manual nested-shell results, and call
out anything that still requires human verification.

Keep commits focused. Use imperative subjects and avoid unrelated formatting
changes. Maintainers may ask for revisions, tests, documentation, or a smaller
scope before merging.

## Licence

By contributing, you confirm that you have the right to submit the work and
that you agree for it to be distributed under the project's MIT licence.
