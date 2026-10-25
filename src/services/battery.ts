import {normalizeBattery, type BatteryInfo} from "../lib/battery.js";

export interface BatteryReader {
    read(): Promise<Partial<BatteryInfo> | null>;
}

export class BatteryService {
    private listeners = new Set<(value: BatteryInfo | null) => void>();
    private destroyed = false;
    private loading = false;

    constructor(
        private readonly reader: BatteryReader,
        private readonly onError: (error: unknown) => void = (error) =>
            console.warn(`Battery read failed: ${String(error)}`),
    ) {}

    acquire(listener: (value: BatteryInfo | null) => void): {
        release(): void;
    } {
        if (this.destroyed) {
            throw new Error("BatteryService has been destroyed");
        }
        this.listeners.add(listener);
        if (!this.loading) {
            void this.refresh();
        }
        let released = false;
        return {
            release: () => {
                if (released) {
                    return;
                }
                released = true;
                this.listeners.delete(listener);
            },
        };
    }

    destroy(): void {
        this.destroyed = true;
        this.listeners.clear();
    }

    private async refresh(): Promise<void> {
        this.loading = true;
        try {
            const raw = await this.reader.read();
            if (this.destroyed) {
                return;
            }
            const value = raw ? normalizeBattery(raw) : null;
            for (const listener of this.listeners) {
                listener(value);
            }
        } catch (error) {
            this.onError(error);
        } finally {
            this.loading = false;
        }
    }
}
