import type {PhotoEntry} from "../lib/photos.js";

export interface PhotoSource {
    enumerate(
        roots: readonly string[],
        options: {maxDepth: number; maxFiles: number},
    ): Promise<PhotoEntry[]>;
}

interface PhotoSubscription {
    roots: string[];
    listener: (entries: PhotoEntry[]) => void;
    generation: number;
    maxDepth: number;
    maxFiles: number;
}

export class PhotosService {
    private readonly subscriptions = new Set<PhotoSubscription>();
    private destroyed = false;

    constructor(
        private readonly source: PhotoSource,
        private readonly onError: (error: unknown) => void = (error) =>
            console.warn(`Photo enumeration failed: ${String(error)}`),
    ) {}

    acquire(
        roots: readonly string[],
        listener: (entries: PhotoEntry[]) => void,
        options: {maxDepth?: number; maxFiles?: number} = {},
    ): {release(): void} {
        if (this.destroyed) {
            throw new Error("PhotosService has been destroyed");
        }
        const subscription: PhotoSubscription = {
            roots: [...roots],
            listener,
            generation: 1,
            maxDepth: Math.max(0, Math.min(8, options.maxDepth ?? 2)),
            maxFiles: Math.max(1, Math.min(1000, options.maxFiles ?? 200)),
        };
        this.subscriptions.add(subscription);
        void this.refresh(subscription);
        let released = false;
        return {
            release: () => {
                if (released) {
                    return;
                }
                released = true;
                subscription.generation += 1;
                this.subscriptions.delete(subscription);
            },
        };
    }

    destroy(): void {
        this.destroyed = true;
        for (const subscription of this.subscriptions) {
            subscription.generation += 1;
        }
        this.subscriptions.clear();
    }

    private async refresh(subscription: PhotoSubscription): Promise<void> {
        const generation = subscription.generation;
        try {
            const entries = await this.source.enumerate(subscription.roots, {
                maxDepth: subscription.maxDepth,
                maxFiles: subscription.maxFiles,
            });
            if (
                this.destroyed ||
                subscription.generation !== generation ||
                !this.subscriptions.has(subscription)
            ) {
                return;
            }
            subscription.listener(entries);
        } catch (error) {
            if (
                !this.destroyed &&
                subscription.generation === generation &&
                this.subscriptions.has(subscription)
            ) {
                this.onError(error);
                subscription.listener([]);
            }
        }
    }
}
