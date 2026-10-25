import Cairo from "gi://cairo";
import GObject from "gi://GObject";
import St from "gi://St";
import {sparklineScale} from "../lib/sparkline.js";
import type {Theme} from "../core/theme.js";

interface CairoContext {
    setLineWidth(width: number): void;
    setLineCap(cap: number): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
    setSourceRGBA(
        red: number,
        green: number,
        blue: number,
        alpha: number,
    ): void;
    stroke(): void;
    fill(): void;
}

const SparklineActor = GObject.registerClass(
    {GTypeName: "LumenSparkline"},
    class extends St.DrawingArea {
        private values: number[] = [];
        private color = "#3584e4";
        private fill = "#3584e4";

        setValues(values: readonly number[]): void {
            this.values = [...values];
            this.queue_repaint();
        }

        setColors(color: string, fill: string): void {
            this.color = color;
            this.fill = fill;
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
                const points = sparklineScale(
                    this.values,
                    width,
                    height,
                ).points;
                if (points.length === 0) {
                    return;
                }
                const first = points[0];
                const last = points[points.length - 1];
                cairoContext.setLineWidth(2);
                cairoContext.setLineCap(Cairo.LineCap.ROUND);
                cairoContext.moveTo(first.x, height);
                cairoContext.lineTo(first.x, first.y);
                for (const point of points.slice(1)) {
                    cairoContext.lineTo(point.x, point.y);
                }
                cairoContext.lineTo(last.x, height);
                cairoContext.closePath();
                cairoContext.setSourceRGBA(...parseColor(this.fill), 0.2);
                cairoContext.fill();
                cairoContext.moveTo(first.x, first.y);
                for (const point of points.slice(1)) {
                    cairoContext.lineTo(point.x, point.y);
                }
                cairoContext.setSourceRGBA(...parseColor(this.color), 1);
                cairoContext.stroke();
            } finally {
                if (typeof context.$dispose === "function") {
                    context.$dispose();
                }
            }
        }
    },
);

export class Sparkline {
    readonly actor: InstanceType<typeof St.DrawingArea>;
    private readonly values: number[] = [];
    private readonly maxSamples: number;

    constructor(
        readonly theme: Theme,
        maxSamples = 120,
        width = 160,
        height = 48,
    ) {
        this.actor = new SparklineActor();
        this.maxSamples = Math.max(2, Math.round(maxSamples));
        this.actor.set_width(width);
        this.actor.set_height(height);
        this.setColors(theme.palette.accent);
    }

    push(value: number): void {
        if (!Number.isFinite(value)) {
            return;
        }
        this.values.push(value);
        while (this.values.length > this.maxSamples) {
            this.values.shift();
        }
        this.actor.setValues(this.values);
    }

    setValues(values: readonly number[]): void {
        this.values.length = 0;
        this.values.push(...values.slice(-this.maxSamples));
        this.actor.setValues(this.values);
    }

    setColors(color: string, fill = color): void {
        this.actor.setColors(color, fill);
    }

    destroy(): void {
        this.actor.destroy();
    }
}

export const createSparkline = (theme: Theme, maxSamples?: number): Sparkline =>
    new Sparkline(theme, maxSamples);

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
