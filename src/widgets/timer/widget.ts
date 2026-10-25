import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import St from "gi://St";
import type {WidgetInstanceConfig} from "../../lib/config.js";
import {renderTimerView} from "../../lib/timer-view.js";
import {
    pauseTimer,
    resetTimer,
    startTimer,
    type TimerState,
} from "../../lib/timer.js";

export class TimerWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-timer",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "alarm-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly caption = new St.Label({
        style_class: "lm-timer-caption",
    });
    private readonly title = new St.Label({style_class: "lm-timer-title"});
    private readonly detail = new St.Label({style_class: "lm-timer-detail"});
    private readonly actions = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-timer-actions",
    });
    private readonly startButton = new St.Button({
        label: "Start",
        style_class: "lm-timer-button",
        reactive: true,
        can_focus: true,
    });
    private readonly pauseButton = new St.Button({
        label: "Pause",
        style_class: "lm-timer-button",
        reactive: true,
        can_focus: true,
    });
    private readonly resetButton = new St.Button({
        label: "Reset",
        style_class: "lm-timer-button",
        reactive: true,
        can_focus: true,
    });
    private state: TimerState;
    private timerId: number | null = null;
    private destroyed = false;

    constructor(private readonly config: WidgetInstanceConfig) {
        this.state = this.readState();
        this.caption.set_text("Timer");
        this.header.add_child(this.icon);
        this.header.add_child(this.caption);
        this.actor.add_child(this.header);
        this.actor.add_child(this.title);
        this.actor.add_child(this.detail);
        this.actions.add_child(this.startButton);
        this.actions.add_child(this.pauseButton);
        this.actions.add_child(this.resetButton);
        this.actor.add_child(this.actions);
        this.startButton.connect("clicked", () =>
            this.start(this.state.durationSeconds),
        );
        this.pauseButton.connect("clicked", () => this.pause());
        this.resetButton.connect("clicked", () => this.reset());
        this.render();
        this.startTicker();
    }

    update(_config: WidgetInstanceConfig): void {
        if (!this.destroyed) {
            this.render();
        }
    }

    start(durationSeconds: number): void {
        this.state = startTimer(durationSeconds);
        this.persist();
        this.render();
    }

    pause(): void {
        if (!this.destroyed) {
            this.state = pauseTimer(this.state);
            this.persist();
            this.render();
        }
    }

    reset(): void {
        if (!this.destroyed) {
            this.state = resetTimer(this.state);
            this.persist();
            this.render();
        }
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        if (this.timerId !== null) {
            GLib.Source.remove(this.timerId);
            this.timerId = null;
        }
        this.actor.destroy();
    }

    private readState(): TimerState {
        const raw = this.config.config.timer;
        if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
            const value = raw as Record<string, unknown>;
            return {
                durationSeconds:
                    typeof value.durationSeconds === "number"
                        ? Math.max(0, value.durationSeconds)
                        : 300,
                initialDuration:
                    typeof value.initialDuration === "number"
                        ? value.initialDuration
                        : 300,
                endTimestamp:
                    typeof value.endTimestamp === "number"
                        ? value.endTimestamp
                        : null,
                running: value.running === true,
            };
        }
        return {
            durationSeconds: 300,
            initialDuration: 300,
            endTimestamp: null,
            running: false,
        };
    }

    private render(): void {
        const view = renderTimerView(this.state);
        this.title.set_text(view.title);
        this.detail.set_text(view.detail);
        const startBtn = this.startButton as unknown as {
            show(): void;
            hide(): void;
        };
        const pauseBtn = this.pauseButton as unknown as {
            show(): void;
            hide(): void;
        };
        if (this.state.running) {
            startBtn.hide();
            pauseBtn.show();
        } else {
            startBtn.show();
            pauseBtn.hide();
        }
    }

    private persist(): void {
        const target = this.config.config;
        target.timer = {...this.state};
    }

    private startTicker(): void {
        this.timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            1,
            () => {
                if (this.destroyed) {
                    this.timerId = null;
                    return GLib.SOURCE_REMOVE;
                }
                this.render();
                return GLib.SOURCE_CONTINUE;
            },
        );
    }
}

export const create = ({config}: {config: WidgetInstanceConfig}): TimerWidget =>
    new TimerWidget(config);
