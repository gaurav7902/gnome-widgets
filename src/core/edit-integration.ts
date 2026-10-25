import Clutter from "gi://Clutter";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import type {WidgetActor} from "./registry.js";
import {EditModeController, type EditableWidget} from "./editmode.js";
import type {WorkArea} from "../lib/layout.js";
import type {WidgetInstanceConfig} from "../lib/config.js";

interface DragState {
    id: string;
    actor: WidgetActor;
    startX: number;
    startY: number;
    actorStartX: number;
    actorStartY: number;
    width: number;
    height: number;
}

export interface EditModeActions {
    save(widgets: readonly EditableWidget[]): void;
    cancel(): void;
    defaultLayout(): readonly EditableWidget[];
}

export class EditModeIntegration {
    private readonly controller: EditModeController;
    private readonly actorMap = new Map<string, WidgetActor>();
    private readonly buttonSignals = new Map<string, number>();
    private readonly destroySignals = new Map<string, number>();
    private active = false;
    private dragState: DragState | null = null;
    private stageCapture: number | null = null;
    private stageRef: any = null;
    private toolbar: InstanceType<typeof St.BoxLayout> | null = null;
    private baseline: EditableWidget[] = [];
    private lastLogTime = 0;

    constructor(
        private readonly getWorkArea: () => WorkArea,
        private readonly actions: EditModeActions,
    ) {
        this.controller = new EditModeController({
            get workArea() {
                return getWorkArea();
            },
            // Allow widgets to sit close together; only actual overlap is blocked.
            gap: 0,
            snapBackOnOverlap: true,
        });
    }

    enter(widgets: readonly EditableWidget[]): void {
        this.baseline = cloneWidgets(widgets);
        this.controller.enter(widgets);
        this.active = true;
        this.updateActorReactivity();
        this.createToolbar();
    }

    exit(restoreBaseline = true): void {
        if (restoreBaseline && this.active) {
            this.applyPositions(this.baseline);
        }
        this.controller.exit();
        this.active = false;
        this.updateActorReactivity();
        this.removeToolbar();
        this.endDrag();
    }

    registerWidget(
        id: string,
        actor: WidgetActor,
        _config: WidgetInstanceConfig,
    ): void {
        this.actorMap.set(id, actor);
        if (actor instanceof St.Widget) {
            const stActor = actor as any;
            if (typeof stActor.connect === "function") {
                const destroyId = stActor.connect("destroy", () => {
                    try {
                        this.unregisterWidget(id);
                    } catch (err) {
                        this.logError(
                            `Failed to handle actor destroy for ${id}: ${String(err)}`,
                        );
                    }
                });
                this.destroySignals.set(id, destroyId);
            }
        }
        if (this.active) {
            this.makeInteractive(id, actor);
        }
    }

    unregisterWidget(id: string): void {
        this.disconnectWidgetSignals(id);
        this.actorMap.delete(id);
    }

    updateWidgets(widgets: readonly EditableWidget[]): void {
        if (this.active) {
            this.controller.enter(widgets);
            this.applyPositions(widgets);
        }
    }

    destroy(): void {
        this.exit();
        for (const id of this.actorMap.keys()) {
            this.disconnectWidgetSignals(id);
        }
        this.actorMap.clear();
    }

    private logError(message: string): void {
        const now = Date.now();
        if (now - this.lastLogTime > 5000) {
            console.error(`[lumen-extension:edit-mode] ${message}`);
            this.lastLogTime = now;
        }
    }

    private updateActorReactivity(): void {
        for (const [id, actor] of this.actorMap) {
            if (this.active) {
                this.makeInteractive(id, actor);
            } else {
                this.makeNonInteractive(id, actor);
            }
        }
    }

    private makeInteractive(id: string, actor: WidgetActor): void {
        if (!(actor instanceof St.Widget)) {
            return;
        }
        const stActor = actor as any;
        stActor.reactive = true;
        stActor.track_hover = true;

        this.disconnectWidgetSignals(id, false);

        if (typeof stActor.connect === "function") {
            const buttonId = stActor.connect(
                "button-press-event",
                (_actor: any, event: any) => {
                    try {
                        return this.onButtonPress(id, actor, event);
                    } catch (err) {
                        this.logError(
                            `button-press-event error: ${String(err)}`,
                        );
                        return Clutter.EVENT_PROPAGATE;
                    }
                },
            );
            this.buttonSignals.set(id, buttonId);
        }
    }

    private makeNonInteractive(id: string, actor: WidgetActor): void {
        if (!(actor instanceof St.Widget)) {
            return;
        }
        const stActor = actor as any;
        stActor.reactive = false;
        stActor.track_hover = false;
        this.disconnectWidgetSignals(id, false);
    }

    private disconnectWidgetSignals(id: string, clearDestroy = true): void {
        const actor = this.actorMap.get(id);
        const buttonId = this.buttonSignals.get(id);
        const destroyId = this.destroySignals.get(id);

        if (actor instanceof St.Widget) {
            const stActor = actor as any;
            if (
                buttonId !== undefined &&
                typeof stActor.disconnect === "function"
            ) {
                try {
                    stActor.disconnect(buttonId);
                } catch {
                    // Ignore disconnection errors.
                }
                this.buttonSignals.delete(id);
            }
            if (
                clearDestroy &&
                destroyId !== undefined &&
                typeof stActor.disconnect === "function"
            ) {
                try {
                    stActor.disconnect(destroyId);
                } catch {
                    // Ignore disconnection errors.
                }
                this.destroySignals.delete(id);
            }
        }
    }

    private onButtonPress(id: string, actor: WidgetActor, event: any): number {
        if (event.get_button() !== Clutter.BUTTON_PRIMARY) {
            return Clutter.EVENT_PROPAGATE;
        }

        const [x, y] = event.get_coords();
        const stActor = actor as any;
        const actorX = stActor.x ?? 0;
        const actorY = stActor.y ?? 0;

        if (this.controller.beginDrag(id)) {
            const widget = this.controller
                .snapshot()
                .find((item) => item.id === id);
            if (!widget) {
                return Clutter.EVENT_PROPAGATE;
            }
            this.dragState = {
                id,
                actor,
                startX: x,
                startY: y,
                actorStartX: actorX,
                actorStartY: actorY,
                width: widget.rect.w,
                height: widget.rect.h,
            };

            const stage = stActor.get_stage?.();
            if (stage && typeof stage.connect === "function") {
                this.stageRef = stage;
                this.stageCapture = stage.connect(
                    "captured-event",
                    (_stage: any, evt: any) => {
                        try {
                            return this.onStageCaptured(evt);
                        } catch (err) {
                            this.logError(
                                `stage captured-event error: ${String(err)}`,
                            );
                            return Clutter.EVENT_PROPAGATE;
                        }
                    },
                );
            }

            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    private onStageCaptured(event: any): number {
        const type = event.type();
        if (type === Clutter.EventType.MOTION) {
            return this.onMotion(event);
        } else if (type === Clutter.EventType.BUTTON_RELEASE) {
            return this.onButtonRelease(event);
        }
        return Clutter.EVENT_PROPAGATE;
    }

    private onMotion(event: any): number {
        if (!this.dragState) {
            return Clutter.EVENT_PROPAGATE;
        }

        const [x, y] = event.get_coords();
        const deltaX = x - this.dragState.startX;
        const deltaY = y - this.dragState.startY;
        const newX = this.dragState.actorStartX + deltaX;
        const newY = this.dragState.actorStartY + deltaY;
        const newRect = {
            x: newX,
            y: newY,
            w: this.dragState.width,
            h: this.dragState.height,
        };
        if (this.controller.moveDrag(newRect)) {
            this.dragState.actor.set_position(newX, newY);
        }
        return Clutter.EVENT_STOP;
    }

    private onButtonRelease(event: any): number {
        if (event.get_button() !== Clutter.BUTTON_PRIMARY) {
            return Clutter.EVENT_PROPAGATE;
        }
        this.endDrag();
        return Clutter.EVENT_STOP;
    }

    private endDrag(): void {
        try {
            if (
                this.stageCapture !== null &&
                this.stageRef &&
                typeof this.stageRef.disconnect === "function"
            ) {
                try {
                    this.stageRef.disconnect(this.stageCapture);
                } catch {
                    // Ignore disconnection errors.
                }
            }
            if (this.dragState) {
                this.controller.endDrag();
            }
        } finally {
            this.stageCapture = null;
            this.stageRef = null;
            this.dragState = null;
        }
    }

    private createToolbar(): void {
        this.removeToolbar();
        const toolbar = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: "lm-edit-toolbar",
            reactive: true,
            can_focus: true,
        });
        const status = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: "lm-edit-status",
        });
        status.add_child(
            new St.Icon({
                icon_name: "preferences-system-symbolic",
                style_class: "lm-edit-status-icon",
            }),
        );
        const labels = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: "lm-edit-status-copy",
        });
        labels.add_child(
            new St.Label({
                text: "EDIT MODE",
                style_class: "lm-edit-status-title",
            }),
        );
        labels.add_child(
            new St.Label({
                text: "Drag widgets to arrange them",
                style_class: "lm-edit-status-subtitle",
            }),
        );
        status.add_child(labels);
        toolbar.add_child(status);
        toolbar.add_child(
            this.createActionButton("Save layout", "lm-edit-save", () =>
                this.saveAndClose(),
            ),
        );
        toolbar.add_child(
            this.createActionButton("Revert", "lm-edit-secondary", () =>
                this.restoreBaseline(),
            ),
        );
        toolbar.add_child(
            this.createActionButton("Default layout", "lm-edit-secondary", () =>
                this.applyDefaultLayout(),
            ),
        );
        toolbar.add_child(
            this.createActionButton("Cancel", "lm-edit-cancel", () =>
                this.cancelAndClose(),
            ),
        );
        this.toolbar = toolbar;
        Main.layoutManager.addChrome(toolbar, {trackFullscreen: true});
        this.positionToolbar();
    }

    private createActionButton(
        label: string,
        styleClass: string,
        callback: () => void,
    ): InstanceType<typeof St.Button> {
        const button = new St.Button({
            label,
            style_class: `lm-edit-action ${styleClass}`,
            reactive: true,
            can_focus: true,
        });
        button.connect("clicked", callback);
        return button;
    }

    private positionToolbar(): void {
        if (!this.toolbar) {
            return;
        }
        const area = this.getWorkArea();
        const width = Math.min(760, Math.max(520, area.w - 24));
        this.toolbar.set_size(width, 58);
        this.toolbar.set_position(
            area.x + Math.max(12, (area.w - width) / 2),
            Math.max(8, area.y + 8),
        );
    }

    private removeToolbar(): void {
        if (!this.toolbar) {
            return;
        }
        try {
            Main.layoutManager.removeChrome(this.toolbar);
        } catch {
            // It may already have been removed during shell teardown.
        }
        this.toolbar.destroy();
        this.toolbar = null;
    }

    private restoreBaseline(): void {
        this.controller.enter(this.baseline);
        this.applyPositions(this.baseline);
    }

    private applyDefaultLayout(): void {
        const widgets = this.actions.defaultLayout();
        this.controller.enter(widgets);
        this.applyPositions(widgets);
    }

    private saveAndClose(): void {
        const widgets = this.controller.snapshot();
        this.finishSession();
        this.actions.save(widgets);
    }

    private cancelAndClose(): void {
        this.applyPositions(this.baseline);
        this.finishSession();
        this.actions.cancel();
    }

    private finishSession(): void {
        this.controller.exit();
        this.active = false;
        this.updateActorReactivity();
        this.removeToolbar();
        this.endDrag();
        this.baseline = [];
    }

    private applyPositions(widgets: readonly EditableWidget[]): void {
        for (const widget of widgets) {
            const actor = this.actorMap.get(widget.id) as any;
            if (!actor) {
                continue;
            }
            actor.set_position(widget.rect.x, widget.rect.y);
            actor.set_size?.(widget.rect.w, widget.rect.h);
        }
    }
}

function cloneWidgets(widgets: readonly EditableWidget[]): EditableWidget[] {
    return widgets.map((widget) => ({...widget, rect: {...widget.rect}}));
}
