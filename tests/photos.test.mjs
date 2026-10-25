import assert from "node:assert/strict";
import {selectPhotos} from "../dist/lib/photos.js";

const photos = selectPhotos(
    [
        {path: "/b.jpg", name: "b.jpg", modifiedMs: 2},
        {path: "/bad", name: "bad", modifiedMs: Number.NaN},
        {path: "/a.jpg", name: "a.jpg", modifiedMs: 3},
    ],
    1,
);
assert.deepEqual(photos, [{path: "/a.jpg", name: "a.jpg", modifiedMs: 3}]);
console.log("photos tests passed");
