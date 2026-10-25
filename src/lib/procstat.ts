export interface CpuTimes {
    user: number;
    nice: number;
    system: number;
    idle: number;
    iowait: number;
    irq: number;
    softirq: number;
    steal: number;
}

export interface CpuUsage {
    total: number;
    perCore: number[];
}

export const parseProcStat = (contents: string): CpuTimes[] => {
    const result: CpuTimes[] = [];
    for (const line of contents.split(/\r?\n/)) {
        const match = /^cpu(\d*)\s+(.+)$/.exec(line);
        if (!match) {
            continue;
        }
        const values = match[2]
            .trim()
            .split(/\s+/)
            .map((value) => Number(value));
        if (
            values.length < 4 ||
            values.some((value) => !Number.isFinite(value))
        ) {
            continue;
        }
        result.push({
            user: values[0] ?? 0,
            nice: values[1] ?? 0,
            system: values[2] ?? 0,
            idle: values[3] ?? 0,
            iowait: values[4] ?? 0,
            irq: values[5] ?? 0,
            softirq: values[6] ?? 0,
            steal: values[7] ?? 0,
        });
    }
    return result;
};

export const cpuUsage = (
    previous: readonly CpuTimes[],
    current: readonly CpuTimes[],
): CpuUsage => {
    const usage = current.map((now, index) => usageDelta(previous[index], now));
    return {total: usage[0] ?? 0, perCore: usage.slice(1)};
};

function usageDelta(previous: CpuTimes | undefined, current: CpuTimes): number {
    if (!previous) {
        return 0;
    }
    const previousIdle = previous.idle + previous.iowait;
    const currentIdle = current.idle + current.iowait;
    const previousTotal = sum(previous);
    const currentTotal = sum(current);
    const totalDelta = Math.max(0, currentTotal - previousTotal);
    const idleDelta = Math.max(0, currentIdle - previousIdle);
    return totalDelta === 0
        ? 0
        : Math.min(100, ((totalDelta - idleDelta) / totalDelta) * 100);
}

function sum(times: CpuTimes): number {
    return Object.values(times).reduce((total, value) => total + value, 0);
}
