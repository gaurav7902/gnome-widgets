import assert from "node:assert/strict";
import {clampRingValue, ringGeometry} from "../dist/lib/ring.js";

assert.equal(clampRingValue(-1), 0);
assert.equal(clampRingValue(2), 1);
assert.equal(clampRingValue(Number.NaN), 0);

const geometry = ringGeometry(0.5, 100, 10);
assert.equal(geometry.value, 0.5);
assert.equal(geometry.diameter, 100);
assert.equal(geometry.thickness, 10);
assert.equal(geometry.dashOffset, geometry.circumference / 2);

const clamped = ringGeometry(0.8, 20, 99);
assert.equal(clamped.thickness, 10);
assert.equal(clamped.diameter, 20);
console.log("ring tests passed");
