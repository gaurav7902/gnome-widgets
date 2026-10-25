export interface FileContentReader {
    read(path: string): Promise<string>;
    writeAtomic(path: string, contents: string): Promise<void>;
}

export interface FileMonitor {
    watch(path: string, callback: () => void): {cancel(): void};
}

export class FileContentService {
    private readonly listeners = new Map<
        string,
        Set<(contents: string) => void>
    >();
    private readonly watches = new Map<string, {cancel(): void}>();
    private destroyed = false;

    constructor(
        private readonly reader: FileContentReader,
        private readonly monitor: FileMonitor,
        private readonly onError: (error: unknown, path: string) => void = (
            error,
            path,
        ) => console.warn(`File ${path} failed: ${String(error)}`),
    ) {}

    acquire(
        path: string,
        listener: (contents: string) => void,
    ): {
        release(): void;
    } {
        if (this.destroyed) {
            throw new Error("FileContentService has been destroyed");
        }
        const listeners = this.listeners.get(path) ?? new Set();
        listeners.add(listener);
        this.listeners.set(path, listeners);
        if (!this.watches.has(path)) {
            try {
                this.watches.set(
                    path,
                    this.monitor.watch(path, () => {
                        void this.refresh(path);
                    }),
                );
            } catch (error) {
                // A missing parent directory should not prevent the widget
                // from rendering or receiving a first read. The source may be
                // created later by the widget (for example, todo.txt).
                this.onError(error, path);
            }
        }
        void this.refresh(path);
        let released = false;
        return {
            release: () => {
                if (released) {
                    return;
                }
                released = true;
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.listeners.delete(path);
                    this.watches.get(path)?.cancel();
                    this.watches.delete(path);
                }
            },
        };
    }

    async write(path: string, contents: string): Promise<boolean> {
        try {
            await this.reader.writeAtomic(path, contents);
            return true;
        } catch (error) {
            this.onError(error, path);
            return false;
        }
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        for (const watch of this.watches.values()) {
            watch.cancel();
        }
        this.watches.clear();
        this.listeners.clear();
    }

    private async refresh(path: string): Promise<void> {
        try {
            const contents = await this.reader.read(path);
            if (this.destroyed) {
                return;
            }
            for (const listener of this.listeners.get(path) ?? []) {
                listener(contents);
            }
        } catch (error) {
            this.onError(error, path);
        }
    }
}
