import St from "gi://St";
import {clampBarValue} from "../lib/sparkline.js";
import type {Theme} from "../core/theme.js";

export interface BarOptions {
    theme: Theme;
    value?: number;
    width?: number;
    height?: number;
    color?: string;
    track?: string;
}

export class Bar {
    readonly actor: InstanceType<typeof St.Widget>;
    private readonly fill: InstanceType<typeof St.Widget>;
    private readonly width: number;
    private readonly height: number;
    private value: number;
    private color: string;
    private track: string;

    constructor(options: BarOptions) {
        this.actor = new St.Widget({
            reactive: false,
            can_focus: false,
            style_class: "lm-bar",
        });
        this.width = options.width ?? 160;
        this.height = options.height ?? 8;
        this.fill = new St.Widget({reactive: false});
        this.value = clampBarValue(options.value ?? 0);
        this.color = options.color ?? options.theme.palette.accent;
        this.track = options.track ?? options.theme.palette.surfaceAlt;
        this.actor.set_size?.(this.width, this.height);
        this.actor.add_child?.(this.fill);
        this.applyStyle();
    }

    setValue(value: number): void {
        this.value = clampBarValue(value);
        this.applyStyle();
    }

    setColor(color: string): void {
        this.color = color;
        this.applyStyle();
    }

    setTrack(track: string): void {
        this.track = track;
        this.applyStyle();
    }

    destroy(): void {
        this.actor.destroy();
    }

    private applyStyle(): void {
        this.actor.set_style(
            [`background-color: ${this.track};`, `border-radius: 999px;`].join(
                " ",
            ),
        );
        this.fill.set_size?.(Math.round(this.width * this.value), this.height);
        this.fill.set_style(
            `background-color: ${this.color}; border-radius: 999px;`,
        );
    }
}

export const createBar = (options: BarOptions): Bar => new Bar(options);
