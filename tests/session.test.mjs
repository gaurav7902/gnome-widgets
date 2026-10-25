import assert from "node:assert";
import {resetSessionState} from "../dist/core/session.js";

let setBooleanCalled = false;
let lastKey = null;
let lastValue = null;

const fakeSettings = {
    set_boolean(key, value) {
        setBooleanCalled = true;
        lastKey = key;
        lastValue = value;
    },
};

resetSessionState(fakeSettings);
assert.strictEqual(setBooleanCalled, true);
assert.strictEqual(lastKey, "edit-mode");
assert.strictEqual(lastValue, false);
console.log("session.test.mjs passed");
