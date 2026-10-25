import Cairo from "gi://cairo";
import GObject from "gi://GObject";
import St from "gi://St";
import {clampRingValue, ringGeometry} from "../lib/ring.js";
import type {Theme} from "../core/theme.js";

export interface RingGaugeOptions {
    theme: Theme;
    value?: number;
    diameter?: number;
    thickness?: number;
    track?: string;
    color?: string;
    reduceMotion?: boolean;
}

interface CairoContext {
    setLineWidth(width: number): void;
    setLineCap(cap: number): void;
    arc(x: number, y: number, radius: number, start: number, end: number): void;
    setSourceRGBA(
        red: number,
        green: number,
        blue: number,
        alpha: number,
    ): void;
    stroke(): void;
}

const RingGaugeActor = GObject.registerClass(
    {GTypeName: "LumenRingGauge"},
    class extends St.DrawingArea {
        private progress = 0;
        private diameter = 64;
        private thickness = 6;
        private track = "#3d3846";
        private color = "#3584e4";

        setProgress(value: number): void {
            this.progress = clampRingValue(value);
            this.queue_repaint();
        }

        setGeometry(diameter: number, thickness: number): void {
            const geometry = ringGeometry(this.progress, diameter, thickness);
            this.diameter = geometry.diameter;
            this.thickness = geometry.thickness;
            this.set_width(this.diameter);
            this.set_height(this.diameter);
            this.queue_repaint();
        }

        setColors(track: string, color: string): void {
            this.track = track;
            this.color = color;
            this.queue_repaint();
        }

        vfunc_repaint(): void {
            const context = this.get_context() as unknown as {
                $dispose?(): void;
                [key: string]: unknown;
            };
            if (!context) {
                return;
            }
            try {
                const cairoContext = context as unknown as CairoContext;
                const [width, height] = this.get_surface_size();
                if (width <= 0 || height <= 0) {
                    return;
                }
                const geometry = ringGeometry(
                    this.progress,
                    Math.min(width, height),
                    this.thickness,
                );
                const center = Math.min(width, height) / 2;
                const start = -Math.PI / 2;
                drawArc(
                    cairoContext,
                    center,
                    geometry.radius,
                    geometry.thickness,
                    this.track,
                    start,
                    start + Math.PI * 2,
                );
                if (geometry.value > 0) {
                    drawArc(
                        cairoContext,
                        center,
                        geometry.radius,
                        geometry.thickness,
                        this.color,
                        start,
                        start + geometry.value * Math.PI * 2,
                    );
                }
            } finally {
                if (typeof context.$dispose === "function") {
                    context.$dispose();
                }
            }
        }
    },
);

export class RingGauge {
    readonly actor: InstanceType<typeof St.DrawingArea>;
    private value: number;
    private diameter: number;
    private thickness: number;
    private track: string;
    private color: string;

    constructor(options: RingGaugeOptions) {
        this.actor = new RingGaugeActor();
        this.value = clampRingValue(options.value ?? 0);
        this.diameter = options.diameter ?? 64;
        this.thickness = options.thickness ?? 6;
        this.track = options.track ?? options.theme.palette.surfaceAlt;
        this.color = options.color ?? options.theme.palette.accent;
        this.applyTheme(options.theme);
    }

    setValue(value: number): void {
        this.value = clampRingValue(value);
        this.actor.setProgress(this.value);
    }

    setThickness(thickness: number): void {
        this.thickness = thickness;
        this.actor.setGeometry(this.diameter, this.thickness);
    }

    setDiameter(diameter: number): void {
        this.diameter = diameter;
        this.actor.setGeometry(this.diameter, this.thickness);
    }

    setTrack(track: string): void {
        this.track = track;
        this.actor.setColors(this.track, this.color);
    }

    setColor(color: string): void {
        this.color = color;
        this.actor.setColors(this.track, this.color);
    }

    applyTheme(theme: Theme): void {
        this.track = this.track || theme.palette.surfaceAlt;
        this.color = this.color || theme.palette.accent;
        this.actor.setGeometry(this.diameter, this.thickness);
        this.actor.setColors(this.track, this.color);
        this.actor.setProgress(this.value);
    }

    destroy(): void {
        this.actor.destroy();
    }
}

export const createRingGauge = (options: RingGaugeOptions): RingGauge =>
    new RingGauge(options);

function drawArc(
    context: CairoContext,
    center: number,
    radius: number,
    thickness: number,
    color: string,
    start: number,
    end: number,
): void {
    const [red, green, blue] = parseColor(color);
    context.setLineWidth(Math.max(1, thickness));
    context.setLineCap(Cairo.LineCap.ROUND);
    context.arc(center, center, radius, start, end);
    context.setSourceRGBA(red, green, blue, 1);
    context.stroke();
}

function parseColor(value: string): [number, number, number] {
    const hex = value.replace("#", "");
    const normalized =
        hex.length === 3
            ? hex
                  .split("")
                  .map((part) => part + part)
                  .join("")
            : hex;
    const number = Number.parseInt(normalized, 16);
    return [
        ((number >> 16) & 255) / 255,
        ((number >> 8) & 255) / 255,
        (number & 255) / 255,
    ];
}
