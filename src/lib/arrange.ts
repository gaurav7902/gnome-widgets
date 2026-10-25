import type {Rect, WorkArea, Size} from "./layout.js";

export interface ArrangeItem {
    id: string;
    size: Size;
    minSize?: Size;
}

export interface ArrangeResult {
    placed: {id: string; rect: Rect}[];
    overflow: {id: string; rect: Rect}[];
}

export interface ArrangeOptions {
    gap?: number;
    margin?: number;
}

export function arrangeWidgets(
    items: readonly ArrangeItem[],
    area: WorkArea,
    options: ArrangeOptions = {},
): ArrangeResult {
    const gap = options.gap ?? 12;
    const margin = options.margin ?? 16;
    const placed: {id: string; rect: Rect}[] = [];
    const overflow: {id: string; rect: Rect}[] = [];

    const availableHeight = Math.max(0, area.h - margin * 2);
    const availableWidth = Math.max(0, area.w - margin * 2);

    let currentX = area.x + availableWidth;
    let currentY = area.y + margin;
    let currentColMaxWidth = 0;

    for (const item of items) {
        let w = Math.max(20, item.size.w);
        let h = Math.max(20, item.size.h);
        const minW = Math.max(20, item.minSize?.w ?? 100);
        const minH = Math.max(20, item.minSize?.h ?? 80);

        if (h > availableHeight) {
            h = availableHeight;
        }
        if (h < minH && availableHeight >= minH) {
            h = minH;
        }
        if (w > availableWidth) {
            w = availableWidth;
        }
        if (w < minW && availableWidth >= minW) {
            w = minW;
        }

        currentColMaxWidth = Math.max(currentColMaxWidth, w);

        if (currentY + h > area.y + area.h - margin && placed.length > 0) {
            currentX -= currentColMaxWidth + gap;
            currentY = area.y + margin;
            currentColMaxWidth = w;
        }

        if (currentX - w < area.x + margin && placed.length > 0) {
            const cascadeOffset = overflow.length * 24;
            overflow.push({
                id: item.id,
                rect: {
                    x: area.x + margin + cascadeOffset,
                    y: area.y + margin + cascadeOffset,
                    w,
                    h,
                },
            });
            continue;
        }

        if (placed.length === 0) {
            currentX = area.x + availableWidth - w;
        } else if (currentY === area.y + margin) {
            currentX = Math.min(currentX, area.x + availableWidth - w);
        }

        const rect: Rect = {
            x: currentX,
            y: currentY,
            w,
            h,
        };

        placed.push({id: item.id, rect});
        currentY += h + gap;
    }

    return {placed, overflow};
}

export function findFreeSlot(
    existing: readonly Rect[],
    size: Size,
    workArea: WorkArea,
    gap = 16,
): {x: number; y: number} {
    const w = Math.max(20, size.w);
    const h = Math.max(20, size.h);
    const availableW = Math.max(0, workArea.w - 32);
    const availableH = Math.max(0, workArea.h - 32);

    const columns = Math.max(1, Math.floor((availableW + gap) / (w + gap)));
    const rows = Math.max(1, Math.floor((availableH + gap) / (h + gap)));

    for (let index = 0; index < columns * rows; index += 1) {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = workArea.x + 16 + col * (w + gap);
        const y = workArea.y + 16 + row * (h + gap);
        const rect: Rect = {x, y, w, h};

        const collidesWithAny = existing.some(
            (other) =>
                rect.x < other.x + other.w + gap &&
                rect.x + rect.w + gap > other.x &&
                rect.y < other.y + other.h + gap &&
                rect.y + rect.h + gap > other.y,
        );

        if (!collidesWithAny) {
            return {
                x: Math.min(1, Math.max(0, (rect.x - workArea.x) / workArea.w)),
                y: Math.min(1, Math.max(0, (rect.y - workArea.y) / workArea.h)),
            };
        }
    }

    return {x: 0.05, y: 0.05};
}
