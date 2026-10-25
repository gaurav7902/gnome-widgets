import assert from "node:assert/strict";
import {UPowerBatteryService} from "../dist/services/upower.js";

let emit;
let disconnected = false;
const service = new UPowerBatteryService({
    connect(listener) {
        emit = listener;
        return {disconnect: () => (disconnected = true)};
    },
});
let snapshot = null;
service.acquire((value) => {
    snapshot = value;
});
emit([
    {
        id: "battery",
        name: "Laptop",
        kind: "laptop",
        percentage: 76,
        state: "discharging",
        timeSeconds: 1800,
    },
    {
        id: "mouse",
        name: "Mouse",
        kind: "peripheral",
        percentage: 90,
        state: "full",
    },
]);
assert.equal(snapshot.primary.name, "Laptop");
assert.equal(snapshot.peripherals[0].name, "Mouse");
service.destroy();
assert.equal(disconnected, true);
console.log("upower tests passed");
