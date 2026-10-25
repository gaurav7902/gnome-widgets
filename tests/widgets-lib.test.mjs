import assert from "node:assert/strict";
import {monthGrid} from "../dist/lib/calendar.js";
import {normalizeBattery} from "../dist/lib/battery.js";
import {parseTodo, serializeTodo} from "../dist/lib/todotxt.js";
import {expandTokens} from "../dist/lib/tokens.js";
import {
    pauseTimer,
    remainingSeconds,
    resetTimer,
    startTimer,
} from "../dist/lib/timer.js";

assert.equal(monthGrid(new Date(2024, 0, 15)).length, 42);
assert.equal(
    monthGrid(new Date(2024, 0, 15)).filter((day) => day.inMonth).length,
    31,
);
assert.deepEqual(
    normalizeBattery({percentage: 120, state: "charging", timeSeconds: -1}),
    {
        percentage: 100,
        state: "charging",
        timeSeconds: null,
    },
);
const todos = parseTodo(" (A) buy milk\nx (B) done\n");
assert.equal(todos.length, 2);
assert.equal(todos[1].completed, true);
assert.equal(serializeTodo(todos), " (A) buy milk\nx (B) done\n");
assert.equal(expandTokens("{user} {unknown}", {user: "Ada"}), "Ada {unknown}");
const timer = startTimer(60, 1000);
assert.equal(remainingSeconds(timer, 31_000), 30);
assert.equal(pauseTimer(timer, 31_000).durationSeconds, 30);
assert.equal(resetTimer(timer).running, false);
console.log("widget library tests passed");
