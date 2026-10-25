import Clutter from "gi://Clutter";
import St from "gi://St";
import type {BatteryInfo} from "../../lib/battery.js";
import {renderBatteryView} from "../../lib/battery-view.js";
import type {WidgetInstanceConfig} from "../../lib/config.js";
import type {BatterySnapshot} from "../../services/upower.js";

export class BatteryWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-battery",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "battery-good-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly caption = new St.Label({
        style_class: "lm-battery-caption",
    });
    private readonly title = new St.Label({
        style_class: "lm-battery-title",
    });
    private readonly detail = new St.Label({
        style_class: "lm-battery-detail",
    });
    private destroyed = false;

    constructor(_config: WidgetInstanceConfig) {
        this.caption.set_text("Battery");
        this.header.add_child(this.icon);
        this.header.add_child(this.caption);
        this.actor.add_child(this.header);
        this.actor.add_child(this.title);
        this.actor.add_child(this.detail);
        this.updateInfo(null);
    }

    update(_config: WidgetInstanceConfig): void {}

    updateInfo(value: BatteryInfo | null): void {
        if (this.destroyed) {
            return;
        }
        const view = renderBatteryView(value);
        this.title.set_text(view.title);
        this.detail.set_text(view.detail);
    }

    updateBattery(snapshot: BatterySnapshot): void {
        this.updateInfo(snapshot.primary);
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.actor.destroy();
    }
}

export const create = ({
    config,
}: {
    config: WidgetInstanceConfig;
}): BatteryWidget => new BatteryWidget(config);
