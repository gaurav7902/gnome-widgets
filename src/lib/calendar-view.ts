import {monthGrid, type CalendarDay} from "./calendar.js";

export interface CalendarConfig {
    weekStartsOn: 0 | 1;
    showWeekNumbers: boolean;
    monthOffset: number;
}

export interface CalendarView {
    title: string;
    days: CalendarDay[];
    weekNumbers: number[];
}

export const normalizeCalendarConfig = (raw: unknown): CalendarConfig => {
    const value =
        typeof raw === "object" && raw !== null && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
    return {
        weekStartsOn: value.weekStartsOn === 1 ? 1 : 0,
        showWeekNumbers: value.showWeekNumbers === true,
        monthOffset:
            typeof value.monthOffset === "number" &&
            Number.isInteger(value.monthOffset)
                ? Math.max(-120, Math.min(120, value.monthOffset))
                : 0,
    };
};

export const renderCalendarView = (
    now = new Date(),
    rawConfig: unknown = {},
): CalendarView => {
    const config = normalizeCalendarConfig(rawConfig);
    const month = new Date(
        now.getFullYear(),
        now.getMonth() + config.monthOffset,
        1,
    );
    const days = monthGrid(month, config.weekStartsOn, now);
    const weekNumbers = config.showWeekNumbers
        ? days
              .filter((_, index) => index % 7 === 0)
              .map((day) => {
                  const date = new Date(day.date);
                  date.setDate(date.getDate() + 3);
                  const first = new Date(date.getFullYear(), 0, 1);
                  return Math.ceil(
                      ((date.getTime() - first.getTime()) / 86400000 +
                          first.getDay() +
                          1) /
                          7,
                  );
              })
        : [];
    return {
        title: new Intl.DateTimeFormat(undefined, {
            month: "long",
            year: "numeric",
        }).format(month),
        days,
        weekNumbers,
    };
};
