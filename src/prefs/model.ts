import {
    validate,
    type LumenConfig,
    type WidgetInstanceConfig,
} from "../lib/config.js";
import {exportConfig, importConfig} from "../lib/config-editor.js";

export class PreferencesModel {
    private config: LumenConfig;

    constructor(initial: unknown) {
        this.config = validate(initial);
    }

    get value(): LumenConfig {
        return this.config;
    }

    selectProfile(profileId: string): boolean {
        if (!this.config.profiles[profileId]) {
            return false;
        }
        this.config = {...this.config, activeProfile: profileId};
        return true;
    }

    createProfile(profileId: string, name = profileId): boolean {
        const id = profileId.trim();
        if (!id || this.config.profiles[id]) {
            return false;
        }
        const template = this.config.profiles[this.config.activeProfile];
        if (!template) {
            return false;
        }
        this.config = {
            ...this.config,
            activeProfile: id,
            profiles: {
                ...this.config.profiles,
                [id]: {
                    ...template,
                    name: name.trim() || id,
                    widgets: template.widgets.map((widget) => ({...widget})),
                },
            },
        };
        return true;
    }

    removeProfile(profileId: string): boolean {
        if (
            profileId === this.config.activeProfile ||
            !this.config.profiles[profileId] ||
            Object.keys(this.config.profiles).length <= 1
        ) {
            return false;
        }
        const profiles = {...this.config.profiles};
        delete profiles[profileId];
        this.config = {...this.config, profiles};
        return true;
    }

    updateActiveProfile(
        update: (
            profile: LumenConfig["profiles"][string],
        ) => LumenConfig["profiles"][string],
    ): void {
        const profile = this.config.profiles[this.config.activeProfile];
        if (!profile) {
            return;
        }
        this.config = {
            ...this.config,
            profiles: {
                ...this.config.profiles,
                [this.config.activeProfile]: update(profile),
            },
        };
    }

    updateWidget(
        widgetId: string,
        update: (widget: WidgetInstanceConfig) => WidgetInstanceConfig,
    ): boolean {
        let changed = false;
        this.updateActiveProfile((profile) => ({
            ...profile,
            widgets: profile.widgets.map((widget) => {
                if (widget.id !== widgetId) {
                    return widget;
                }
                changed = true;
                return update(widget);
            }),
        }));
        return changed;
    }

    duplicateWidget(widgetId: string): string | null {
        const profile = this.config.profiles[this.config.activeProfile];
        const source = profile?.widgets.find(({id}) => id === widgetId);
        if (!profile || !source) {
            return null;
        }
        const ids = new Set(profile.widgets.map(({id}) => id));
        let suffix = 2;
        let id = `${source.id}-${suffix}`;
        while (ids.has(id)) {
            suffix += 1;
            id = `${source.id}-${suffix}`;
        }
        const copy: WidgetInstanceConfig = {
            ...source,
            id,
            pos: {x: Math.min(1, source.pos.x + 0.04), y: source.pos.y},
            config: {...source.config},
        };
        this.updateActiveProfile((current) => ({
            ...current,
            widgets: [...current.widgets, copy],
        }));
        return id;
    }

    deleteWidget(widgetId: string): boolean {
        const profile = this.config.profiles[this.config.activeProfile];
        if (!profile?.widgets.some(({id}) => id === widgetId)) {
            return false;
        }
        this.updateActiveProfile((current) => ({
            ...current,
            widgets: current.widgets.filter(({id}) => id !== widgetId),
        }));
        return true;
    }

    exportJson(): string {
        return exportConfig(this.config);
    }

    importJson(json: string): boolean {
        const imported = importConfig(json);
        if (!imported) {
            return false;
        }
        this.config = imported;
        return true;
    }
}
