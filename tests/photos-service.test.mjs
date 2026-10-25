import assert from "node:assert/strict";
import {PhotosService} from "../dist/services/photos.js";

let resolveEnumeration;
let value = null;
const service = new PhotosService({
    enumerate() {
        return new Promise((resolve) => {
            resolveEnumeration = resolve;
        });
    },
});
const subscription = service.acquire(["/Pictures"], (entries) => {
    value = entries;
});
subscription.release();
resolveEnumeration([{path: "/a.jpg", name: "a.jpg", modifiedMs: 1}]);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(value, null);
service.destroy();
console.log("photos service tests passed");

const pending = new Map();
const concurrentValues = [];
const concurrentService = new PhotosService({
    enumerate(roots) {
        return new Promise((resolve) => pending.set(roots[0], resolve));
    },
});
concurrentService.acquire(["/Pictures/A"], (entries) =>
    concurrentValues.push(["A", entries[0]?.name]),
);
concurrentService.acquire(["/Pictures/B"], (entries) =>
    concurrentValues.push(["B", entries[0]?.name]),
);
pending.get("/Pictures/B")([
    {path: "/Pictures/B/b.jpg", name: "b.jpg", modifiedMs: 2},
]);
pending.get("/Pictures/A")([
    {path: "/Pictures/A/a.jpg", name: "a.jpg", modifiedMs: 1},
]);
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(concurrentValues.sort(), [
    ["A", "a.jpg"],
    ["B", "b.jpg"],
]);
concurrentService.destroy();
