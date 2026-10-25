import assert from "node:assert/strict";
import {SystemStatsService} from "../dist/services/sysstats.js";
import {SharedTicker} from "../dist/lib/ticker.js";

const scheduled = [];
const originalNow = Date.now;
let now = 0;
Date.now = () => now;
const scheduler = {
    schedule(delay, callback) {
        scheduled.push({delay, callback});
        return scheduled.length;
    },
    cancel() {},
};
const ticker = new SharedTicker(scheduler);
const files = {
    "/proc/stat": "cpu 10 0 10 80 0 0 0 0\n",
    "/proc/meminfo":
        "MemTotal: 1024 kB\nMemAvailable: 256 kB\nSwapTotal: 0 kB\nSwapFree: 0 kB\n",
    "/proc/net/dev": "eth0: 100 0 0 0 0 0 0 0 200\n",
};
const service = new SystemStatsService(
    {
        async read(path) {
            return files[path];
        },
    },
    ticker,
);
let snapshot = null;
service.acquire("memory", (value) => {
    snapshot = value;
});
assert.equal(scheduled.length, 1);
now = 1000;
scheduled[0].callback();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(snapshot.memory.available, 256 * 1024);
assert.equal(service.getHistory("memory").length, 1);
service.destroy();
Date.now = originalNow;
console.log("system stats tests passed");
