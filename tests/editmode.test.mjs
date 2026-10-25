import assert from "node:assert/strict";
import {EditModeController} from "../dist/core/editmode.js";

const widgets = [
    {id: "a", rect: {x: 0, y: 0, w: 100, h: 100}},
    {id: "b", rect: {x: 300, y: 0, w: 100, h: 100}, locked: true},
];
const commits = [];
const controller = new EditModeController({
    workArea: {x: 0, y: 0, w: 1000, h: 800},
    snapBackOnOverlap: true,
    onCommit: (value) => commits.push(value),
});

controller.enter(widgets);
assert.equal(controller.beginDrag("b"), false);
assert.equal(controller.beginDrag("a"), true);
assert.equal(controller.moveDrag({x: 300, y: 0, w: 100, h: 100}), false);
controller.endDrag();
const overlappingController = new EditModeController({
    workArea: {x: 0, y: 0, w: 1000, h: 800},
    snapBackOnOverlap: true,
});
overlappingController.enter([
    {id: "a", rect: {x: 0, y: 0, w: 100, h: 100}},
    {id: "c", rect: {x: 0, y: 0, w: 100, h: 100}},
]);
assert.equal(overlappingController.beginDrag("a"), true);
assert.equal(
    overlappingController.moveDrag({x: 120, y: 0, w: 100, h: 100}),
    true,
);
assert.equal(
    overlappingController.moveDrag({x: 130, y: 0, w: 100, h: 100}),
    true,
);
overlappingController.endDrag();
assert.equal(
    overlappingController.snapshot().find(({id}) => id === "a").rect.x,
    130,
);
assert.equal(controller.snapshot()[0].rect.x, 0);
assert.equal(controller.nudge("a", "right", true), true);
assert.equal(controller.snapshot()[0].rect.x, 10);
assert.equal(commits.length, 1);
assert.equal(controller.undo(), true);
assert.equal(controller.snapshot()[0].rect.x, 0);
assert.equal(controller.redo(), true);
assert.equal(controller.snapshot()[0].rect.x, 10);
assert.equal(controller.beginResize("a", "bottom-right"), true);
assert.equal(controller.moveResize(190, 120), true);
assert.equal(controller.snapshot()[0].rect.w, 290);
assert.equal(controller.snapshot()[0].sizeClass, "large");
controller.endDrag();
assert.equal(controller.guides("a").length > 0, true);
assert.equal(controller.handleKey("a", "Escape"), true);
assert.equal(controller.isActive, false);
controller.enter(widgets);
assert.equal(controller.remove("a"), true);
assert.equal(controller.snapshot().length, 1);
controller.exit();
assert.equal(controller.beginDrag("a"), false);
console.log("editmode tests passed");
