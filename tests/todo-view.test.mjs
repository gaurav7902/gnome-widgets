import assert from "node:assert/strict";
import {parseTodo} from "../dist/lib/todotxt.js";
import {visibleTodos} from "../dist/lib/todo-view.js";

const items = parseTodo("(A) first\nx (B) done\nsecond");
const metadata = parseTodo("plan +work @home due:2025-04-01")[0];
assert.deepEqual(metadata.projects, ["work"]);
assert.deepEqual(metadata.contexts, ["home"]);
assert.equal(metadata.due, "2025-04-01");
assert.deepEqual(visibleTodos(items), [
    {text: "first", completed: false, priority: "(A)"},
    {text: "second", completed: false, priority: null},
]);
assert.equal(visibleTodos(items, true, 2).length, 2);
console.log("todo view tests passed");
