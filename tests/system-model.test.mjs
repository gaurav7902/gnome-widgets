import assert from "node:assert/strict";
import {renderSystemMetrics} from "../dist/lib/system.js";

const metrics = renderSystemMetrics(
    {
        cpu: 42.4,
        memory: {
            total: 100,
            available: 20,
            used: 80,
            swapTotal: 0,
            swapFree: 0,
        },
        network: [
            {name: "eth0", receivedPerSecond: 10, transmittedPerSecond: 20},
        ],
        timestamp: 1,
    },
    {metrics: {network: {view: "bar"}}},
);
assert.deepEqual(
    metrics.map(({metric, text, view}) => [metric, text, view]),
    [
        ["cpu", "42%", "number"],
        ["memory", "80%", "number"],
        ["network", "30 B/s", "bar"],
    ],
);
assert.equal(
    renderSystemMetrics(
        {cpu: null, memory: null, network: [], timestamp: 1},
        {},
    )[0].text,
    "Not available",
);
console.log("system model tests passed");
