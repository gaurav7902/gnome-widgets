import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import St from "gi://St";
import type {WidgetInstanceConfig} from "../../lib/config.js";
import {renderClockView, type ClockSizeClass} from "../../lib/clock.js";

const intervalFor = (config: Record<string, unknown>): number =>
    config.showSeconds === true ? 1 : 60;

export class ClockWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-clock",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "preferences-system-time-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly caption = new St.Label({style_class: "lm-clock-caption"});
    private readonly primary = new St.Label({style_class: "lm-clock-primary"});
    private readonly secondary = new St.Label({
        style_class: "lm-clock-secondary",
    });
    private readonly tertiary = new St.Label({
        style_class: "lm-clock-tertiary",
    });
    private timerId: number | null = null;
    private config: WidgetInstanceConfig;
    private sizeClass: ClockSizeClass = "regular";
    private destroyed = false;

    constructor(config: WidgetInstanceConfig) {
        this.config = config;
        this.caption.set_text("Clock");
        this.header.add_child(this.icon);
        this.header.add_child(this.caption);
        this.actor.add_child(this.header);
        this.actor.add_child(this.primary);
        this.actor.add_child(this.secondary);
        this.actor.add_child(this.tertiary);
    }

    enable(): void {
        this.render(Date.now());
        this.restartTimer();
    }

    update(config: WidgetInstanceConfig): void {
        if (this.destroyed) {
            return;
        }
        this.config = config;
        this.render(Date.now());
        this.restartTimer();
    }

    setSizeClass(sizeClass: ClockSizeClass): void {
        this.sizeClass = sizeClass;
        this.render(Date.now());
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.stopTimer();
        this.actor.destroy();
    }

    private render(timestamp: number): void {
        const view = renderClockView(
            new Date(timestamp),
            this.sizeClass,
            this.config.config,
        );
        this.primary.set_text(view.primary);
        this.secondary.set_text(view.secondary ?? "");
        this.tertiary.set_text(view.tertiary ?? "");
    }

    private restartTimer(): void {
        this.stopTimer();
        this.timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            intervalFor(this.config.config),
            () => {
                if (this.destroyed) {
                    this.timerId = null;
                    return GLib.SOURCE_REMOVE;
                }
                this.render(Date.now());
                return GLib.SOURCE_CONTINUE;
            },
        );
    }

    private stopTimer(): void {
        if (this.timerId !== null) {
            GLib.Source.remove(this.timerId);
            this.timerId = null;
        }
    }
}

export const create = ({
    config,
}: {
    config: WidgetInstanceConfig;
}): ClockWidget => {
    const widget = new ClockWidget(config);
    widget.enable();
    return widget;
};
