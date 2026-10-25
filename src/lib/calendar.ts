export interface CalendarDay {
    date: Date;
    day: number;
    inMonth: boolean;
    today: boolean;
}

export const monthGrid = (
    month: Date,
    weekStartsOn = 0,
    today = new Date(),
): CalendarDay[] => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const first = new Date(year, monthIndex, 1);
    const start = new Date(
        year,
        monthIndex,
        1 - ((first.getDay() - weekStartsOn + 7) % 7),
    );
    return Array.from({length: 42}, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return {
            date,
            day: date.getDate(),
            inMonth: date.getMonth() === monthIndex,
            today: date.toDateString() === today.toDateString(),
        };
    });
};
