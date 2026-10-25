import Clutter from "gi://Clutter";
import St from "gi://St";
import type {WidgetInstanceConfig} from "../../lib/config.js";

export class MediaWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-media",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "media-playback-start-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly caption = new St.Label({
        style_class: "lm-media-caption",
    });
    private readonly titleLabel = new St.Label({
        style_class: "lm-media-title",
    });
    private readonly artistLabel = new St.Label({
        style_class: "lm-media-artist",
    });
    private destroyed = false;

    constructor(_config: WidgetInstanceConfig) {
        this.caption.set_text("Media");
        this.header.add_child(this.icon);
        this.header.add_child(this.caption);
        this.actor.add_child(this.header);

        const content = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "lm-media-content",
        });
        content.add_child(this.titleLabel);
        content.add_child(this.artistLabel);
        this.actor.add_child(content);

        this.titleLabel.set_text("No media playing");
        this.artistLabel.set_text("");
    }

    update(_config: WidgetInstanceConfig): void {}

    updateMetadata(data: {title?: string; artist?: string}): void {
        if (this.destroyed) {
            return;
        }
        if (data.title) this.titleLabel.set_text(data.title);
        if (data.artist) this.artistLabel.set_text(data.artist);
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.actor.destroy();
    }
}

export const create = ({config}: {config: WidgetInstanceConfig}): MediaWidget =>
    new MediaWidget(config);
