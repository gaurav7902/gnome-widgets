import {normalizeBattery, type BatteryDevice} from "../lib/battery.js";

export interface PowerDeviceSnapshot {
    id: string;
    name: string;
    kind?: BatteryDevice["kind"];
    percentage?: number;
    state?: BatteryDevice["state"];
    timeSeconds?: number | null;
}

export interface PowerDeviceSource {
    connect(listener: (devices: PowerDeviceSnapshot[]) => void): {
        disconnect(): void;
    };
}

export interface BatterySnapshot {
    primary: BatteryDevice | null;
    peripherals: BatteryDevice[];
}

export class UPowerBatteryService {
    private readonly listeners = new Set<(snapshot: BatterySnapshot) => void>();
    private readonly connection: {disconnect(): void};
    private destroyed = false;

    constructor(
        source: PowerDeviceSource,
        private readonly onError: (error: unknown) => void = (error) =>
            console.warn(`UPower update failed: ${String(error)}`),
    ) {
        this.connection = source.connect((devices) => {
            try {
                this.emit(devices);
            } catch (error) {
                this.onError(error);
            }
        });
    }

    acquire(listener: (snapshot: BatterySnapshot) => void): {
        release(): void;
    } {
        if (this.destroyed) {
            throw new Error("UPowerBatteryService has been destroyed");
        }
        this.listeners.add(listener);
        let released = false;
        return {
            release: () => {
                if (!released) {
                    released = true;
                    this.listeners.delete(listener);
                }
            },
        };
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.connection.disconnect();
        this.listeners.clear();
    }

    private emit(devices: PowerDeviceSnapshot[]): void {
        if (this.destroyed) {
            return;
        }
        const normalized = devices
            .filter(
                (device) =>
                    typeof device.id === "string" &&
                    typeof device.name === "string",
            )
            .map((device) => ({
                id: device.id,
                name: device.name,
                kind: (device.kind === "laptop" || device.kind === "peripheral"
                    ? device.kind
                    : "unknown") as BatteryDevice["kind"],
                ...normalizeBattery(device),
            }));
        const primary =
            normalized.find((device) => device.kind === "laptop") ?? null;
        const peripherals = normalized
            .filter((device) => device !== primary)
            .slice(0, 8);
        const snapshot = {primary, peripherals};
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}
