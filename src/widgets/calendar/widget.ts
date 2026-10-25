import Clutter from "gi://Clutter";
import St from "gi://St";
import type {WidgetInstanceConfig} from "../../lib/config.js";
import {
    renderCalendarView,
    type CalendarView,
} from "../../lib/calendar-view.js";

export class CalendarWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-calendar",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
        x_expand: true,
    });
    private readonly icon = new St.Icon({
        icon_name: "x-office-calendar-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly title = new St.Label({
        style_class: "lm-calendar-title",
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER,
    });
    private readonly previousButton = new St.Button({
        label: "‹",
        style_class: "lm-calendar-button",
        reactive: true,
        can_focus: true,
    });
    private readonly todayButton = new St.Button({
        label: "Today",
        style_class: "lm-calendar-button",
        reactive: true,
        can_focus: true,
    });
    private readonly nextButton = new St.Button({
        label: "›",
        style_class: "lm-calendar-button",
        reactive: true,
        can_focus: true,
    });
    private readonly weekdayRow = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-calendar-weekdays",
        x_expand: true,
    });
    private readonly grid = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-calendar-grid",
        x_expand: true,
    });
    private config: WidgetInstanceConfig;
    private dayLabels: InstanceType<typeof St.Label>[] = [];
    private readonly weekdayLabels: InstanceType<typeof St.Label>[] = [];
    private destroyed = false;
    private monthOffset = 0;

    constructor(config: WidgetInstanceConfig) {
        this.config = config;
        const offset = config.config.monthOffset;
        this.monthOffset =
            typeof offset === "number" && Number.isInteger(offset)
                ? Math.max(-120, Math.min(120, offset))
                : 0;
        this.header.add_child(this.icon);
        this.header.add_child(this.previousButton);
        this.header.add_child(this.title);
        this.header.add_child(this.todayButton);
        this.header.add_child(this.nextButton);
        this.actor.add_child(this.header);
        for (let column = 0; column < 7; column += 1) {
            const label = new St.Label({
                style_class: "lm-calendar-weekday",
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
            });
            this.weekdayRow.add_child(label);
            this.weekdayLabels.push(label);
        }
        this.actor.add_child(this.weekdayRow);
        this.actor.add_child(this.grid);
        this.previousButton.connect("clicked", () => this.changeMonth(-1));
        this.todayButton.connect("clicked", () =>
            this.changeMonth(-this.monthOffset),
        );
        this.nextButton.connect("clicked", () => this.changeMonth(1));
        this.render();
    }

    update(config: WidgetInstanceConfig): void {
        if (this.destroyed) {
            return;
        }
        this.config = config;
        this.render();
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.actor.destroy();
        this.dayLabels = [];
        this.weekdayLabels.length = 0;
    }

    private render(): void {
        const weekStartsOn = this.config.config.weekStartsOn === 1 ? 1 : 0;
        const view = renderCalendarView(new Date(), {
            ...this.config.config,
            monthOffset: this.monthOffset,
        });
        const weekdayFormat = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
        });
        const sunday = new Date(2024, 0, 7);
        for (let column = 0; column < this.weekdayLabels.length; column += 1) {
            const date = new Date(sunday);
            date.setDate(sunday.getDate() + ((column + weekStartsOn) % 7));
            this.weekdayLabels[column].set_text(weekdayFormat.format(date));
        }
        this.title.set_text(view.title);
        if (this.dayLabels.length !== view.days.length) {
            for (let row = 0; row < 6; row += 1) {
                const line = new St.BoxLayout({
                    orientation: Clutter.Orientation.HORIZONTAL,
                    style_class: "lm-calendar-week",
                    x_expand: true,
                });
                for (let column = 0; column < 7; column += 1) {
                    const label = new St.Label({
                        style_class: "lm-calendar-day",
                        x_expand: true,
                        y_expand: true,
                        x_align: Clutter.ActorAlign.CENTER,
                        y_align: Clutter.ActorAlign.CENTER,
                    });
                    line.add_child(label);
                    this.dayLabels.push(label);
                }

                this.grid.add_child(line);
            }
        }
        this.applyDays(view);
    }

    private changeMonth(delta: number): void {
        if (this.destroyed) {
            return;
        }
        this.monthOffset = Math.max(
            -120,
            Math.min(120, this.monthOffset + delta),
        );
        this.render();
    }

    private applyDays(view: CalendarView): void {
        view.days.forEach((day, index) => {
            const label = this.dayLabels[index] as any;
            if (label) {
                label.set_text(String(day.day));
                if (day.today) {
                    label.set_style_class_name?.(
                        "lm-calendar-day lm-calendar-today",
                    );
                } else if (!day.inMonth) {
                    label.set_style_class_name?.(
                        "lm-calendar-day lm-calendar-dim",
                    );
                } else {
                    label.set_style_class_name?.("lm-calendar-day");
                }
            }
        });
    }
}

export const create = ({
    config,
}: {
    config: WidgetInstanceConfig;
}): CalendarWidget => new CalendarWidget(config);
