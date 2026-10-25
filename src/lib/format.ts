export type TimeFormat = "system" | "12h" | "24h";

export interface ClockFormatOptions {
    timeFormat?: TimeFormat;
    showSeconds?: boolean;
    showWeekday?: boolean;
    date?: boolean;
    locale?: string;
    timeZone?: string;
}

export interface WorldClock {
    label: string;
    timeZone: string;
}

const formatter = (
    locale: string | undefined,
    options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat => {
    try {
        return new Intl.DateTimeFormat(locale, options);
    } catch {
        const {timeZone: _timeZone, ...withoutTimeZone} = options;
        return new Intl.DateTimeFormat(locale, withoutTimeZone);
    }
};

export const formatClock = (
    date: Date,
    options: ClockFormatOptions = {},
): string => {
    const hour12 =
        options.timeFormat === "12h"
            ? true
            : options.timeFormat === "24h"
              ? false
              : undefined;
    const time = formatter(options.locale, {
        hour: "numeric",
        minute: "2-digit",
        second: options.showSeconds ? "2-digit" : undefined,
        hour12,
        timeZone: options.timeZone,
    }).format(date);
    const parts = [time];
    if (options.showWeekday || options.date) {
        parts.push(
            formatter(options.locale, {
                weekday: options.showWeekday ? "short" : undefined,
                month: options.date ? "short" : undefined,
                day: options.date ? "numeric" : undefined,
                timeZone: options.timeZone,
            }).format(date),
        );
    }
    return parts.join(" · ");
};

export const formatWorldClocks = (
    date: Date,
    clocks: readonly WorldClock[],
    options: Omit<ClockFormatOptions, "timeZone"> = {},
): string[] =>
    clocks.map(({label, timeZone}) => {
        const formatted = formatClock(date, {...options, timeZone});
        return `${label}: ${formatted}`;
    });
