export interface Disconnectable {
    disconnect(): void;
}

export type TimerScheduler = (
    callback: () => void,
    delayMs: number,
) => Disconnectable;

export class Signals {
    private readonly connections = new Set<Disconnectable>();

    add(connection: Disconnectable): void {
        this.connections.add(connection);
    }

    disconnectAll(): void {
        for (const connection of this.connections) {
            connection.disconnect();
        }
        this.connections.clear();
    }
}

export class Timers {
    private readonly timers = new Set<Disconnectable>();

    constructor(private readonly scheduler: TimerScheduler) {}

    add(callback: () => void, delayMs: number): Disconnectable {
        let timer: Disconnectable;
        timer = this.scheduler(() => {
            this.timers.delete(timer);
            callback();
        }, delayMs);
        this.timers.add(timer);
        return timer;
    }

    cancelAll(): void {
        for (const timer of this.timers) {
            timer.disconnect();
        }
        this.timers.clear();
    }
}

export class Cancellables {
    private readonly cancellables = new Set<{cancel(): void}>();

    add<T extends {cancel(): void}>(cancellable: T): T {
        this.cancellables.add(cancellable);
        return cancellable;
    }

    cancelAll(): void {
        for (const cancellable of this.cancellables) {
            cancellable.cancel();
        }
        this.cancellables.clear();
    }
}

export class Disposables {
    private readonly disposables = new Set<() => void>();

    add(dispose: () => void): void {
        this.disposables.add(dispose);
    }

    disposeAll(): void {
        for (const dispose of this.disposables) {
            dispose();
        }
        this.disposables.clear();
    }
}
