export type BatteryState = "charging" | "discharging" | "full" | "unknown";
export interface BatteryInfo {
    percentage: number;
    state: BatteryState;
    timeSeconds: number | null;
}

export interface BatteryDevice extends BatteryInfo {
    id: string;
    name: string;
    kind: "laptop" | "peripheral" | "unknown";
}

export const normalizeBattery = (raw: Partial<BatteryInfo>): BatteryInfo => ({
    percentage: Number.isFinite(raw.percentage)
        ? Math.min(100, Math.max(0, raw.percentage as number))
        : 0,
    state:
        raw.state === "charging" ||
        raw.state === "discharging" ||
        raw.state === "full"
            ? raw.state
            : "unknown",
    timeSeconds:
        Number.isFinite(raw.timeSeconds) && (raw.timeSeconds as number) >= 0
            ? (raw.timeSeconds as number)
            : null,
});
