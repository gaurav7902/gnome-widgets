import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import type {WidgetRegistry} from "./registry.js";

export interface IndicatorSettings {
    get_boolean(key: string): boolean;
    set_boolean(key: string, value: boolean): void;
    connect(signal: string, callback: () => void): number;
    disconnect(id: number): void;
}

export interface IndicatorActions {
    resetLayout(): void;
    openPreferences(): void;
    addWidget(type: string): void;
}

export class LumenIndicator {
    private readonly button = (() => {
        const btn = new PanelMenu.Button(0.0, "Lumen", false);
        const icon = new St.Icon({
            icon_name: "view-grid-symbolic",
            style_class: "system-status-icon",
        });
        btn.add_child(icon);
        return btn;
    })();
    private readonly editItem: PopupMenu.PopupMenuItem;
    private readonly lockItem: PopupMenu.PopupSwitchMenuItem;
    private readonly resetItem: PopupMenu.PopupImageMenuItem;
    private readonly preferencesItem: PopupMenu.PopupImageMenuItem;
    private readonly signalIds: number[] = [];
    private destroyed = false;

    constructor(
        private readonly settings: IndicatorSettings,
        private readonly actions: IndicatorActions,
        registry: WidgetRegistry,
    ) {
        this.editItem = new PopupMenu.PopupMenuItem("Arrange widgets…");
        this.lockItem = new PopupMenu.PopupSwitchMenuItem(
            "Lock layout",
            settings.get_boolean("lock-layout"),
        );
        this.button.menu.addMenuItem(this.editItem);
        this.button.menu.addMenuItem(this.lockItem);
        this.button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.resetItem = new PopupMenu.PopupImageMenuItem(
            "Reset layout",
            "view-refresh-symbolic",
        );
        this.preferencesItem = new PopupMenu.PopupImageMenuItem(
            "Open preferences",
            "preferences-system-symbolic",
        );
        this.button.menu.addMenuItem(this.resetItem);
        this.button.menu.addMenuItem(this.preferencesItem);
        this.signalIds.push(
            this.editItem.connect("activate", () => {
                if (!settings.get_boolean("edit-mode")) {
                    settings.set_boolean("edit-mode", true);
                }
            }),
            this.lockItem.connect("toggled", (_item, state) => {
                const active =
                    typeof state === "boolean" ? state : _item.checked;
                if (settings.get_boolean("lock-layout") !== active) {
                    settings.set_boolean("lock-layout", active);
                }
            }),
            this.resetItem.connect("activate", actions.resetLayout),
            this.preferencesItem.connect("activate", actions.openPreferences),
            settings.connect("changed::edit-mode", () => this.sync()),
            settings.connect("changed::lock-layout", () => this.sync()),
            settings.connect("changed::show-panel-indicator", () =>
                this.syncVisibility(),
            ),
        );
        for (const manifest of registry.list()) {
            const item = new PopupMenu.PopupImageMenuItem(
                `Add ${manifest.label}`,
                manifest.icon,
            );
            this.button.menu.addMenuItem(item);
            this.signalIds.push(
                item.connect("activate", () =>
                    actions.addWidget(manifest.type),
                ),
            );
        }
    }

    enable(): void {
        Main.panel.addToStatusArea("lumen-indicator", this.button);
        this.sync();
    }

    disable(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        for (const id of this.signalIds) {
            try {
                this.settings.disconnect(id);
            } catch {
                // ignore
            }
        }
        this.button.destroy();
    }

    private sync(): void {
        if (this.destroyed) {
            return;
        }
        this.lockItem.setToggleState(this.settings.get_boolean("lock-layout"));
        this.syncVisibility();
    }

    private syncVisibility(): void {
        this.button.visible = this.settings.get_boolean("show-panel-indicator");
    }
}
