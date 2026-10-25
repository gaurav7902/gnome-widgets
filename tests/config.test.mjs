import assert from "node:assert/strict";
import {defaults, migrate, parse, validate} from "../dist/lib/config.js";

const fallback = defaults();
assert.equal(parse("{not-json").activeProfile, "default");
assert.equal(validate({profiles: {}}).activeProfile, "default");

const config = validate({
    futureField: "preserved",
    activeProfile: "missing",
    profiles: {
        work: {
            widgets: [{type: "future-widget", pos: {x: 4, y: -1}}],
        },
    },
});
assert.equal(config.futureField, "preserved");
assert.equal(config.activeProfile, "work");
assert.equal(config.profiles.work.widgets[0].type, "future-widget");
assert.equal(config.profiles.work.widgets[0].pos.x, 1);
assert.equal(config.profiles.work.widgets[0].pos.y, 0);

const future = migrate({futureField: true, profiles: {}}, 99);
assert.equal(future.futureField, true);
assert.equal(future.version, 1);
assert.deepEqual(Object.keys(fallback.profiles), ["default"]);
console.log("config tests passed");
