export interface TickScheduler {
    schedule(delayMs: number, callback: () => void): number;
    cancel(id: number): void;
}

export interface TickSubscription {
    release(): void;
}

export class SharedTicker {
    private readonly intervals = new Map<number, Set<(now: number) => void>>();
    private readonly due = new Map<number, number>();
    private timer: number | null = null;
    private activeInterval = 0;

    constructor(private readonly scheduler: TickScheduler) {}

    acquire(
        intervalMs: number,
        callback: (now: number) => void,
    ): TickSubscription {
        const interval = Math.max(1, Math.round(intervalMs));
        const callbacks = this.intervals.get(interval) ?? new Set();
        callbacks.add(callback);
        this.intervals.set(interval, callbacks);
        if (!this.due.has(interval)) {
            const now = Date.now();
            this.due.set(
                interval,
                interval === 1000
                    ? now + (1000 - (now % 1000))
                    : now + interval,
            );
        }
        this.restart();
        let released = false;
        return {
            release: () => {
                if (released) {
                    return;
                }
                released = true;
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.intervals.delete(interval);
                    this.due.delete(interval);
                }
                this.restart();
            },
        };
    }

    destroy(): void {
        if (this.timer !== null) {
            this.scheduler.cancel(this.timer);
            this.timer = null;
        }
        this.intervals.clear();
        this.due.clear();
    }

    private restart(): void {
        if (this.timer !== null) {
            this.scheduler.cancel(this.timer);
            this.timer = null;
        }
        const next = [...this.intervals.keys()].sort((a, b) => a - b)[0];
        if (next === undefined) {
            this.activeInterval = 0;
            return;
        }
        this.activeInterval = next;
        const now = Date.now();
        const delay = next === 1000 ? 1000 - (now % 1000) : next;
        this.timer = this.scheduler.schedule(delay, () => {
            this.timer = null;
            const tick = Date.now();
            for (const [interval, callbacks] of this.intervals) {
                const nextDue = this.due.get(interval) ?? tick + interval;
                if (tick >= nextDue) {
                    this.due.set(
                        interval,
                        nextDue +
                            interval *
                                Math.max(
                                    1,
                                    Math.floor((tick - nextDue) / interval) + 1,
                                ),
                    );
                    for (const callback of callbacks) {
                        callback(tick);
                    }
                }
            }
            this.restart();
        });
    }
}
