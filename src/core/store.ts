import {defaults, parse, validate, type LumenConfig} from "../lib/config.js";

export type StoreListener = (config: LumenConfig) => void;
export interface InstancesDiff {
    added: string[];
    updated: string[];
    removed: string[];
    moved: boolean;
}

export interface SettingsAdapter {
    get_string(key: string): string;
    set_string(key: string, value: string): void;
}

export class ConfigStore {
    private config: LumenConfig = defaults();
    private readonly listeners = new Set<StoreListener>();
    private readonly diffListeners = new Set<(diff: InstancesDiff) => void>();
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private lastSavedJson = "";

    constructor(
        private readonly settings: SettingsAdapter,
        private readonly key = "profiles-json",
        private readonly debounceMs = 250,
    ) {}

    load(): LumenConfig {
        this.config = parse(this.settings.get_string(this.key));
        return this.config;
    }

    get value(): LumenConfig {
        return this.config;
    }

    update(mutator: (current: LumenConfig) => LumenConfig): void {
        const previous = this.config;
        this.config = validate(mutator(this.config));
        const before = previous.profiles[previous.activeProfile]?.widgets ?? [];
        const after =
            this.config.profiles[this.config.activeProfile]?.widgets ?? [];
        const beforeIds = new Set(before.map(({id}) => id));
        const afterIds = new Set(after.map(({id}) => id));
        const added = after
            .filter(({id}) => !beforeIds.has(id))
            .map(({id}) => id);
        const removed = before
            .filter(({id}) => !afterIds.has(id))
            .map(({id}) => id);
        const updated = after
            .filter(({id}) => beforeIds.has(id))
            .filter(
                (widget) =>
                    JSON.stringify(widget) !==
                    JSON.stringify(before.find(({id}) => id === widget.id)),
            )
            .map(({id}) => id);
        const beforeOrder = before.map(({id}) => id).join(",");
        const afterOrder = after.map(({id}) => id).join(",");
        const diff = {
            added,
            updated,
            removed,
            moved: beforeOrder !== afterOrder,
        };
        for (const listener of this.listeners) {
            listener(this.config);
        }
        for (const listener of this.diffListeners) {
            listener(diff);
        }
    }

    subscribeDiff(listener: (diff: InstancesDiff) => void): () => void {
        this.diffListeners.add(listener);
        return () => this.diffListeners.delete(listener);
    }

    subscribe(listener: StoreListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    shouldIgnoreReload(json: string): boolean {
        return json === this.lastSavedJson;
    }

    save(): void {
        if (this.saveTimer !== null) {
            clearTimeout(this.saveTimer);
        }
        this.saveTimer = setTimeout(() => {
            const json = JSON.stringify(this.config);
            this.lastSavedJson = json;
            this.settings.set_string(this.key, json);
            this.saveTimer = null;
        }, this.debounceMs);
    }

    destroy(): void {
        if (this.saveTimer !== null) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        this.listeners.clear();
        this.diffListeners.clear();
    }
}
