import {Extension} from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import {Canvas} from "./core/canvas.js";
import {WidgetRuntime} from "./core/runtime.js";
import {EditKeybinding} from "./core/keybinding.js";
import {LumenIndicator} from "./core/indicator.js";
import {WidgetRegistry} from "./core/registry.js";
import {widgetDefinitions} from "./widgets/index.js";
import {resetSessionState} from "./core/session.js";

export default class LumenExtension extends Extension {
    private canvas: Canvas | null = null;
    private runtime: WidgetRuntime | null = null;
    private keybinding: EditKeybinding | null = null;
    private indicator: LumenIndicator | null = null;

    enable(): void {
        if (this.canvas !== null) {
            return;
        }
        const settings = this.getSettings();
        resetSessionState(settings);
        try {
            this.canvas = new Canvas();
            this.canvas.enable();

            this.runtime = new WidgetRuntime(this.canvas, settings);
            this.runtime.enable();

            this.indicator = new LumenIndicator(
                settings,
                {
                    resetLayout: () => this.runtime?.resetLayout(),
                    openPreferences: () => {
                        try {
                            this.openPreferences();
                        } catch (err) {
                            console.error(
                                `[lumen-extension] Failed to open preferences: ${String(err)}`,
                            );
                        }
                    },
                    addWidget: (type) => this.runtime?.addWidget(type),
                },
                new WidgetRegistry(widgetDefinitions),
            );
            this.indicator.enable();

            this.keybinding = new EditKeybinding(settings, () => {
                try {
                    if (!settings.get_boolean("edit-mode")) {
                        settings.set_boolean("edit-mode", true);
                    }
                } catch (err) {
                    console.error(
                        `[lumen-extension] Failed to toggle edit mode via keybinding: ${String(err)}`,
                    );
                }
            });
            this.keybinding.enable();
        } catch (error) {
            console.error(
                `[lumen-extension] Failed to enable extension safely: ${String(error)}`,
            );
            this.disable();
        }
    }

    disable(): void {
        this.runtime?.disable();
        this.runtime = null;
        this.keybinding?.disable();
        this.keybinding = null;
        this.indicator?.disable();
        this.indicator = null;
        this.canvas?.disable();
        this.canvas = null;
        try {
            const settings = this.getSettings();
            resetSessionState(settings);
        } catch {
            // ignore
        }
    }
}
