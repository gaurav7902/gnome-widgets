import assert from "node:assert/strict";
import {formatClock, formatWorldClocks} from "../dist/lib/format.js";
import {SharedTicker} from "../dist/lib/ticker.js";

let now = 0;
const originalNow = Date.now;
Date.now = () => now;
let nextId = 1;
const scheduled = new Map();
const scheduler = {
    schedule(delay, callback) {
        const id = nextId++;
        scheduled.set(id, {delay, callback});
        return id;
    },
    cancel(id) {
        scheduled.delete(id);
    },
};
const runNext = () => {
    const [id, entry] = scheduled.entries().next().value;
    scheduled.delete(id);
    entry.callback();
};
const ticker = new SharedTicker(scheduler);
let shortCalls = 0;
let longCalls = 0;
const first = ticker.acquire(1200, () => {
    longCalls += 1;
});
const second = ticker.acquire(500, () => {
    shortCalls += 1;
});
assert.equal(scheduled.size, 1);
now = 500;
runNext();
assert.equal(shortCalls, 1);
assert.equal(longCalls, 0);
now = 1000;
runNext();
assert.equal(shortCalls, 2);
assert.equal(longCalls, 0);
now = 1200;
runNext();
assert.equal(shortCalls, 2);
assert.equal(longCalls, 1);
first.release();
assert.equal(scheduled.size, 1);
second.release();
assert.equal(scheduled.size, 0);
ticker.destroy();
Date.now = originalNow;

const formatted = formatClock(new Date("2024-01-02T13:04:05Z"), {
    timeFormat: "24h",
    showSeconds: true,
    date: true,
    timeZone: "UTC",
    locale: "en-US",
});
assert.match(formatted, /13:04:05/);
assert.match(formatted, /Jan/);
assert.match(
    formatClock(new Date("2024-01-02T13:04:05Z"), {
        timeFormat: "system",
        timeZone: "not-a-zone",
        locale: "en-US",
    }),
    /^\d{1,2}:\d{2}/,
);
assert.deepEqual(
    formatWorldClocks(
        new Date("2024-01-02T13:04:05Z"),
        [{label: "UTC", timeZone: "UTC"}],
        {timeFormat: "24h", locale: "en-US"},
    ),
    ["UTC: 13:04"],
);
console.log("ticker and format tests passed");
