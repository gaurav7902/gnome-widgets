import Clutter from "gi://Clutter";
import St from "gi://St";
import type {WidgetInstanceConfig} from "../../lib/config.js";
import {
    normalizeSystemConfig,
    renderSystemMetrics,
    type SystemSnapshot,
} from "../../lib/system.js";

export class SystemWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-system",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "utilities-system-monitor-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly caption = new St.Label({style_class: "lm-system-caption"});
    private readonly rows = new Map<
        string,
        {
            container: InstanceType<typeof St.BoxLayout>;
            value: InstanceType<typeof St.Label>;
        }
    >();
    private config: WidgetInstanceConfig;
    private destroyed = false;

    constructor(config: WidgetInstanceConfig) {
        this.config = config;
        this.caption.set_text("System");
        this.header.add_child(this.icon);
        this.header.add_child(this.caption);
        this.actor.add_child(this.header);
        this.render(null);
    }

    update(config: WidgetInstanceConfig): void {
        if (this.destroyed) {
            return;
        }
        this.config = config;
        this.render(null);
    }

    updateSnapshot(snapshot: SystemSnapshot): void {
        if (!this.destroyed) {
            this.render(snapshot);
        }
    }

    get enabledMetrics(): ("cpu" | "memory" | "network")[] {
        return (["cpu", "memory", "network"] as const).filter(
            (metric) =>
                normalizeSystemConfig(this.config.config).metrics[metric]
                    .enabled,
        );
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.actor.destroy();
        this.rows.clear();
    }

    private render(snapshot: SystemSnapshot | null): void {
        const metrics = renderSystemMetrics(
            snapshot ?? {cpu: null, memory: null, network: [], timestamp: 0},
            this.config.config,
        );
        const configured = normalizeSystemConfig(this.config.config);
        for (const metric of metrics) {
            let row = this.rows.get(metric.metric);
            if (!row) {
                const container = new St.BoxLayout({
                    orientation:
                        configured.layout === "vertical"
                            ? Clutter.Orientation.VERTICAL
                            : Clutter.Orientation.HORIZONTAL,
                    style_class: "lm-system-row",
                });
                const label = new St.Label({style_class: "lm-system-label"});
                const value = new St.Label({style_class: "lm-system-value"});
                container.add_child(label);
                container.add_child(value);
                this.actor.add_child(container);
                row = {container, value};
                this.rows.set(metric.metric, row);
                label.set_text(configured.showLabels ? metric.label : "");
            }
            row.value.set_text(metric.text);
        }
    }
}

export const create = ({
    config,
}: {
    config: WidgetInstanceConfig;
}): SystemWidget => new SystemWidget(config);
