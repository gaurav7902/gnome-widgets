export interface Logger {
    warn(key: string, message: string): void;
    debug(message: string): void;
}

export class RateLimitedLogger implements Logger {
    private readonly lastWarnings = new Map<string, number>();

    constructor(
        private readonly debugEnabled = false,
        private readonly now = () => Date.now(),
        private readonly intervalMs = 60_000,
    ) {}

    warn(key: string, message: string): void {
        const current = this.now();
        const previous = this.lastWarnings.get(key) ?? 0;
        if (current - previous < this.intervalMs) {
            return;
        }
        this.lastWarnings.set(key, current);
        console.warn(`[lumen:${key}] ${message}`);
    }

    debug(message: string): void {
        if (this.debugEnabled) {
            console.debug(`[lumen] ${message}`);
        }
    }
}
