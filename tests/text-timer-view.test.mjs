import assert from "node:assert/strict";
import {renderTextView} from "../dist/lib/text-view.js";
import {renderTimerView} from "../dist/lib/timer-view.js";

assert.deepEqual(
    renderTextView(
        {text: "Hello {user}\n{unknown}\nthird", maxLines: 2},
        {user: "Lumen"},
    ),
    {text: "Hello Lumen\n{unknown}", truncated: true},
);
assert.deepEqual(
    renderTimerView(
        {durationSeconds: 90, endTimestamp: 91000, running: true},
        1000,
    ),
    {title: "1:30", detail: "Running", finished: false},
);
console.log("text and timer view tests passed");
