import assert from "node:assert/strict";
import {renderCalendarView} from "../dist/lib/calendar-view.js";

const view = renderCalendarView(new Date("2024-02-15T12:00:00Z"), {
    weekStartsOn: 1,
    showWeekNumbers: true,
});
assert.match(view.title, /2024/);
assert.equal(view.days.length, 42);
assert.equal(view.weekNumbers.length, 6);
assert.equal(view.days.filter(({today}) => today).length, 1);
console.log("calendar view tests passed");
