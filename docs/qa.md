# QA checklist

## M0 — Bootstrap

1. Run `npm run build && npm run pack`.
2. Install the generated `build/gaurav7902@thegorav.xyz.shell-extension.zip`
   with `gnome-extensions install`.
3. Enable and disable the extension from GNOME Extensions. Confirm the blue
   rounded rectangle appears and disappears without journal errors.
4. Repeat enable/disable 20 times. Compare the background group child count
   before and after; it must be unchanged.
5. Disable while the desktop is visible and confirm the desktop context menu
   still receives pointer input.

## M1 — Core runtime

1. Change `profiles-json` with `gsettings` while the extension is enabled and
   confirm the extension remains enabled and the current canvas actor is not
   recreated.
2. Set malformed JSON in `profiles-json`, reload the extension, and confirm it
   starts with the default profile and logs at most one warning for the input.
3. Resize a nested shell or unplug/reconnect a monitor and confirm the canvas
   remains present without shell errors.
4. Right-click an empty desktop area and confirm the GNOME background menu still
   opens.

## M2 — Design system foundation

1. Enable the extension with the system light scheme and verify cards/components
   use the light palette.
2. Switch between light and dark scheme while enabled and confirm the active
   theme updates without restarting the shell.
3. Test the Nord, Dracula, and Gruvbox presets with every available accent.
4. Set text scale, radius, opacity, and palette overrides to invalid values and
   confirm they are clamped or safely reset.
5. Confirm body text remains readable against each palette surface in both
   light and dark schemes.
6. Verify Card surfaces render with the expected solid (tier 0) and
   translucent/shadowed (tier 1) appearance.
7. Change radius and opacity overrides while a Card is visible and confirm the
   actor updates without being recreated.
8. Render RingGauge values at 0%, 50%, and 100%; confirm the track, accent, and
   diameter remain stable and invalid values are clamped.
9. Render Sparkline with empty, constant, increasing, and decreasing samples;
   confirm it remains bounded and does not throw.
10. Render Bar at 0%, 50%, 100%, and invalid values; confirm values are clamped
    and track/accent colors remain readable.
11. Enable reduced motion and confirm component transitions are immediate.
12. Disable reduced motion and confirm standard transitions use the 150/200/250
    ms timing tokens.
13. Check caption, body, title, display, and tabular-number styles in both
    light and dark schemes. Tabular numbers intentionally use a monospace
    fallback because St does not support `font-feature-settings`.

## M3 — Layout mathematics

1. Verify normalized positions restore proportionally when moving between
   1080p and 4K work areas.
2. Verify all nine anchors place widget centers/edges correctly.
3. Verify snap steps, work-area clamping, overlap gaps, and grid conversion
   behave as expected.
4. In edit mode, verify arrow nudging moves one grid unit and Shift+arrow moves
   ten; verify undo and redo restore the previous widget arrangement.
5. Verify locked widgets do not begin drags, overlapping moves snap back when
   overlap is disabled, and GSettings is written only on drag release.
6. Enable edit mode, drag a widget to a new location, exit edit mode, and
   reload the extension. Confirm it remains at the moved location rather than
   returning to the origin.
7. In a Todo widget configured with a writable todo.txt path, enter a task and
   press Add. Confirm it is appended without losing existing lines. In a Timer
   widget, press Start, Pause, and Reset and confirm the displayed state changes.
8. Add a Calendar widget and use the previous, Today, and next controls. Confirm
   the month grid and title update without restarting the extension.
9. Add Todo and Photos widgets without custom paths. Confirm Todo watches
   `~/todo.txt` and Photos searches `~/Pictures` and `~/Downloads` when those
   directories exist.

## M4 — Configuration editor

1. Patch several preference values quickly and confirm only the debounced final
   configuration is written.
2. Export a profile, import it unchanged, and verify the active profile and
   widget settings round-trip.
3. Import malformed JSON and verify the current configuration remains unchanged
   and an inline validation error is shown.

## M5 — System parser foundation

1. Verify CPU usage handles missing, malformed, and counter-wraparound input.
2. Verify memory parsing uses `MemAvailable` when present and falls back safely.
3. Verify network rates use deltas, clamp counter resets to zero, and do not
   divide by zero.
4. With only Clock enabled, verify one shared wall-clock timer is active and
   that releasing the widget subscription removes it.
5. Check 12-hour, 24-hour, seconds, weekday, date, and timezone formatting.
6. Subscribe two consumers to the same system metric and confirm they share
   one poller; release both and confirm the poller is removed.
7. Remove a `/proc` source or run in a container without it and confirm the
   service logs the read failure without escaping into GNOME Shell.
8. Confirm metric history is capped at 120 samples and idle metrics do not
   continue polling after their last subscriber is released.
9. Verify Clock compact, regular, large, and world-clock views expose only the
   fields appropriate to each size class; invalid world-clock entries are
   ignored and the list is capped at four clocks.
10. Add a Clock instance through the widget registry, confirm it refreshes at
    the configured seconds/minutes interval, and disable it while active;
    confirm its GLib source is removed without a shell warning.
11. Set `profiles-json` to a profile containing an enabled Clock, reload the
    extension, and confirm the widget is created on the canvas. Change or
    remove the instance in `profiles-json` and confirm it updates or destroys
    without leaving a duplicate actor.
12. Set different anchors, normalized positions, and sizes for multiple Clock
    instances; confirm their actors are positioned and sized correctly. Resize
    the monitor or trigger a monitor change and confirm positions are
    recalculated without widget recreation.
13. Configure `toggle-edit-keybinding`, press the shortcut, and confirm
    `edit-mode` toggles. Disable and re-enable the extension and confirm the
    keybinding is not duplicated and is removed on disable.
14. Confirm the Lumen panel indicator follows `show-panel-indicator`, reflects
    edit and lock settings, exposes reset/preferences actions, and is removed
    cleanly when the extension is disabled.
15. Use the indicator's Add Clock action and confirm a uniquely identified Clock
    instance appears in the active profile and survives extension reload.
16. Add a System widget and verify CPU, Memory, and Network rows show
    "Not available" safely before a statistics service is connected; configure
    metric views and confirm labels and values follow the selected settings.
17. With a System widget enabled, confirm `/proc` reads occur asynchronously,
    values update without shell warnings, and disabling the widget releases all
    metric subscriptions and stops further reads.
18. Add Calendar, Battery, and Todo widgets from the panel indicator. Confirm
    Calendar shows a 42-cell month grid, Battery shows a friendly no-battery
    state when unavailable, and Todo shows an empty state until contents are
    supplied.
19. Add Text, Timer, and Photos widgets. Confirm Text preserves unknown tokens,
    Timer displays a persistent countdown state, and Photos shows a safe empty
    state until entries are supplied.
20. Monitor a note or todo file, change its contents, and confirm subscribers
    receive the new contents. Release the last subscriber and confirm the file
    watch is cancelled; verify atomic writes report failure rather than
    silently succeeding.
21. Configure a Text or Todo widget with a file path and confirm the concrete
    Gio reader updates it after an external edit. Confirm rapid changes are
    debounced and disabling the widget cancels its file monitor.
22. Configure Photos roots and confirm enumeration is asynchronous, depth and
    file caps are respected, only supported image MIME types appear, and
    removing the widget prevents late enumeration results from updating it.

## M6/M7 — Widget library foundations

1. Verify Calendar renders 5/6-week months, locale week starts, and today.
2. Verify Battery clamps percentages and handles missing time estimates.
3. Verify todo.txt preserves untouched lines and completion/priority markers.
4. Verify Text token expansion only replaces the documented whitelist.
5. Disable and re-enable a running Timer and verify remaining time is restored
   from its persisted end timestamp.
