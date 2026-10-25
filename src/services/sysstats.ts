import {cpuUsage, parseProcStat} from "../lib/procstat.js";
import {parseMemInfo, type MemoryInfo} from "../lib/meminfo.js";
import {
    networkRates,
    parseNetDev,
    type NetworkRate,
    type NetworkCounter,
} from "../lib/netdev.js";
import {SharedTicker, type TickSubscription} from "../lib/ticker.js";

export type MetricName = "cpu" | "memory" | "network";

export interface SystemSnapshot {
    cpu: number | null;
    memory: MemoryInfo | null;
    network: NetworkRate[];
    timestamp: number;
}

export const SYSTEM_METRICS: readonly MetricName[] = [
    "cpu",
    "memory",
    "network",
];

export interface SystemReader {
    read(path: string): Promise<string>;
}

export interface MetricSubscription {
    release(): void;
}

type Listener = (snapshot: SystemSnapshot) => void;

const HISTORY_LIMIT = 120;

export class SystemStatsService {
    private readonly listeners = new Map<
        MetricName,
        Set<(snapshot: SystemSnapshot) => void>
    >([
        ["cpu", new Set()],
        ["memory", new Set()],
        ["network", new Set()],
    ]);
    private readonly history = new Map<MetricName, SystemSnapshot[]>();
    private readonly subscriptions = new Map<MetricName, TickSubscription>();
    private previousCpu: ReturnType<typeof parseProcStat>[number] | null = null;
    private previousNetwork: NetworkCounter[] = [];
    private destroyed = false;

    constructor(
        private readonly reader: SystemReader,
        private readonly ticker: SharedTicker,
        private readonly intervalMs = 1000,
        private readonly onError: (
            error: unknown,
            metric: MetricName,
        ) => void = (error, metric) =>
            console.warn(`System ${metric} poll failed: ${String(error)}`),
    ) {}

    acquire(
        metric: MetricName,
        listener: Listener,
        intervalMs = this.intervalMs,
    ): MetricSubscription {
        if (this.destroyed) {
            throw new Error("SystemStatsService has been destroyed");
        }
        const listeners = this.listeners.get(metric);
        if (!listeners) {
            throw new Error(`Unsupported metric: ${metric}`);
        }
        listeners.add(listener);
        if (!this.subscriptions.has(metric)) {
            const interval = Math.min(60_000, Math.max(500, intervalMs));
            this.subscriptions.set(
                metric,
                this.ticker.acquire(interval, () => {
                    void this.poll(metric);
                }),
            );
        }
        let released = false;
        return {
            release: () => {
                if (released) {
                    return;
                }
                released = true;
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.subscriptions.get(metric)?.release();
                    this.subscriptions.delete(metric);
                }
            },
        };
    }

    getHistory(metric: MetricName): readonly SystemSnapshot[] {
        return this.history.get(metric) ?? [];
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        for (const subscription of this.subscriptions.values()) {
            subscription.release();
        }
        this.subscriptions.clear();
        for (const listeners of this.listeners.values()) {
            listeners.clear();
        }
        this.history.clear();
    }

    private async poll(metric: MetricName): Promise<void> {
        if (this.destroyed) {
            return;
        }
        try {
            const snapshot = await this.readSnapshot(metric);
            if (this.destroyed) {
                return;
            }
            const history = this.history.get(metric) ?? [];
            history.push(snapshot);
            if (history.length > HISTORY_LIMIT) {
                history.splice(0, history.length - HISTORY_LIMIT);
            }
            this.history.set(metric, history);
            for (const listener of this.listeners.get(metric) ?? []) {
                listener(snapshot);
            }
        } catch (error) {
            this.onError(error, metric);
        }
    }

    private async readSnapshot(metric: MetricName): Promise<SystemSnapshot> {
        const timestamp = Date.now();
        if (metric === "cpu") {
            const current =
                parseProcStat(await this.reader.read("/proc/stat"))[0] ?? null;
            const cpu =
                current && this.previousCpu
                    ? cpuUsage([this.previousCpu], [current]).total
                    : null;
            this.previousCpu = current;
            return {
                cpu,
                memory: null,
                network: [],
                timestamp,
            };
        }
        if (metric === "memory") {
            return {
                cpu: null,
                memory: parseMemInfo(await this.reader.read("/proc/meminfo")),
                network: [],
                timestamp,
            };
        }
        const current = parseNetDev(await this.reader.read("/proc/net/dev"));
        const network = networkRates(this.previousNetwork, current, 1);
        this.previousNetwork = current;
        return {cpu: null, memory: null, network, timestamp};
    }
}
