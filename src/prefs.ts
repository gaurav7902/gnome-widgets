import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import {ExtensionPreferences} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import {parse} from "./lib/config.js";
import type {WidgetInstanceConfig} from "./lib/config.js";

interface PreferencesSettings {
    get_string(key: string): string;
    get_boolean(key: string): boolean;
    set_string(key: string, value: string): void;
    bind(key: string, object: unknown, property: string, flags: number): void;
}

export default class LumenPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window: Adw.PreferencesWindow): void {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: "General",
            icon_name: "preferences-system-symbolic",
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: "Widgets & Layout",
            description: "Manage your desktop layout and general behavior.",
        });
        page.add(group);

        const editRow = new Adw.ActionRow({
            title: "Arrange widgets",
            subtitle:
                "Use the Lumen panel menu → Arrange widgets… to move widgets, save, revert, or restore the default layout.",
        });
        group.add(editRow);

        const lockRow = new Adw.ActionRow({
            title: "Lock layout",
            subtitle: "Prevent accidental movement of desktop widgets",
        });
        group.add(lockRow);
        const lockSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean("lock-layout"),
        });
        settings.bind(
            "lock-layout",
            lockSwitch,
            "active",
            Gio.SettingsBindFlags.DEFAULT,
        );
        lockRow.add_suffix(lockSwitch);

        const indicatorRow = new Adw.ActionRow({
            title: "Panel indicator",
            subtitle: "Show the Lumen menu in the top panel",
        });
        group.add(indicatorRow);
        const indicatorSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean("show-panel-indicator"),
        });
        settings.bind(
            "show-panel-indicator",
            indicatorSwitch,
            "active",
            Gio.SettingsBindFlags.DEFAULT,
        );
        indicatorRow.add_suffix(indicatorSwitch);

        const debugRow = new Adw.ActionRow({
            title: "Debug logging",
            subtitle: "Write diagnostic logs to the journal",
        });
        group.add(debugRow);
        const debugSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean("debug-logging"),
        });
        settings.bind(
            "debug-logging",
            debugSwitch,
            "active",
            Gio.SettingsBindFlags.DEFAULT,
        );
        debugRow.add_suffix(debugSwitch);

        const widgetsPage = new Adw.PreferencesPage({
            title: "Widgets",
            icon_name: "view-grid-symbolic",
        });
        window.add(widgetsPage);
        this.buildWidgetSettings(widgetsPage, window, settings);
    }

    private buildWidgetSettings(
        page: InstanceType<typeof Adw.PreferencesPage>,
        window: Adw.PreferencesWindow,
        settings: PreferencesSettings,
    ): void {
        const config = parse(settings.get_string("profiles-json"));
        const profile = config.profiles[config.activeProfile];
        if (!profile || profile.widgets.length === 0) {
            page.add(
                new Adw.PreferencesGroup({
                    title: "No widgets yet",
                    description:
                        "Add Photos or Text from the Lumen panel menu. Their settings will appear here.",
                }),
            );
            return;
        }

        for (const widget of profile.widgets) {
            if (widget.type === "photos") {
                this.addPhotosSettings(page, window, settings, widget);
            } else if (widget.type === "text") {
                this.addTextSettings(page, window, settings, widget);
            } else {
                page.add(
                    new Adw.PreferencesGroup({
                        title: `${this.widgetLabel(widget.type)} · ${widget.id}`,
                        description:
                            "This widget does not have additional settings yet.",
                    }),
                );
            }
        }
    }

    private addPhotosSettings(
        page: InstanceType<typeof Adw.PreferencesPage>,
        window: Adw.PreferencesWindow,
        settings: PreferencesSettings,
        widget: WidgetInstanceConfig,
    ): void {
        const group = new Adw.PreferencesGroup({
            title: `Photos · ${widget.id}`,
            description:
                "Choose folders to scan for recent photos. Add multiple folder paths separated by commas.",
        });
        page.add(group);
        const defaults = [
            GLib.build_filenamev([GLib.get_home_dir(), "Pictures"]),
            GLib.build_filenamev([GLib.get_home_dir(), "Downloads"]),
        ];
        const configured = Array.isArray(widget.config.roots)
            ? widget.config.roots.filter(
                  (value): value is string => typeof value === "string",
              )
            : defaults;
        const rootsRow = new Adw.EntryRow({title: "Photo folders"});
        rootsRow.set_text(configured.join(", "));
        group.add(rootsRow);

        const browseRow = new Adw.ActionRow({
            title: "Add a folder",
            subtitle: "Select a directory to append to the folder list",
        });
        const browseButton = new Gtk.Button({
            label: "Browse…",
            valign: Gtk.Align.CENTER,
        });
        browseButton.connect("clicked", () => {
            const chooser = new Gtk.FileChooserNative({
                title: "Choose a photo folder",
                transient_for: window,
                action: Gtk.FileChooserAction.SELECT_FOLDER,
                accept_label: "Add folder",
                cancel_label: "Cancel",
            });
            chooser.connect("response", (dialog, response) => {
                if (response === Gtk.ResponseType.ACCEPT) {
                    const path = dialog.get_file()?.get_path();
                    if (path) {
                        const roots = rootsRow
                            .get_text()
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean);
                        if (!roots.includes(path)) {
                            roots.push(path);
                        }
                        rootsRow.set_text(roots.join(", "));
                    }
                }
                chooser.destroy();
            });
            chooser.show();
        });
        browseRow.add_suffix(browseButton);
        group.add(browseRow);

        const saveRow = new Adw.ActionRow({
            title: "Apply photo settings",
            subtitle: "Changes apply to this widget immediately",
        });
        const saveButton = new Gtk.Button({
            label: "Save",
            valign: Gtk.Align.CENTER,
            css_classes: ["suggested-action"],
        });
        saveButton.connect("clicked", () => {
            const roots = rootsRow
                .get_text()
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
            this.updateWidgetConfig(settings, widget.id, {
                roots: roots.length > 0 ? roots : defaults,
            });
            saveButton.set_label("Saved");
        });
        saveRow.add_suffix(saveButton);
        group.add(saveRow);
    }

    private addTextSettings(
        page: InstanceType<typeof Adw.PreferencesPage>,
        window: Adw.PreferencesWindow,
        settings: PreferencesSettings,
        widget: WidgetInstanceConfig,
    ): void {
        const group = new Adw.PreferencesGroup({
            title: `Text · ${widget.id}`,
            description:
                "Display text directly or read from a text file. A file path takes priority over inline text.",
        });
        page.add(group);
        const pathRow = new Adw.EntryRow({title: "Text file path"});
        pathRow.set_text(
            typeof widget.config.path === "string" ? widget.config.path : "",
        );
        group.add(pathRow);

        const browseRow = new Adw.ActionRow({
            title: "Choose a text file",
            subtitle: "Use a monitored file as the widget's content source",
        });
        const browseButton = new Gtk.Button({
            label: "Browse…",
            valign: Gtk.Align.CENTER,
        });
        browseButton.connect("clicked", () => {
            const chooser = new Gtk.FileChooserNative({
                title: "Choose a text file",
                transient_for: window,
                action: Gtk.FileChooserAction.OPEN,
                accept_label: "Select",
                cancel_label: "Cancel",
            });
            chooser.connect("response", (dialog, response) => {
                if (response === Gtk.ResponseType.ACCEPT) {
                    const path = dialog.get_file()?.get_path();
                    if (path) {
                        pathRow.set_text(path);
                    }
                }
                chooser.destroy();
            });
            chooser.show();
        });
        browseRow.add_suffix(browseButton);
        group.add(browseRow);

        const inlineRow = new Adw.ActionRow({
            title: "Inline text",
            subtitle: "Used when the text file path is empty",
        });
        const textView = new Gtk.TextView({
            wrap_mode: Gtk.WrapMode.WORD_CHAR,
            left_margin: 8,
            right_margin: 8,
            top_margin: 8,
            bottom_margin: 8,
            hexpand: true,
            vexpand: true,
        });
        textView.buffer.set_text(
            typeof widget.config.text === "string" ? widget.config.text : "",
            -1,
        );
        const scroller = new Gtk.ScrolledWindow({
            min_content_width: 240,
            min_content_height: 90,
            hexpand: true,
            child: textView,
        });
        inlineRow.add_suffix(scroller);
        group.add(inlineRow);

        const saveRow = new Adw.ActionRow({
            title: "Apply text settings",
            subtitle: "Changes apply to this widget immediately",
        });
        const saveButton = new Gtk.Button({
            label: "Save",
            valign: Gtk.Align.CENTER,
            css_classes: ["suggested-action"],
        });
        saveButton.connect("clicked", () => {
            const [start, end] = textView.buffer.get_bounds();
            const text = textView.buffer.get_text(start, end, true);
            this.updateWidgetConfig(settings, widget.id, {
                path: pathRow.get_text().trim(),
                text,
            });
            saveButton.set_label("Saved");
        });
        saveRow.add_suffix(saveButton);
        group.add(saveRow);
    }

    private updateWidgetConfig(
        settings: PreferencesSettings,
        widgetId: string,
        patch: Record<string, unknown>,
    ): void {
        const config = parse(settings.get_string("profiles-json"));
        const profile = config.profiles[config.activeProfile];
        const widget = profile?.widgets.find((item) => item.id === widgetId);
        if (!profile || !widget) {
            return;
        }
        const nextConfig = {...widget.config, ...patch};
        if (typeof nextConfig.path === "string" && !nextConfig.path.trim()) {
            delete nextConfig.path;
        }
        widget.config = nextConfig;
        settings.set_string("profiles-json", JSON.stringify(config));
    }

    private widgetLabel(type: string): string {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
}
