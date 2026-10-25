import Clutter from "gi://Clutter";
import St from "gi://St";
import type {WidgetInstanceConfig} from "../../lib/config.js";
import {renderTextView} from "../../lib/text-view.js";

export class TextWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-text-widget",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "text-x-generic-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly caption = new St.Label({style_class: "lm-text-caption"});
    private readonly label = new St.Label({style_class: "lm-text-content"});
    private config: WidgetInstanceConfig;
    private destroyed = false;

    constructor(config: WidgetInstanceConfig) {
        this.config = config;
        this.caption.set_text("Text");
        this.header.add_child(this.icon);
        this.header.add_child(this.caption);
        this.actor.add_child(this.header);
        this.actor.add_child(this.label);
        this.render();
    }

    update(config: WidgetInstanceConfig): void {
        if (!this.destroyed) {
            this.config = config;
            this.render();
        }
    }

    updateContents(contents: string): void {
        if (!this.destroyed) {
            this.render({}, contents);
        }
    }

    showError(message = "Unable to read text source"): void {
        if (!this.destroyed) {
            this.label.set_text(message);
        }
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.actor.destroy();
    }

    private render(
        tokens: Readonly<Record<string, string>> = {},
        contents?: string,
    ): void {
        const view = renderTextView(
            contents === undefined
                ? this.config.config
                : {...this.config.config, text: contents},
            tokens,
        );
        this.label.set_text(view.text || "No text");
    }
}

export const create = ({config}: {config: WidgetInstanceConfig}): TextWidget =>
    new TextWidget(config);
