export interface SparklinePoint {
    x: number;
    y: number;
}

export interface SparklineScale {
    min: number;
    max: number;
    points: SparklinePoint[];
}

export const sparklineScale = (
    values: readonly number[],
    width: number,
    height: number,
    padding = 2,
): SparklineScale => {
    const finite = values.filter((value) => Number.isFinite(value));
    const min = finite.length > 0 ? Math.min(...finite) : 0;
    const max = finite.length > 0 ? Math.max(...finite) : 1;
    const range = max - min || 1;
    const drawableWidth = Math.max(0, width - padding * 2);
    const drawableHeight = Math.max(0, height - padding * 2);
    const last = Math.max(1, values.length - 1);
    const points = values.map((value, index) => ({
        x: padding + (index / last) * drawableWidth,
        y: padding + (1 - (value - min) / range) * drawableHeight,
    }));
    return {min, max, points};
};

export const clampBarValue = (value: number): number =>
    Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
