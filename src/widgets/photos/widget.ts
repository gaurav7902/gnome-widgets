import Clutter from "gi://Clutter";
import St from "gi://St";
import type {PhotoEntry} from "../../lib/photos.js";
import {selectPhotos} from "../../lib/photos.js";
import type {WidgetInstanceConfig} from "../../lib/config.js";

export class PhotosWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-photos",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "folder-pictures-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly title = new St.Label({style_class: "lm-photos-title"});
    private readonly list = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-photos-list",
    });
    private config: WidgetInstanceConfig;
    private rows: InstanceType<typeof St.Label>[] = [];
    private destroyed = false;

    constructor(config: WidgetInstanceConfig) {
        this.config = config;
        this.header.add_child(this.icon);
        this.header.add_child(this.title);
        this.actor.add_child(this.header);
        this.actor.add_child(this.list);
        this.updateEntries([]);
    }

    update(config: WidgetInstanceConfig): void {
        if (!this.destroyed) {
            this.config = config;
            this.updateEntries([]);
        }
    }

    updateEntries(entries: readonly PhotoEntry[]): void {
        if (this.destroyed) {
            return;
        }
        const limit =
            typeof this.config.config.limit === "number"
                ? this.config.config.limit
                : 6;
        const selected = selectPhotos(entries, limit);
        this.title.set_text(selected.length ? "Photos" : "No photos");
        for (const row of this.rows) {
            row.destroy();
        }
        this.rows = selected.map((photo) => {
            const row = new St.Label({style_class: "lm-photos-row"});
            row.set_text(photo.name);
            this.list.add_child(row);
            return row;
        });
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.actor.destroy();
        this.rows = [];
    }
}

export const create = ({
    config,
}: {
    config: WidgetInstanceConfig;
}): PhotosWidget => new PhotosWidget(config);
