import assert from "node:assert/strict";
import {duration, easeOutQuad, MOTION} from "../dist/lib/motion.js";
import {TYPOGRAPHY} from "../dist/lib/typography.js";

assert.deepEqual(MOTION, {short: 150, standard: 200, long: 250});
assert.equal(duration("standard", false, true), 200);
assert.equal(duration("standard", true, true), 0);
assert.equal(duration("standard", false, false), 0);
assert.equal(easeOutQuad(0), 0);
assert.equal(easeOutQuad(0.5), 0.75);
assert.equal(easeOutQuad(1), 1);
assert.equal(TYPOGRAPHY.body, 13);
assert.equal(TYPOGRAPHY.displayLarge, 56);
console.log("motion tests passed");
