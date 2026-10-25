import assert from "node:assert/strict";
import {arrangeWidgets, findFreeSlot} from "../dist/lib/arrange.js";

const area = {x: 0, y: 0, w: 1920, h: 1080};
const items = [
    {id: "clock-1", size: {w: 320, h: 150}},
    {id: "calendar-1", size: {w: 320, h: 280}},
    {id: "todo-1", size: {w: 320, h: 220}},
];

const result = arrangeWidgets(items, area);
assert.strictEqual(result.placed.length, 3);
assert.strictEqual(result.overflow.length, 0);

for (let i = 0; i < result.placed.length; i++) {
    for (let j = i + 1; j < result.placed.length; j++) {
        const a = result.placed[i].rect;
        const b = result.placed[j].rect;
        const overlaps =
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y;
        assert.ok(
            !overlaps,
            `Widgets ${result.placed[i].id} and ${result.placed[j].id} overlap`,
        );
    }
}

const freeSlot = findFreeSlot([], {w: 320, h: 150}, area);
assert.ok(typeof freeSlot.x === "number");
assert.ok(typeof freeSlot.y === "number");

console.log("arrange tests passed");
