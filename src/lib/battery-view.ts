import type {BatteryInfo} from "./battery.js";

export interface BatteryView {
    title: string;
    detail: string;
    available: boolean;
}

export const renderBatteryView = (battery: BatteryInfo | null): BatteryView => {
    if (!battery) {
        return {
            title: "No battery",
            detail: "Battery information is unavailable",
            available: false,
        };
    }
    const time =
        battery.timeSeconds === null
            ? ""
            : ` · ${Math.round(battery.timeSeconds / 60)} min`;
    return {
        title: `${Math.round(battery.percentage)}%`,
        detail: `${battery.state}${time}`,
        available: true,
    };
};
