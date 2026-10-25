import {
    alignmentGuides,
    EditHistory,
    nudgeRect,
    resizeRect,
    sizeClassForRect,
    type AlignmentGuide,
    type EditSnapshot,
    type ResizeHandle,
} from "../lib/edit.js";
import {clampRect, collides, type Rect, type WorkArea} from "../lib/layout.js";

export interface EditableWidget {
    id: string;
    rect: Rect;
    locked?: boolean;
    sizeClass?: "compact" | "regular" | "large";
}

export interface EditModeOptions {
    workArea: WorkArea;
    gap?: number;
    snapBackOnOverlap?: boolean;
    onChange?: (widgets: readonly EditableWidget[]) => void;
    onCommit?: (widgets: readonly EditableWidget[]) => void;
    onRemove?: (id: string) => void;
    onSizeClassChange?: (
        id: string,
        sizeClass: "compact" | "regular" | "large",
    ) => void;
}

export class EditModeController {
    private readonly history = new EditHistory(50);
    private widgets: EditableWidget[] = [];
    private active = false;
    private dragging: string | null = null;
    private dragOrigin: EditableWidget[] | null = null;
    private escapingOverlap = false;
    private resizing: {id: string; handle: ResizeHandle} | null = null;

    constructor(private readonly options: EditModeOptions) {}

    get isActive(): boolean {
        return this.active;
    }

    get isDragging(): boolean {
        return this.dragging !== null || this.resizing !== null;
    }

    enter(widgets: readonly EditableWidget[]): void {
        this.active = true;
        this.widgets = cloneWidgets(widgets);
        this.history.clear();
    }

    exit(): void {
        this.active = false;
        this.dragging = null;
        this.dragOrigin = null;
        this.resizing = null;
    }

    beginResize(id: string, handle: ResizeHandle): boolean {
        const widget = this.find(id);
        if (!this.active || !widget || widget.locked) {
            return false;
        }
        this.resizing = {id, handle};
        this.dragOrigin = cloneWidgets(this.widgets);
        return true;
    }

    moveResize(deltaX: number, deltaY: number): boolean {
        if (!this.resizing || !this.dragOrigin) {
            return false;
        }
        const widget = this.find(this.resizing.id);
        const origin = this.dragOrigin.find(({id}) => id === this.resizing?.id);
        if (!widget || !origin) {
            return false;
        }
        const candidate = clampRect(
            resizeRect(origin.rect, this.resizing.handle, deltaX, deltaY),
            this.options.workArea,
        );
        if (this.overlapsOther(candidate, widget.id)) {
            return false;
        }
        widget.rect = candidate;
        this.updateSizeClass(widget);
        this.emitChange();
        return true;
    }

    beginDrag(id: string): boolean {
        const widget = this.find(id);
        if (!this.active || !widget || widget.locked) {
            return false;
        }
        this.dragging = id;
        this.dragOrigin = cloneWidgets(this.widgets);
        this.escapingOverlap = this.overlapsOther(widget.rect, id);
        return true;
    }

    moveDrag(rect: Rect): boolean {
        if (this.dragging === null || this.dragOrigin === null) {
            return false;
        }
        const widget = this.find(this.dragging);
        if (!widget || widget.locked) {
            return false;
        }
        const candidate = clampRect(rect, this.options.workArea);
        if (this.overlapsOther(candidate, widget.id) && !this.escapingOverlap) {
            return false;
        }
        if (this.escapingOverlap && !this.overlapsOther(candidate, widget.id)) {
            this.escapingOverlap = false;
        }
        widget.rect = candidate;
        this.emitChange();
        return true;
    }

    endDrag(): void {
        if (
            (this.dragging === null && this.resizing === null) ||
            this.dragOrigin === null
        ) {
            return;
        }
        const origin = this.dragOrigin;
        const current = cloneWidgets(this.widgets);
        if (this.options.snapBackOnOverlap && this.hasCollision()) {
            this.widgets = origin;
            this.emitChange();
        } else if (JSON.stringify(origin) !== JSON.stringify(current)) {
            this.history.push(toSnapshots(origin));
            this.options.onCommit?.(current);
        }
        this.dragging = null;
        this.resizing = null;
        this.dragOrigin = null;
        this.escapingOverlap = false;
    }

    remove(id: string): boolean {
        if (!this.active || !this.find(id)) {
            return false;
        }
        const before = cloneWidgets(this.widgets);
        this.widgets = this.widgets.filter((widget) => widget.id !== id);
        this.history.push(toSnapshots(before));
        this.options.onRemove?.(id);
        this.options.onCommit?.(cloneWidgets(this.widgets));
        this.emitChange();
        return true;
    }

    guides(id: string): AlignmentGuide[] {
        const widget = this.find(id);
        if (!widget) {
            return [];
        }
        return alignmentGuides(
            widget.rect,
            this.widgets
                .filter((other) => other.id !== id)
                .map(({rect}) => rect),
            this.options.workArea,
        );
    }

    handleKey(
        id: string,
        key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Escape",
        shift = false,
    ): boolean {
        if (key === "Escape") {
            this.exit();
            return true;
        }
        const direction = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "up",
            ArrowDown: "down",
        }[key] as "left" | "right" | "up" | "down" | undefined;
        return direction === undefined
            ? false
            : this.nudge(id, direction, shift);
    }

    nudge(
        id: string,
        direction: "left" | "right" | "up" | "down",
        shift = false,
    ): boolean {
        const widget = this.find(id);
        if (!this.active || !widget || widget.locked) {
            return false;
        }
        const before = cloneWidgets(this.widgets);
        const moved = nudgeRect(widget.rect, direction, shift ? 10 : 1);
        if (this.overlapsOther(moved, id)) {
            return false;
        }
        widget.rect = clampRect(moved, this.options.workArea);
        this.history.push(toSnapshots(before));
        this.emitChange();
        this.options.onCommit?.(cloneWidgets(this.widgets));
        return true;
    }

    undo(): boolean {
        const next = this.history.undo(toSnapshots(this.widgets));
        if (!next) {
            return false;
        }
        this.applySnapshots(next);
        this.emitChange();
        this.options.onCommit?.(cloneWidgets(this.widgets));
        return true;
    }

    redo(): boolean {
        const next = this.history.redo(toSnapshots(this.widgets));
        if (!next) {
            return false;
        }
        this.applySnapshots(next);
        this.emitChange();
        this.options.onCommit?.(cloneWidgets(this.widgets));
        return true;
    }

    snapshot(): EditableWidget[] {
        return cloneWidgets(this.widgets);
    }

    private find(id: string): EditableWidget | undefined {
        return this.widgets.find((widget) => widget.id === id);
    }

    private overlapsOther(rect: Rect, id: string): boolean {
        if (!this.options.snapBackOnOverlap) {
            return false;
        }
        return collides(
            rect,
            this.widgets
                .filter((widget) => widget.id !== id)
                .map(({rect: value}) => value),
            this.options.gap ?? 0,
        );
    }

    private hasCollision(): boolean {
        for (let index = 0; index < this.widgets.length; index += 1) {
            if (
                collides(
                    this.widgets[index].rect,
                    this.widgets.slice(index + 1).map(({rect}) => rect),
                    this.options.gap ?? 0,
                )
            ) {
                return true;
            }
        }
        return false;
    }

    private applySnapshots(snapshots: readonly EditSnapshot[]): void {
        for (const snapshot of snapshots) {
            const widget = this.find(snapshot.id);
            if (widget) {
                widget.rect = {...snapshot.rect};
            }
        }
    }

    private emitChange(): void {
        this.options.onChange?.(cloneWidgets(this.widgets));
    }

    private updateSizeClass(widget: EditableWidget): void {
        const sizeClass = sizeClassForRect(widget.rect);
        if (widget.sizeClass === sizeClass) {
            return;
        }
        widget.sizeClass = sizeClass;
        this.options.onSizeClassChange?.(widget.id, sizeClass);
    }
}

function toSnapshots(widgets: readonly EditableWidget[]): EditSnapshot[] {
    return widgets.map(({id, rect}) => ({id, rect: {...rect}}));
}

function cloneWidgets(widgets: readonly EditableWidget[]): EditableWidget[] {
    return widgets.map((widget) => ({...widget, rect: {...widget.rect}}));
}
