import assert from "node:assert/strict";
import {PreferencesModel} from "../dist/prefs/model.js";
import {defaults} from "../dist/lib/config.js";

const model = new PreferencesModel(defaults());
assert.equal(model.createProfile("work", "Work"), true);
assert.equal(model.value.activeProfile, "work");
assert.equal(model.selectProfile("default"), true);
assert.equal(model.selectProfile("missing"), false);

model.updateActiveProfile((profile) => ({
    ...profile,
    widgets: [
        {
            id: "clock-1",
            type: "clock",
            enabled: true,
            locked: false,
            anchor: "top-left",
            pos: {x: 0, y: 0},
            size: {w: 320, h: 150},
            style: {textScale: 1, radius: 20, opacity: null, palette: null},
            config: {},
        },
    ],
}));
assert.equal(model.duplicateWidget("clock-1"), "clock-1-2");
assert.equal(model.deleteWidget("clock-1"), true);
assert.equal(model.value.profiles.default.widgets.length, 1);
assert.equal(model.removeProfile("work"), true);

const imported = model.exportJson();
assert.equal(model.importJson(imported), true);
assert.equal(model.importJson("{bad"), false);
console.log("preferences model tests passed");
