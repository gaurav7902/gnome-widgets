import assert from "node:assert/strict";
import {
    alignmentGuides,
    EditHistory,
    nudgeRect,
    resizeRect,
    sizeClassForRect,
} from "../dist/lib/edit.js";

const rect = {x: 10, y: 20, w: 100, h: 50};
assert.deepEqual(nudgeRect(rect, "left", 1), {x: 9, y: 20, w: 100, h: 50});
assert.deepEqual(nudgeRect(rect, "right", 10), {x: 20, y: 20, w: 100, h: 50});
assert.deepEqual(nudgeRect(rect, "up", 1), {x: 10, y: 19, w: 100, h: 50});
assert.deepEqual(nudgeRect(rect, "down", 10), {x: 10, y: 30, w: 100, h: 50});
assert.deepEqual(resizeRect(rect, "bottom-right", 20, 10), {
    x: 10,
    y: 20,
    w: 120,
    h: 60,
});
assert.deepEqual(resizeRect(rect, "top-left", -20, -10), {
    x: -10,
    y: 10,
    w: 120,
    h: 60,
});
assert.deepEqual(resizeRect(rect, "left", 200, 200), {
    x: 94,
    y: 20,
    w: 16,
    h: 50,
});
assert.equal(sizeClassForRect({x: 0, y: 0, w: 200, h: 100}), "compact");
assert.equal(sizeClassForRect({x: 0, y: 0, w: 320, h: 150}), "regular");
assert.equal(sizeClassForRect({x: 0, y: 0, w: 480, h: 150}), "large");
assert.equal(
    alignmentGuides(
        {x: 100, y: 100, w: 100, h: 100},
        [{x: 205, y: 300, w: 50, h: 50}],
        {x: 0, y: 0, w: 1000, h: 800},
        6,
    )[0].position,
    205,
);

const initial = [{id: "clock", rect}];
const changed = [{id: "clock", rect: {...rect, x: 30}}];
const history = new EditHistory(2);
history.push(initial);
assert.deepEqual(history.undo(changed), initial);
assert.deepEqual(history.redo(initial), changed);
history.push(initial);
history.push(changed);
history.push(initial);
assert.equal(history.undo(changed)?.[0].rect.x, 10);
history.clear();
assert.equal(history.undo(initial), null);
console.log("edit tests passed");
