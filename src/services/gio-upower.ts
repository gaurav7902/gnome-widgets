import {UPowerBatteryService} from "./upower.js";

export class DummyPowerSource {
    connect(_listener: (devices: []) => void): {disconnect(): void} {
        return {
            disconnect: () => {},
        };
    }
}

export const createUPowerService = (): UPowerBatteryService =>
    new UPowerBatteryService(new DummyPowerSource());
