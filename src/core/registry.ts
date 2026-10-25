import type {WidgetInstanceConfig} from "../lib/config.js";
import type {SystemSnapshot} from "../lib/system.js";
import type {PhotoEntry} from "../lib/photos.js";
import type {BatterySnapshot} from "../services/upower.js";

export interface WidgetManifest {
    type: string;
    label: string;
    icon: string;
    description: string;
    defaultSize?: {w: number; h: number};
    minSize?: {w: number; h: number};
    resizable?: boolean;
}

export interface WidgetContext {
    id: string;
    config: WidgetInstanceConfig;
}

export interface WidgetActor {
    readonly destroyed?: boolean;
    set_position(x: number, y: number): void;
    set_size?(width: number, height: number): void;
    destroy(): void;
}

export interface WidgetInstance {
    readonly actor?: WidgetActor;
    update(config: WidgetInstanceConfig): void;
    updateSnapshot?(snapshot: SystemSnapshot): void;
    updateContents?(contents: string): void;
    updateEntries?(entries: readonly PhotoEntry[]): void;
    updateBattery?(snapshot: BatterySnapshot): void;
    showError?(message?: string): void;
    destroy(): void;
}

export type WidgetFactory = (context: WidgetContext) => WidgetInstance;
export type WidgetLoader = () => Promise<{create: WidgetFactory}>;

export interface WidgetDefinition {
    manifest: WidgetManifest;
    load: WidgetLoader;
}

export class WidgetRegistry {
    constructor(
        private readonly definitions: WidgetDefinition[] = [],
        private readonly onError: (
            error: unknown,
            type: string,
        ) => void = () => {},
    ) {}

    list(): WidgetManifest[] {
        return this.definitions.map(({manifest}) => manifest);
    }

    getDefinition(type: string): WidgetDefinition | undefined {
        return this.definitions.find(({manifest}) => manifest.type === type);
    }

    async create(
        type: string,
        context: WidgetContext,
    ): Promise<WidgetInstance | null> {
        const definition = this.definitions.find(
            ({manifest}) => manifest.type === type,
        );
        if (!definition) {
            return null;
        }
        try {
            const module = await definition.load();
            return module.create(context);
        } catch (error) {
            this.onError(error, type);
            return null;
        }
    }
}
