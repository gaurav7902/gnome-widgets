import {
    formatClock,
    formatWorldClocks,
    type TimeFormat,
    type WorldClock,
} from "./format.js";

export type ClockSizeClass = "compact" | "regular" | "large";
export type ClockMode = "digital" | "analog" | "digital-date" | "world";

export interface ClockConfig {
    mode: ClockMode;
    timeFormat: TimeFormat;
    showSeconds: boolean;
    showWeekday: boolean;
    showDate: boolean;
    locale: string | undefined;
    timeZone: string | undefined;
    worldClocks: WorldClock[];
}

export interface ClockView {
    primary: string;
    secondary: string | null;
    tertiary: string | null;
    mode: ClockMode;
    showSeconds: boolean;
}

const validModes = new Set<ClockMode>([
    "digital",
    "analog",
    "digital-date",
    "world",
]);
const validTimeFormats = new Set<TimeFormat>(["system", "12h", "24h"]);

export const normalizeClockConfig = (raw: unknown): ClockConfig => {
    const value =
        typeof raw === "object" && raw !== null && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
    const mode = validModes.has(value.mode as ClockMode)
        ? (value.mode as ClockMode)
        : "digital";
    const timeFormat = validTimeFormats.has(value.timeFormat as TimeFormat)
        ? (value.timeFormat as TimeFormat)
        : "system";
    const worldClocks = Array.isArray(value.worldClocks)
        ? value.worldClocks.flatMap((clock) => {
              if (
                  typeof clock !== "object" ||
                  clock === null ||
                  Array.isArray(clock)
              ) {
                  return [];
              }
              const item = clock as Record<string, unknown>;
              return typeof item.label === "string" &&
                  item.label.trim() &&
                  typeof item.timeZone === "string" &&
                  item.timeZone.trim()
                  ? [
                        {
                            label: item.label.trim(),
                            timeZone: item.timeZone.trim(),
                        },
                    ]
                  : [];
          })
        : [];
    return {
        mode,
        timeFormat,
        showSeconds: value.showSeconds === true,
        showWeekday: value.showWeekday === true,
        showDate: value.showDate === true || mode === "digital-date",
        locale: typeof value.locale === "string" ? value.locale : undefined,
        timeZone:
            typeof value.timeZone === "string" ? value.timeZone : undefined,
        worldClocks: worldClocks.slice(0, 4),
    };
};

export const renderClockView = (
    date: Date,
    sizeClass: ClockSizeClass,
    rawConfig: unknown,
): ClockView => {
    const config = normalizeClockConfig(rawConfig);
    if (config.mode === "world") {
        const clocks = formatWorldClocks(date, config.worldClocks, {
            timeFormat: config.timeFormat,
            showSeconds: config.showSeconds,
            locale: config.locale,
        });
        return {
            primary: clocks[0] ?? "—",
            secondary: clocks[1] ?? null,
            tertiary: clocks.length > 2 ? clocks.slice(2).join(" · ") : null,
            mode: config.mode,
            showSeconds: config.showSeconds,
        };
    }
    const primary = formatClock(date, {
        timeFormat: config.timeFormat,
        showSeconds: config.showSeconds,
        locale: config.locale,
        timeZone: config.timeZone,
    });
    const secondary =
        sizeClass === "compact" || !config.showDate
            ? null
            : (formatClock(date, {
                  timeFormat: config.timeFormat,
                  showWeekday: config.showWeekday,
                  date: true,
                  locale: config.locale,
                  timeZone: config.timeZone,
              }).split(" · ")[1] ?? null);
    return {
        primary,
        secondary,
        tertiary:
            sizeClass === "large" && config.timeZone ? config.timeZone : null,
        mode: config.mode,
        showSeconds: config.showSeconds,
    };
};
