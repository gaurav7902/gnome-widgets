import Clutter from "gi://Clutter";
import St from "gi://St";
import type {WidgetInstanceConfig} from "../../lib/config.js";

export class WeatherWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-weather",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "weather-clear-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly caption = new St.Label({
        style_class: "lm-weather-caption",
    });
    private readonly tempLabel = new St.Label({
        style_class: "lm-weather-temp",
    });
    private readonly summaryLabel = new St.Label({
        style_class: "lm-weather-summary",
    });
    private readonly locationLabel = new St.Label({
        style_class: "lm-weather-location",
    });
    private destroyed = false;

    constructor(_config: WidgetInstanceConfig) {
        this.caption.set_text("Weather");
        this.header.add_child(this.icon);
        this.header.add_child(this.caption);
        this.actor.add_child(this.header);

        const content = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "lm-weather-content",
        });
        content.add_child(this.tempLabel);
        content.add_child(this.summaryLabel);
        content.add_child(this.locationLabel);
        this.actor.add_child(content);

        this.tempLabel.set_text("--°");
        this.summaryLabel.set_text("Weather unavailable");
        this.locationLabel.set_text("GNOME Weather");
    }

    update(_config: WidgetInstanceConfig): void {}

    updateWeather(data: {
        temp?: string;
        summary?: string;
        location?: string;
        icon?: string;
    }): void {
        if (this.destroyed) {
            return;
        }
        if (data.temp) this.tempLabel.set_text(data.temp);
        if (data.summary) this.summaryLabel.set_text(data.summary);
        if (data.location) this.locationLabel.set_text(data.location);
        if (data.icon) this.icon.set_icon_name(data.icon);
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
}): WeatherWidget => new WeatherWidget(config);
