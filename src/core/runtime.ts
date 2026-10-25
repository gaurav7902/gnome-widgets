import type {LumenConfig, WidgetInstanceConfig} from "../lib/config.js";
import {ConfigStore, type SettingsAdapter} from "./store.js";
import {Canvas} from "./canvas.js";
import {WidgetRegistry, type WidgetInstance} from "./registry.js";
import {EditModeIntegration} from "./edit-integration.js";
import {widgetDefinitions} from "../widgets/index.js";
import {
    collides,
    normalisedToPixels,
    pixelsToNormalised,
    rectFromAnchor,
    clampRect,
    type Rect,
    type WorkArea,
} from "../lib/layout.js";
import {arrangeWidgets, findFreeSlot} from "../lib/arrange.js";
import type {EditableWidget} from "./editmode.js";
import GLib from "gi://GLib";
import {SharedTicker, type TickScheduler} from "../lib/ticker.js";
import {GioFileReader} from "../services/gio-reader.js";
import {
    GioFileContentReader,
    GioFileMonitor,
} from "../services/gio-file-content.js";
import {
    FileContentService,
    type FileContentReader,
} from "../services/file-content.js";
import {PhotosService} from "../services/photos.js";
import {GioPhotoSource} from "../services/gio-photos.js";
import {UPowerBatteryService} from "../services/upower.js";
import {createUPowerService} from "../services/gio-upower.js";
import {
    SYSTEM_METRICS,
    SystemStatsService,
    type MetricSubscription,
} from "../services/sysstats.js";

export interface RuntimeSettings extends SettingsAdapter {
    get_boolean(key: string): boolean;
    set_boolean(key: string, value: boolean): void;
    connect(signal: string, callback: () => void): number;
    disconnect(id: number): void;
}

export class WidgetRuntime {
    readonly store: ConfigStore;
    private readonly registry: WidgetRegistry;
    private readonly instances = new Map<string, WidgetInstance>();
    private readonly editMode: EditModeIntegration;
    private unsubscribe: (() => void) | null = null;
    private unsubscribeRelayout: (() => void) | null = null;
    private settingsSignal: number | null = null;
    private editModeSignal: number | null = null;
    private lockLayoutSignal: number | null = null;
    private stats: SystemStatsService | null = null;
    private files: FileContentService | null = null;
    private photos: PhotosService | null = null;
    private battery: UPowerBatteryService | null = null;
    private readonly metricSubscriptions = new Map<
        string,
        MetricSubscription[]
    >();
    private readonly fileSubscriptions = new Map<string, {release(): void}>();
    private readonly photoSubscriptions = new Map<string, {release(): void}>();
    private readonly batterySubscriptions = new Map<
        string,
        {release(): void}
    >();
    private destroyed = false;
    private lastEditState: {
        editMode: boolean;
        locked: boolean;
        widgetIds: string;
    } | null = null;

    constructor(
        private readonly canvas: Canvas,
        private readonly settings: RuntimeSettings,
    ) {
        this.store = new ConfigStore(settings);
        this.registry = new WidgetRegistry(widgetDefinitions, (error, type) =>
            console.warn(`Unable to create ${type}: ${String(error)}`),
        );
        this.editMode = new EditModeIntegration(() => this.canvas.workArea, {
            save: (widgets) => {
                this.commitEditModeChanges(widgets);
                this.storeSettings().set_boolean("edit-mode", false);
            },
            cancel: () => this.storeSettings().set_boolean("edit-mode", false),
            defaultLayout: () => this.defaultLayoutSnapshot(),
        });
    }

    enable(): void {
        this.store.load();
        const scheduler: TickScheduler = {
            schedule: (delayMs, callback) =>
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
                    callback();
                    return GLib.SOURCE_REMOVE;
                }),
            cancel: (id) => GLib.Source.remove(id),
        };
        this.stats = new SystemStatsService(
            new GioFileReader(),
            new SharedTicker(scheduler),
        );
        this.battery = createUPowerService();
        const fileReader: FileContentReader = new GioFileContentReader();
        this.files = new FileContentService(fileReader, new GioFileMonitor());
        this.photos = new PhotosService(new GioPhotoSource());
        this.unsubscribeRelayout = this.canvas.subscribeRelayout(() => {
            this.relayoutInstances();
        });
        this.unsubscribe = this.store.subscribeDiff((diff) => {
            void this.applyDiff(diff).catch((error) => {
                console.warn(`Unable to apply widget changes: ${String(error)}`);
            });
        });
        this.settingsSignal = this.storeSettings().connect(
            "changed::profiles-json",
            () => {
                const json = this.storeSettings().get_string("profiles-json");
                if (this.store.shouldIgnoreReload(json)) {
                    return;
                }
                this.store.load();
                void this.reconcile(this.store.value)
                    .then(() => this.syncEditMode())
                    .catch((error) => {
                        console.warn(`Unable to reload widgets: ${String(error)}`);
                    });
            },
        );
        this.editModeSignal = this.storeSettings().connect(
            "changed::edit-mode",
            () => {
                this.syncEditMode();
            },
        );
        this.lockLayoutSignal = this.storeSettings().connect(
            "changed::lock-layout",
            () => {
                this.syncEditMode();
            },
        );
        void this.reconcile(this.store.value)
            .then(() => this.syncEditMode())
            .catch((error) => {
                console.warn(`Unable to create widgets: ${String(error)}`);
            });
        this.syncEditMode();
    }

    disable(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        if (this.editModeSignal !== null) {
            this.storeSettings().disconnect(this.editModeSignal);
            this.editModeSignal = null;
        }
        if (this.lockLayoutSignal !== null) {
            this.storeSettings().disconnect(this.lockLayoutSignal);
            this.lockLayoutSignal = null;
        }
        if (this.settingsSignal !== null) {
            this.storeSettings().disconnect(this.settingsSignal);
            this.settingsSignal = null;
        }
        this.editMode.destroy();
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.unsubscribeRelayout?.();
        this.unsubscribeRelayout = null;
        for (const instance of this.instances.values()) {
            instance.destroy();
        }
        this.instances.clear();
        for (const subscriptions of this.metricSubscriptions.values()) {
            for (const subscription of subscriptions) {
                subscription.release();
            }
        }
        this.metricSubscriptions.clear();
        this.stats?.destroy();
        this.stats = null;
        for (const subscription of this.fileSubscriptions.values()) {
            subscription.release();
        }
        this.fileSubscriptions.clear();
        this.files?.destroy();
        this.files = null;
        for (const subscription of this.photoSubscriptions.values()) {
            subscription.release();
        }
        this.photoSubscriptions.clear();
        this.photos?.destroy();
        this.photos = null;
        for (const subscription of this.batterySubscriptions.values()) {
            subscription.release();
        }
        this.batterySubscriptions.clear();
        this.battery?.destroy();
        this.battery = null;
        this.store.destroy();
    }

    resetLayout(): void {
        if (this.destroyed) {
            return;
        }
        this.commitEditModeChanges(this.defaultLayoutSnapshot());
    }

    private defaultLayoutSnapshot(): EditableWidget[] {
        const profile =
            this.store.value.profiles[this.store.value.activeProfile];
        if (!profile) {
            return [];
        }
        const area = this.canvas.workArea;
        const items = profile.widgets.map((widget) => {
            const def = this.registry.getDefinition(widget.type);
            return {
                id: widget.id,
                size: def?.manifest.defaultSize ?? widget.size,
                minSize: def?.manifest.minSize,
            };
        });
        const {placed, overflow} = arrangeWidgets(items, area);
        const placedMap = new Map(
            [...placed, ...overflow].map(({id, rect}) => [id, rect]),
        );
        return profile.widgets.map((widget) => {
            const rect = clampRect(
                placedMap.get(widget.id) ?? this.rectForConfig(widget, area),
                area,
            );
            return {
                id: widget.id,
                rect: {...rect},
                locked:
                    this.storeSettings().get_boolean("lock-layout") ||
                    widget.locked,
            };
        });
    }

    addWidget(type: string): void {
        if (this.destroyed) {
            return;
        }
        const profile =
            this.store.value.profiles[this.store.value.activeProfile];
        if (!profile) {
            return;
        }
        const existingIds = new Set(profile.widgets.map(({id}) => id));
        let number = profile.widgets.length + 1;
        let id = `${type}-${number}`;
        while (existingIds.has(id)) {
            number += 1;
            id = `${type}-${number}`;
        }
        const def = this.registry.getDefinition(type);
        const defaultSize = def?.manifest.defaultSize ?? {w: 320, h: 150};

        const workArea = this.canvas.workArea;
        const existingRects = profile.widgets.map((widget) =>
            this.rectForConfig(widget, workArea),
        );
        const pos = findFreeSlot(existingRects, defaultSize, workArea);

        this.store.update((current) => {
            const active = current.profiles[current.activeProfile];
            if (!active) {
                return current;
            }
            const widget: WidgetInstanceConfig = {
                id,
                type,
                enabled: true,
                locked: false,
                anchor: "top-left",
                pos,
                size: defaultSize,
                style: {textScale: 1, radius: 20, opacity: null, palette: null},
                config: {},
            };
            return {
                ...current,
                profiles: {
                    ...current.profiles,
                    [current.activeProfile]: {
                        ...active,
                        widgets: [...active.widgets, widget],
                    },
                },
            };
        });
        this.store.save();
    }

    private findFreePosition(
        widgets: readonly WidgetInstanceConfig[],
        size: {w: number; h: number},
        workArea: WorkArea,
    ): {x: number; y: number} {
        const occupied = widgets.map((widget) =>
            this.rectForConfig(widget, workArea),
        );
        const gap = 16;
        const columns = Math.max(
            1,
            Math.floor((workArea.w - gap) / (size.w + gap)),
        );
        const rows = Math.max(
            1,
            Math.floor((workArea.h - gap) / (size.h + gap)),
        );
        for (let index = 0; index < columns * rows; index += 1) {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const rect: Rect = {
                x: workArea.x + gap + column * (size.w + gap),
                y: workArea.y + gap + row * (size.h + gap),
                ...size,
            };
            if (!occupied.some((other) => collides(rect, [other], gap))) {
                return {
                    x: Math.min(
                        1,
                        Math.max(0, (rect.x - workArea.x) / workArea.w),
                    ),
                    y: Math.min(
                        1,
                        Math.max(0, (rect.y - workArea.y) / workArea.h),
                    ),
                };
            }
        }
        return {x: 0.05, y: 0.05};
    }

    private storeSettings(): RuntimeSettings {
        return this.settings;
    }

    private async applyDiff(diff: {
        added: string[];
        updated: string[];
        removed: string[];
    }): Promise<void> {
        const widgets = this.activeWidgets();
        for (const id of diff.removed) {
            this.destroyInstance(id);
        }
        for (const id of [...diff.added, ...diff.updated]) {
            const config = widgets.find((widget) => widget.id === id);
            if (!config || !config.enabled) {
                this.destroyInstance(id);
                continue;
            }
            if (diff.updated.includes(id)) {
                this.instances.get(id)?.update(config);
                const actor = this.instances.get(id)?.actor;
                if (actor) {
                    this.layoutInstance(actor, config);
                }
            } else {
                await this.createInstance(config);
            }
        }
        this.syncEditMode();
    }

    private async reconcile(config: LumenConfig): Promise<void> {
        const desired = new Map(
            this.activeWidgets()
                .filter(({enabled}) => enabled)
                .map((widget) => [widget.id, widget]),
        );
        for (const [id] of this.instances) {
            if (!desired.has(id)) {
                this.destroyInstance(id);
            }
        }
        for (const widget of desired.values()) {
            if (this.instances.has(widget.id)) {
                this.instances.get(widget.id)?.update(widget);
                const actor = this.instances.get(widget.id)?.actor;
                if (actor) {
                    this.layoutInstance(actor, widget);
                }
            } else {
                await this.createInstance(widget);
            }
        }
    }

    private activeWidgets(): WidgetInstanceConfig[] {
        return (
            this.store.value.profiles[this.store.value.activeProfile]
                ?.widgets ?? []
        );
    }

    private async createInstance(config: WidgetInstanceConfig): Promise<void> {
        const instance = await this.registry.create(config.type, {
            id: config.id,
            config,
        });
        if (this.destroyed || !instance) {
            instance?.destroy();
            return;
        }
        this.instances.set(config.id, instance);
        if (instance.actor) {
            this.canvas.addChild(instance.actor);
            this.layoutInstance(instance.actor, config);
            if (this.storeSettings().get_boolean("edit-mode")) {
                this.editMode.registerWidget(config.id, instance.actor, config);
            }
        }
        if (instance.updateSnapshot && this.stats) {
            const subscriptions = SYSTEM_METRICS.map((metric) =>
                this.stats!.acquire(metric, (snapshot) => {
                    instance.updateSnapshot?.(snapshot);
                }),
            );
            this.metricSubscriptions.set(config.id, subscriptions);
        }
        const filePath = this.filePathFor(config);
        if (instance.updateContents && this.files && filePath) {
            const subscription = this.files.acquire(filePath, (contents) => {
                instance.updateContents?.(contents);
            });
            this.fileSubscriptions.set(config.id, subscription);
        }
        const photoRoots = this.photoRootsFor(config);
        if (instance.updateEntries && this.photos && photoRoots.length > 0) {
            const subscription = this.photos.acquire(photoRoots, (entries) => {
                instance.updateEntries?.(entries);
            });
            this.photoSubscriptions.set(config.id, subscription);
        }
        if (instance.updateBattery && this.battery) {
            const subscription = this.battery.acquire((snapshot) => {
                instance.updateBattery?.(snapshot);
            });
            this.batterySubscriptions.set(config.id, subscription);
        }
    }

    private destroyInstance(id: string): void {
        const instance = this.instances.get(id);
        if (!instance) {
            return;
        }
        this.editMode.unregisterWidget(id);
        instance.destroy();
        for (const subscription of this.metricSubscriptions.get(id) ?? []) {
            subscription.release();
        }
        this.metricSubscriptions.delete(id);
        this.fileSubscriptions.get(id)?.release();
        this.fileSubscriptions.delete(id);
        this.photoSubscriptions.get(id)?.release();
        this.photoSubscriptions.delete(id);
        this.batterySubscriptions.get(id)?.release();
        this.batterySubscriptions.delete(id);
        this.instances.delete(id);
    }

    private layoutInstance(
        actor: NonNullable<WidgetInstance["actor"]>,
        config: WidgetInstanceConfig,
    ): void {
        const area = this.canvas.workArea;
        const def = this.registry.getDefinition(config.type);
        const minSize = def?.manifest.minSize ?? {w: 100, h: 80};
        const size = {
            w: Math.max(minSize.w, config.size.w),
            h: Math.max(minSize.h, config.size.h),
        };
        const position = normalisedToPixels(config.pos, {
            x: area.x,
            y: area.y,
            w: area.w,
            h: area.h,
        });
        const rect: Rect = clampRect(
            rectFromAnchor(config.anchor, position, size),
            area,
        );
        this.canvas.setLayout(actor, rect);
    }

    private relayoutInstances(): void {
        for (const [id, instance] of this.instances) {
            const config = this.activeWidgets().find(
                (widget) => widget.id === id,
            );
            if (config && instance.actor) {
                this.layoutInstance(instance.actor, config);
            }
        }
    }

    private filePathFor(config: WidgetInstanceConfig): string | null {
        const path = config.config.path;
        if (typeof path === "string" && path.trim()) {
            return path;
        }
        return config.type === "todo"
            ? GLib.build_filenamev([GLib.get_home_dir(), "todo.txt"])
            : null;
    }

    private photoRootsFor(config: WidgetInstanceConfig): string[] {
        const roots = config.config.roots;
        if (Array.isArray(roots)) {
            return roots.filter(
                (root): root is string =>
                    typeof root === "string" && root.trim().length > 0,
            );
        }
        return config.type === "photos"
            ? [
                  GLib.build_filenamev([GLib.get_home_dir(), "Pictures"]),
                  GLib.build_filenamev([GLib.get_home_dir(), "Downloads"]),
              ]
            : [];
    }

    private syncEditMode(): void {
        if (this.destroyed) {
            return;
        }
        const isEditMode = this.storeSettings().get_boolean("edit-mode");
        const isLocked = this.storeSettings().get_boolean("lock-layout");
        const activeWidgets = this.activeWidgets();
        const widgetIds = activeWidgets.map((w) => w.id).join(",");

        if (
            this.lastEditState &&
            this.lastEditState.editMode === isEditMode &&
            this.lastEditState.locked === isLocked &&
            this.lastEditState.widgetIds === widgetIds
        ) {
            return;
        }
        this.lastEditState = {
            editMode: isEditMode,
            locked: isLocked,
            widgetIds,
        };

        if (isEditMode) {
            const workArea = this.canvas.workArea;
            const widgets = activeWidgets.map((config) => ({
                id: config.id,
                rect: this.rectForConfig(config, workArea),
                locked: isLocked || config.locked === true,
            }));
            this.editMode.enter(widgets);
            for (const [id, instance] of this.instances) {
                if (instance.actor) {
                    this.editMode.registerWidget(
                        id,
                        instance.actor,
                        activeWidgets.find((w) => w.id === id)!,
                    );
                }
            }
        } else {
            this.editMode.exit();
            for (const id of this.instances.keys()) {
                this.editMode.unregisterWidget(id);
            }
        }
    }

    private rectForConfig(
        config: WidgetInstanceConfig,
        workArea: WorkArea,
    ): Rect {
        const position = normalisedToPixels(config.pos, workArea);
        return rectFromAnchor(config.anchor, position, config.size);
    }

    private commitEditModeChanges(widgets: readonly EditableWidget[]): void {
        if (this.destroyed) {
            return;
        }
        this.store.update((current) => {
            const profile = current.profiles[current.activeProfile];
            if (!profile) {
                return current;
            }
            const updated = profile.widgets.map((widget) => {
                const editWidget = widgets.find((w) => w.id === widget.id);
                if (!editWidget) {
                    return widget;
                }
                return {
                    ...widget,
                    pos: pixelsToNormalised(
                        editWidget.rect,
                        this.canvas.workArea,
                    ),
                    size: {
                        w: editWidget.rect.w,
                        h: editWidget.rect.h,
                    },
                    anchor: "top-left" as const,
                    // Per-widget lock state is configuration, while the global
                    // lock switch is only a temporary edit-mode guard.
                    locked: widget.locked === true,
                };
            });
            return {
                ...current,
                profiles: {
                    ...current.profiles,
                    [current.activeProfile]: {...profile, widgets: updated},
                },
            };
        });
        this.store.save();
    }
}
