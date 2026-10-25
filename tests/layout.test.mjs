import assert from "node:assert/strict";
import {
    anchorOffset,
    clampRect,
    collides,
    gridCellSize,
    gridToRect,
    normalisedToPixels,
    overlaps,
    pixelsToNormalised,
    rectFromAnchor,
    rectToGrid,
    snap,
    snapRect,
} from "../dist/lib/layout.js";

const area = {x: 10, y: 20, w: 1000, h: 800};
const rect = {x: 100, y: 120, w: 200, h: 100};

assert.deepEqual(normalisedToPixels({x: 0, y: 0}, area), {x: 10, y: 20});
assert.deepEqual(normalisedToPixels({x: 1, y: 1}, area), {x: 1010, y: 820});
assert.deepEqual(normalisedToPixels({x: 2, y: -1}, area), {x: 1010, y: 20});
assert.deepEqual(pixelsToNormalised({x: 10, y: 20}, area), {x: 0, y: 0});
assert.deepEqual(pixelsToNormalised({x: 1010, y: 820}, area), {x: 1, y: 1});
assert.deepEqual(pixelsToNormalised({x: -1, y: 900}, area), {x: 0, y: 1});

for (const anchor of [
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "center",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
]) {
    const offset = anchorOffset(anchor, {w: 100, h: 50});
    assert.ok(offset.x >= 0 && offset.x <= 100);
    assert.ok(offset.y >= 0 && offset.y <= 50);
}
assert.deepEqual(anchorOffset("top-left", {w: 100, h: 50}), {x: 0, y: 0});
assert.deepEqual(anchorOffset("center", {w: 100, h: 50}), {x: 50, y: 25});
assert.deepEqual(anchorOffset("bottom-right", {w: 100, h: 50}), {
    x: 100,
    y: 50,
});
assert.deepEqual(rectFromAnchor("center", {x: 500, y: 400}, {w: 100, h: 50}), {
    x: 450,
    y: 375,
    w: 100,
    h: 50,
});

assert.deepEqual(clampRect({...rect, x: -100, y: 900}, area), {
    x: 10,
    y: 720,
    w: 200,
    h: 100,
});
assert.deepEqual(clampRect({x: 0, y: 0, w: 2000, h: 2000}, area), area);
assert.equal(snap(24, 20), 20);
assert.equal(snap(26, 20), 20);
assert.equal(snap(35, 20), 40);
assert.equal(snap(20, 0), 20);
assert.deepEqual(snapRect(rect, 20), {x: 100, y: 120, w: 200, h: 100});
assert.deepEqual(snapRect({...rect, x: 109, y: 131, w: 209, h: 91}, 20), {
    x: 100,
    y: 140,
    w: 200,
    h: 100,
});

assert.equal(overlaps(rect, {x: 250, y: 120, w: 50, h: 50}), true);
assert.equal(overlaps(rect, {x: 301, y: 120, w: 50, h: 50}), false);
assert.equal(overlaps(rect, {x: 301, y: 120, w: 50, h: 50}, 2), true);
assert.equal(collides(rect, [{x: 500, y: 500, w: 20, h: 20}]), false);
assert.equal(collides(rect, [{x: 150, y: 150, w: 20, h: 20}]), true);

const grid = {cols: 4, rows: 2, gap: 10};
const cell = gridCellSize(area, grid);
assert.equal(cell.w, 242.5);
assert.equal(cell.h, 395);
const gridRect = gridToRect(
    {col: 1, row: 1, colSpan: 2, rowSpan: 1},
    area,
    grid,
);
assert.deepEqual(gridRect, {x: 262.5, y: 425, w: 495, h: 395});
assert.deepEqual(rectToGrid(gridRect, area, grid), {col: 1, row: 1});
assert.deepEqual(gridToRect({col: 0, row: 0}, area, grid), {
    x: 10,
    y: 20,
    w: 242.5,
    h: 395,
});
assert.deepEqual(rectToGrid({x: 10, y: 20, w: 1, h: 1}, area, grid), {
    col: 0,
    row: 0,
});

assert.deepEqual(gridCellSize(area, {cols: 0, rows: 0, gap: 10}), {
    w: 0,
    h: 0,
});
assert.deepEqual(gridCellSize(area, {cols: 2, rows: 2, gap: 1000}), {
    w: 0,
    h: 0,
});
assert.deepEqual(gridCellSize(area, {cols: 2, rows: 2, gap: -10}), {
    w: 500,
    h: 400,
});
assert.deepEqual(
    gridToRect({col: -2, row: 99, colSpan: 99, rowSpan: 99}, area, grid),
    {x: 10, y: 425, w: 1000, h: 395},
);
assert.deepEqual(
    gridToRect({col: Number.NaN, row: Number.POSITIVE_INFINITY}, area, grid),
    {x: 10, y: 20, w: 242.5, h: 395},
);
assert.deepEqual(rectToGrid({x: -1000, y: -1000, w: 1, h: 1}, area, grid), {
    col: 0,
    row: 0,
});
assert.deepEqual(rectToGrid({x: 10000, y: 10000, w: 1, h: 1}, area, grid), {
    col: 3,
    row: 1,
});
assert.deepEqual(
    gridToRect({col: 1, row: 1, colSpan: 0, rowSpan: -2}, area, grid),
    {x: 262.5, y: 425, w: 242.5, h: 395},
);

for (const value of [-100, -1, 0, 1, 100, Number.NaN]) {
    const normalised = pixelsToNormalised(
        {x: value, y: value},
        {x: 0, y: 0, w: 100, h: 100},
    );
    assert.ok(normalised.x >= 0 && normalised.x <= 1);
    assert.ok(normalised.y >= 0 && normalised.y <= 1);
}
for (const value of [-100, -1, 0, 1, 100, Number.NaN]) {
    const pixels = normalisedToPixels({x: value, y: value}, area);
    assert.ok(pixels.x >= area.x && pixels.x <= area.x + area.w);
    assert.ok(pixels.y >= area.y && pixels.y <= area.y + area.h);
}
for (const value of [0, 1, 2, 10, 11, 20, 21, 99]) {
    assert.equal(snap(value, 10) % 10, 0);
}
for (const anchor of [
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "center",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
]) {
    const anchored = rectFromAnchor(anchor, {x: 500, y: 400}, rect);
    assert.equal(anchored.w, rect.w);
    assert.equal(anchored.h, rect.h);
}
for (const gap of [0, 1, 10, 100]) {
    assert.equal(overlaps(rect, rect, gap), true);
    assert.equal(
        overlaps(rect, {...rect, x: rect.x + rect.w + gap + 1}, gap),
        false,
    );
}

console.log("layout tests passed");
