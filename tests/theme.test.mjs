import assert from "node:assert/strict";
import {
    contrastRatio,
    presetPalette,
    validateStyleOverrides,
} from "../dist/core/theme.js";
import {accentFor} from "../dist/core/accent.js";

for (const preset of [
    "system",
    "dark",
    "light",
    "nord",
    "dracula",
    "gruvbox",
]) {
    const palette = presetPalette(preset, "dark", accentFor("blue"));
    assert.ok(
        contrastRatio(palette.text, palette.surface) >= 4.5,
        `${preset} text`,
    );
    assert.ok(
        contrastRatio(palette.textDim, palette.surface) >= 4.5,
        `${preset} dim`,
    );
}

const style = validateStyleOverrides({
    textScale: 99,
    radius: -1,
    opacity: 0,
    palette: "not-a-preset",
});
assert.deepEqual(style, {
    textScale: 3,
    radius: 0,
    opacity: 0.1,
    palette: null,
});
console.log("theme tests passed");
