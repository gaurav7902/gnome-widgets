import {migrate, parse, validate, type LumenConfig} from "./config.js";

export interface ConfigEditorOptions {
    debounceMs?: number;
    onChange?: (config: LumenConfig) => void;
}

export class ConfigEditor {
    private config: LumenConfig;
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        initial: unknown,
        private readonly options: ConfigEditorOptions = {},
    ) {
        this.config = validate(initial);
    }

    get value(): LumenConfig {
        return this.config;
    }

    patch(mutator: (config: LumenConfig) => LumenConfig): void {
        this.config = validate(mutator(this.config));
        this.schedule();
    }

    importJson(json: string): boolean {
        try {
            const raw: unknown = JSON.parse(json);
            this.config = migrate(
                raw,
                typeof raw === "object" &&
                    raw !== null &&
                    "version" in raw &&
                    typeof raw.version === "number"
                    ? raw.version
                    : 1,
            );
            this.schedule();
            return true;
        } catch {
            return false;
        }
    }

    exportJson(): string {
        return JSON.stringify(this.config, null, 2);
    }

    flush(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.options.onChange?.(this.config);
    }

    destroy(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    private schedule(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.timer = null;
            this.options.onChange?.(this.config);
        }, this.options.debounceMs ?? 250);
    }
}

export const importConfig = (json: string): LumenConfig | null => {
    try {
        const raw: unknown = JSON.parse(json);
        return validate(raw);
    } catch {
        return null;
    }
};

export const exportConfig = (config: unknown): string =>
    JSON.stringify(validate(config), null, 2);
