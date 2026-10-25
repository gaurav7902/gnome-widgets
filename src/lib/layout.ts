import type {Anchor} from "./config.js";

export interface Size {
    w: number;
    h: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface Rect extends Point, Size {}

export interface WorkArea extends Rect {}

export interface Grid {
    cols: number;
    rows: number;
    gap: number;
}

export const normalisedToPixels = (
    position: Point,
    workArea: WorkArea,
): Point => ({
    x: workArea.x + clamp01(position.x) * workArea.w,
    y: workArea.y + clamp01(position.y) * workArea.h,
});

export const pixelsToNormalised = (
    position: Point,
    workArea: WorkArea,
): Point => ({
    x: workArea.w === 0 ? 0 : clamp01((position.x - workArea.x) / workArea.w),
    y: workArea.h === 0 ? 0 : clamp01((position.y - workArea.y) / workArea.h),
});

export const anchorOffset = (anchor: Anchor, size: Size): Point => {
    const horizontal = anchor.endsWith("right")
        ? 1
        : anchor.endsWith("center")
          ? 0.5
          : 0;
    const vertical = anchor.startsWith("bottom")
        ? 1
        : anchor.startsWith("middle") || anchor === "center"
          ? 0.5
          : 0;
    return {x: size.w * horizontal, y: size.h * vertical};
};

export const rectFromAnchor = (
    anchor: Anchor,
    position: Point,
    size: Size,
): Rect => {
    const offset = anchorOffset(anchor, size);
    return {
        x: position.x - offset.x,
        y: position.y - offset.y,
        ...size,
    };
};

export const clampRect = (rect: Rect, area: WorkArea): Rect => ({
    ...rect,
    x: clamp(rect.x, area.x, area.x + Math.max(0, area.w - rect.w)),
    y: clamp(rect.y, area.y, area.y + Math.max(0, area.h - rect.h)),
    w: Math.min(rect.w, area.w),
    h: Math.min(rect.h, area.h),
});

export const snap = (value: number, step: number): number =>
    step > 0 && Number.isFinite(step) ? Math.round(value / step) * step : value;

export const snapRect = (rect: Rect, step: number): Rect => ({
    ...rect,
    x: snap(rect.x, step),
    y: snap(rect.y, step),
    w: snap(rect.w, step),
    h: snap(rect.h, step),
});

export const overlaps = (a: Rect, b: Rect, gap = 0): boolean =>
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y;

export const collides = (
    rect: Rect,
    others: readonly Rect[],
    gap = 0,
): boolean => others.some((other) => overlaps(rect, other, gap));

export const gridCellSize = (area: WorkArea, grid: Grid): Size => ({
    w:
        grid.cols > 0
            ? Math.max(
                  0,
                  (area.w - Math.max(0, grid.gap) * (grid.cols - 1)) /
                      grid.cols,
              )
            : 0,
    h:
        grid.rows > 0
            ? Math.max(
                  0,
                  (area.h - Math.max(0, grid.gap) * (grid.rows - 1)) /
                      grid.rows,
              )
            : 0,
});

export const gridToRect = (
    cell: {col: number; row: number; colSpan?: number; rowSpan?: number},
    area: WorkArea,
    grid: Grid,
): Rect => {
    const size = gridCellSize(area, grid);
    const gap = Math.max(0, grid.gap);
    const col = clampGridIndex(cell.col, grid.cols);
    const row = clampGridIndex(cell.row, grid.rows);
    const colSpan = clampSpan(cell.colSpan, grid.cols - col);
    const rowSpan = clampSpan(cell.rowSpan, grid.rows - row);
    return {
        x: area.x + col * (size.w + gap),
        y: area.y + row * (size.h + gap),
        w: size.w * colSpan + gap * (colSpan - 1),
        h: size.h * rowSpan + gap * (rowSpan - 1),
    };
};

export const rectToGrid = (
    rect: Rect,
    area: WorkArea,
    grid: Grid,
): {col: number; row: number} => {
    const size = gridCellSize(area, grid);
    return {
        col: clampGridIndex(
            size.w + Math.max(0, grid.gap) > 0
                ? Math.round(
                      (rect.x - area.x) / (size.w + Math.max(0, grid.gap)),
                  )
                : 0,
            grid.cols,
        ),
        row: clampGridIndex(
            size.h + Math.max(0, grid.gap) > 0
                ? Math.round(
                      (rect.y - area.y) / (size.h + Math.max(0, grid.gap)),
                  )
                : 0,
            grid.rows,
        ),
    };
};

function clampGridIndex(value: number, count: number): number {
    const index = Number.isFinite(value) ? Math.round(value) : 0;
    return count > 0 ? clamp(index, 0, count - 1) : 0;
}

function clampSpan(value: number | undefined, available: number): number {
    const span = Number.isFinite(value) ? Math.round(value as number) : 1;
    return clamp(span, 1, Math.max(1, available));
}

function clamp01(value: number): number {
    return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
