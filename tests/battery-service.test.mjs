import assert from "node:assert/strict";
import {BatteryService} from "../dist/services/battery.js";

let reads = 0;
let value = null;
const service = new BatteryService({
    async read() {
        reads += 1;
        return {percentage: 83.4, state: "charging", timeSeconds: 3600};
    },
});
const subscription = service.acquire((next) => {
    value = next;
});
await new Promise((resolve) => setImmediate(resolve));
assert.equal(reads, 1);
assert.equal(value.percentage, 83.4);
subscription.release();
service.destroy();
console.log("battery service tests passed");
