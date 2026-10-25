export interface NetworkCounter {
    name: string;
    received: number;
    transmitted: number;
}

export interface NetworkRate {
    name: string;
    receivedPerSecond: number;
    transmittedPerSecond: number;
}

export const parseNetDev = (contents: string): NetworkCounter[] => {
    const counters: NetworkCounter[] = [];
    for (const line of contents.split(/\r?\n/)) {
        const match = /^\s*([^:]+):\s+(.+)$/.exec(line);
        if (!match) {
            continue;
        }
        const values = match[2].trim().split(/\s+/).map(Number);
        if (
            values.length < 9 ||
            values.some((value) => !Number.isFinite(value))
        ) {
            continue;
        }
        counters.push({
            name: match[1].trim(),
            received: values[0],
            transmitted: values[8],
        });
    }
    return counters;
};

export const networkRates = (
    previous: readonly NetworkCounter[],
    current: readonly NetworkCounter[],
    elapsedSeconds: number,
): NetworkRate[] => {
    if (elapsedSeconds <= 0 || !Number.isFinite(elapsedSeconds)) {
        return [];
    }
    return current.map((now) => {
        const before = previous.find(({name}) => name === now.name);
        return {
            name: now.name,
            receivedPerSecond: before
                ? Math.max(0, now.received - before.received) / elapsedSeconds
                : 0,
            transmittedPerSecond: before
                ? Math.max(0, now.transmitted - before.transmitted) /
                  elapsedSeconds
                : 0,
        };
    });
};
