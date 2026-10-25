import assert from "node:assert/strict";
import {normalizeClockConfig, renderClockView} from "../dist/lib/clock.js";

const date = new Date("2024-01-02T13:04:05Z");
const config = normalizeClockConfig({
    mode: "world",
    timeFormat: "24h",
    showSeconds: true,
    worldClocks: [
        {label: "UTC", timeZone: "UTC"},
        {label: "Local", timeZone: "Europe/London"},
        {label: "New York", timeZone: "America/New_York"},
        {label: "Tokyo", timeZone: "Asia/Tokyo"},
        {label: "Ignored", timeZone: "Australia/Sydney"},
        {label: "Invalid"},
    ],
});
assert.equal(config.worldClocks.length, 4);
assert.equal(renderClockView(date, "large", config).primary, "UTC: 13:04:05");
assert.match(
    renderClockView(date, "regular", {
        timeFormat: "24h",
        showDate: true,
        showWeekday: true,
        timeZone: "UTC",
    }).secondary,
    /Tue/,
);
assert.equal(
    renderClockView(date, "compact", {showDate: true}).secondary,
    null,
);
console.log("clock tests passed");
