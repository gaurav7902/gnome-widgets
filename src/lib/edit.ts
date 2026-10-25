import type {Rect} from "./layout.js";
import type {WorkArea} from "./layout.js";

export interface EditSnapshot {
    id: string;
    rect: Rect;
}

export type NudgeDirection = "left" | "right" | "up" | "down";
export type ResizeHandle =
    | "top-left"
    | "top"
    | "top-right"
    | "right"
    | "bottom-right"
    | "bottom"
    | "bottom-left"
    | "left";

export interface AlignmentGuide {
    axis: "x" | "y";
    position: number;
    start: number;
    end: number;
}

export const resizeRect = (
    origin: Rect,
    handle: ResizeHandle,
    deltaX: number,
    deltaY: number,
    minSize = {w: 16, h: 16},
): Rect => {
    const dx = Number.isFinite(deltaX) ? deltaX : 0;
    const dy = Number.isFinite(deltaY) ? deltaY : 0;
    let {x, y, w, h} = origin;
    if (handle.includes("left")) {
        const next = Math.min(x + dx, x + w - minSize.w);
        x = next;
        w = origin.x + origin.w - next;
    } else if (handle.includes("right")) {
        w = Math.max(minSize.w, w + dx);
    }
    if (handle.startsWith("top")) {
        const next = Math.min(y + dy, y + h - minSize.h);
        y = next;
        h = origin.y + origin.h - next;
    } else if (handle.startsWith("bottom")) {
        h = Math.max(minSize.h, h + dy);
    }
    return {x, y, w, h};
};

export const alignmentGuides = (
    rect: Rect,
    others: readonly Rect[],
    area: WorkArea,
    threshold = 6,
): AlignmentGuide[] => {
    const candidates = [
        {
            axis: "x" as const,
            value: rect.x,
            start: rect.y,
            end: rect.y + rect.h,
        },
        {
            axis: "x" as const,
            value: rect.x + rect.w / 2,
            start: rect.y,
            end: rect.y + rect.h,
        },
        {
            axis: "x" as const,
            value: rect.x + rect.w,
            start: rect.y,
            end: rect.y + rect.h,
        },
        {
            axis: "y" as const,
            value: rect.y,
            start: rect.x,
            end: rect.x + rect.w,
        },
        {
            axis: "y" as const,
            value: rect.y + rect.h / 2,
            start: rect.x,
            end: rect.x + rect.w,
        },
        {
            axis: "y" as const,
            value: rect.y + rect.h,
            start: rect.x,
            end: rect.x + rect.w,
        },
    ];
    const targets = [
        ...others.flatMap((other) => [
            {
                axis: "x" as const,
                value: other.x,
                start: other.y,
                end: other.y + other.h,
            },
            {
                axis: "x" as const,
                value: other.x + other.w / 2,
                start: other.y,
                end: other.y + other.h,
            },
            {
                axis: "x" as const,
                value: other.x + other.w,
                start: other.y,
                end: other.y + other.h,
            },
            {
                axis: "y" as const,
                value: other.y,
                start: other.x,
                end: other.x + other.w,
            },
            {
                axis: "y" as const,
                value: other.y + other.h / 2,
                start: other.x,
                end: other.x + other.w,
            },
            {
                axis: "y" as const,
                value: other.y + other.h,
                start: other.x,
                end: other.x + other.w,
            },
        ]),
        {
            axis: "x" as const,
            value: area.x,
            start: area.y,
            end: area.y + area.h,
        },
        {
            axis: "x" as const,
            value: area.x + area.w / 2,
            start: area.y,
            end: area.y + area.h,
        },
        {
            axis: "x" as const,
            value: area.x + area.w,
            start: area.y,
            end: area.y + area.h,
        },
        {
            axis: "y" as const,
            value: area.y,
            start: area.x,
            end: area.x + area.w,
        },
        {
            axis: "y" as const,
            value: area.y + area.h / 2,
            start: area.x,
            end: area.x + area.w,
        },
        {
            axis: "y" as const,
            value: area.y + area.h,
            start: area.x,
            end: area.x + area.w,
        },
    ];
    return candidates.flatMap((candidate) => {
        const target = targets.find(
            (item) =>
                item.axis === candidate.axis &&
                Math.abs(item.value - candidate.value) <= threshold,
        );
        return target
            ? [
                  {
                      axis: target.axis,
                      position: target.value,
                      start: Math.min(candidate.start, target.start),
                      end: Math.max(candidate.end, target.end),
                  },
              ]
            : [];
    });
};

export const sizeClassForRect = (
    rect: Rect,
): "compact" | "regular" | "large" =>
    rect.w < 240 || rect.h < 100
        ? "compact"
        : rect.w >= 480 || rect.h >= 220
          ? "large"
          : "regular";

export const nudgeRect = (
    rect: Rect,
    direction: NudgeDirection,
    step: number,
): Rect => {
    const distance = Math.max(0, Number.isFinite(step) ? step : 0);
    const delta = {
        left: {x: -distance, y: 0},
        right: {x: distance, y: 0},
        up: {x: 0, y: -distance},
        down: {x: 0, y: distance},
    }[direction];
    return {...rect, x: rect.x + delta.x, y: rect.y + delta.y};
};

export class EditHistory {
    private readonly undoStack: EditSnapshot[][] = [];
    private readonly redoStack: EditSnapshot[][] = [];

    constructor(private readonly limit = 50) {}

    push(snapshot: readonly EditSnapshot[]): void {
        this.undoStack.push(clone(snapshot));
        while (this.undoStack.length > this.limit) {
            this.undoStack.shift();
        }
        this.redoStack.length = 0;
    }

    undo(current: readonly EditSnapshot[]): EditSnapshot[] | null {
        const previous = this.undoStack.pop();
        if (!previous) {
            return null;
        }
        this.redoStack.push(clone(current));
        return clone(previous);
    }

    redo(current: readonly EditSnapshot[]): EditSnapshot[] | null {
        const next = this.redoStack.pop();
        if (!next) {
            return null;
        }
        this.undoStack.push(clone(current));
        return clone(next);
    }

    clear(): void {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
    }
}

function clone(snapshot: readonly EditSnapshot[]): EditSnapshot[] {
    return snapshot.map((item) => ({id: item.id, rect: {...item.rect}}));
}
