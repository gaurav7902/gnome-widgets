import assert from "node:assert/strict";
import {FileContentService} from "../dist/services/file-content.js";

const callbacks = new Map();
let value = null;
const service = new FileContentService(
    {
        async read() {
            return "hello";
        },
        async writeAtomic() {},
    },
    {
        watch(path, callback) {
            callbacks.set(path, callback);
            return {cancel: () => callbacks.delete(path)};
        },
    },
);
const subscription = service.acquire("/tmp/note", (contents) => {
    value = contents;
});
await new Promise((resolve) => setImmediate(resolve));
assert.equal(value, "hello");
callbacks.get("/tmp/note")();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(await service.write("/tmp/note", "new"), true);
subscription.release();
service.destroy();
assert.equal(callbacks.size, 0);
console.log("file content tests passed");
