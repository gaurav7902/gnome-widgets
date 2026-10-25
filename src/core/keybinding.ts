import Meta from "gi://Meta";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

export interface KeybindingSettings {
    get_strv(key: string): string[];
    settings_schema?: {
        has_key(key: string): boolean;
    };
}

export class EditKeybinding {
    private installed = false;

    constructor(
        private readonly settings: KeybindingSettings,
        private readonly onToggle: () => void,
        private readonly name = "toggle-edit-keybinding",
    ) {}

    enable(): void {
        if (this.installed) {
            return;
        }
        if (
            this.settings.settings_schema &&
            typeof this.settings.settings_schema.has_key === "function"
        ) {
            if (!this.settings.settings_schema.has_key(this.name)) {
                console.warn(
                    `[lumen-extension] Keybinding settings schema does not contain key '${this.name}'; skipping keybinding registration.`,
                );
                return;
            }
        }
        Main.wm.addKeybinding(
            this.name,
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            this.onToggle,
        );
        this.installed = true;
    }

    disable(): void {
        if (!this.installed) {
            return;
        }
        Main.wm.removeKeybinding(this.name);
        this.installed = false;
    }
}
