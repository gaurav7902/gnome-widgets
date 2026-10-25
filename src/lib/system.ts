export interface SystemSnapshot {
    cpu: number | null;
    memory: {
        total: number;
        available: number;
        used: number;
        swapTotal: number;
        swapFree: number;
    } | null;
    network: {
        name: string;
        receivedPerSecond: number;
        transmittedPerSecond: number;
    }[];
    timestamp: number;
}

export type SystemMetric = "cpu" | "memory" | "network";
export type SystemView = "ring" | "bar" | "sparkline" | "number";
export type SystemLayout = "horizontal" | "vertical" | "grid";

export interface SystemMetricConfig {
    enabled: boolean;
    view: SystemView;
    label: string;
}

export interface SystemConfig {
    layout: SystemLayout;
    showLabels: boolean;
    metrics: Record<SystemMetric, SystemMetricConfig>;
}

export interface SystemMetricView {
    metric: SystemMetric;
    label: string;
    view: SystemView;
    value: number | null;
    text: string;
}

const views = new Set<SystemView>(["ring", "bar", "sparkline", "number"]);
const layouts = new Set<SystemLayout>(["horizontal", "vertical", "grid"]);

export const normalizeSystemConfig = (raw: unknown): SystemConfig => {
    const value =
        typeof raw === "object" && raw !== null && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
    const rawMetrics =
        typeof value.metrics === "object" &&
        value.metrics !== null &&
        !Array.isArray(value.metrics)
            ? (value.metrics as Record<string, unknown>)
            : {};
    const metric = (
        name: SystemMetric,
        fallback: string,
    ): SystemMetricConfig => {
        const source =
            typeof rawMetrics[name] === "object" &&
            rawMetrics[name] !== null &&
            !Array.isArray(rawMetrics[name])
                ? (rawMetrics[name] as Record<string, unknown>)
                : {};
        return {
            enabled: source.enabled !== false,
            view: views.has(source.view as SystemView)
                ? (source.view as SystemView)
                : "number",
            label:
                typeof source.label === "string" && source.label.trim()
                    ? source.label.trim()
                    : fallback,
        };
    };
    return {
        layout: layouts.has(value.layout as SystemLayout)
            ? (value.layout as SystemLayout)
            : "horizontal",
        showLabels: value.showLabels !== false,
        metrics: {
            cpu: metric("cpu", "CPU"),
            memory: metric("memory", "Memory"),
            network: metric("network", "Network"),
        },
    };
};

export const renderSystemMetrics = (
    snapshot: SystemSnapshot,
    rawConfig: unknown,
): SystemMetricView[] => {
    const config = normalizeSystemConfig(rawConfig);
    return (Object.keys(config.metrics) as SystemMetric[]).flatMap((metric) => {
        const setting = config.metrics[metric];
        if (!setting.enabled) {
            return [];
        }
        const value =
            metric === "cpu"
                ? snapshot.cpu
                : metric === "memory" && snapshot.memory
                  ? snapshot.memory.total > 0
                      ? (snapshot.memory.used / snapshot.memory.total) * 100
                      : null
                  : metric === "network"
                    ? snapshot.network.reduce(
                          (total, item) =>
                              total +
                              item.receivedPerSecond +
                              item.transmittedPerSecond,
                          0,
                      )
                    : null;
        return [
            {
                metric,
                label: setting.label,
                view: setting.view,
                value,
                text:
                    value === null
                        ? "Not available"
                        : metric === "network"
                          ? `${Math.round(value)} B/s`
                          : `${Math.round(value)}%`,
            },
        ];
    });
};
