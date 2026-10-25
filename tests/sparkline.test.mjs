import assert from "node:assert/strict";
import {clampBarValue, sparklineScale} from "../dist/lib/sparkline.js";

assert.equal(clampBarValue(-1), 0);
assert.equal(clampBarValue(2), 1);
assert.equal(clampBarValue(Number.NaN), 0);

const scale = sparklineScale([10, 20, 15], 100, 40);
assert.equal(scale.min, 10);
assert.equal(scale.max, 20);
assert.equal(scale.points.length, 3);
assert.equal(scale.points[0].x, 2);
assert.equal(scale.points[1].y, 2);
assert.equal(scale.points[2].x, 98);

const empty = sparklineScale([], 100, 40);
assert.deepEqual(empty.points, []);
console.log("sparkline tests passed");
