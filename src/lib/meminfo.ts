export interface MemoryInfo {
    total: number;
    available: number;
    used: number;
    swapTotal: number;
    swapFree: number;
}

export const parseMemInfo = (contents: string): MemoryInfo => {
    const values = new Map<string, number>();
    for (const line of contents.split(/\r?\n/)) {
        const match = /^(\w+):\s+(\d+)/.exec(line);
        if (match) {
            values.set(match[1], Number(match[2]) * 1024);
        }
    }
    const total = values.get("MemTotal") ?? 0;
    const available = values.get("MemAvailable") ?? values.get("MemFree") ?? 0;
    const swapTotal = values.get("SwapTotal") ?? 0;
    const swapFree = values.get("SwapFree") ?? 0;
    return {
        total,
        available,
        used: Math.max(0, total - available),
        swapTotal,
        swapFree,
    };
};
