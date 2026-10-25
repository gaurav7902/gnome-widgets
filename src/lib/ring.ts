export interface RingGeometry {
    value: number;
    diameter: number;
    thickness: number;
    radius: number;
    circumference: number;
    dashOffset: number;
}

export const clampRingValue = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.min(1, Math.max(0, value));
};

export const ringGeometry = (
    value: number,
    diameter: number,
    thickness: number,
): RingGeometry => {
    const safeDiameter = Math.max(1, Math.round(diameter));
    const safeThickness = Math.min(
        Math.max(1, Math.round(thickness)),
        Math.floor(safeDiameter / 2),
    );
    const radius = (safeDiameter - safeThickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const normalizedValue = clampRingValue(value);
    return {
        value: normalizedValue,
        diameter: safeDiameter,
        thickness: safeThickness,
        radius,
        circumference,
        dashOffset: circumference * (1 - normalizedValue),
    };
};
