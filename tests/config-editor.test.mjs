import assert from "node:assert/strict";
import {
    ConfigEditor,
    exportConfig,
    importConfig,
} from "../dist/lib/config-editor.js";

let changes = 0;
const editor = new ConfigEditor(
    {profiles: {}},
    {
        debounceMs: 1,
        onChange: () => {
            changes += 1;
        },
    },
);
editor.patch((config) => ({...config, activeProfile: "default"}));
editor.flush();
assert.equal(changes, 1);
assert.equal(editor.importJson("{bad"), false);
assert.equal(editor.importJson('{"profiles":{}}'), true);
assert.equal(importConfig("{bad"), null);
assert.equal(JSON.parse(exportConfig(editor.value)).version, 1);
editor.destroy();
console.log("config editor tests passed");
