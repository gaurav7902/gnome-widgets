import assert from "node:assert/strict";
import {cpuUsage, parseProcStat} from "../dist/lib/procstat.js";
import {parseMemInfo} from "../dist/lib/meminfo.js";
import {networkRates, parseNetDev} from "../dist/lib/netdev.js";
import {parseHwmon, selectSensors} from "../dist/lib/hwmon.js";

const previous = parseProcStat("cpu  10 0 10 80 0 0 0 0\ncpu0 10 0 10 80");
const current = parseProcStat("cpu  20 0 20 90 0 0 0 0\ncpu0 20 0 20 90");
assert.equal(Math.round(cpuUsage(previous, current).total), 67);
assert.equal(parseProcStat("bad input").length, 0);

const memory = parseMemInfo(
    "MemTotal:       1024 kB\nMemAvailable:    256 kB\nSwapTotal:      512 kB\nSwapFree:       128 kB",
);
assert.equal(memory.total, 1024 * 1024);
assert.equal(memory.available, 256 * 1024);
assert.equal(memory.used, 768 * 1024);

const before = parseNetDev("eth0: 100 0 0 0 0 0 0 0 200");
const after = parseNetDev("eth0: 300 0 0 0 0 0 0 0 600");
assert.deepEqual(networkRates(before, after, 2), [
    {
        name: "eth0",
        receivedPerSecond: 100,
        transmittedPerSecond: 200,
    },
]);

const sensors = parseHwmon([
    {
        chip: "coretemp",
        name: "temp1_input",
        label: "Package id 0",
        value: "42000",
    },
    {chip: "amdgpu", name: "temp1_input", value: 55_000},
    {chip: "nvme", name: "temp1_input", value: "bad"},
]);
assert.equal(sensors[0].degreesCelsius, 42);
assert.equal(selectSensors(sensors, "gpu").length, 1);
assert.equal(selectSensors(sensors, "storage").length, 0);
console.log("parser tests passed");
