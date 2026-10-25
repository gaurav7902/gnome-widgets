import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const gschemaPath = path.resolve(
    "schemas/org.gnome.shell.extensions.lumen.gschema.xml",
);
const xmlContent = fs.readFileSync(gschemaPath, "utf8");

// Extract all key names using regex
const keyRegex = /<key\s+name="([^"]+)"/g;
const schemaKeys = new Set();
let match;
while ((match = keyRegex.exec(xmlContent)) !== null) {
    schemaKeys.add(match[1]);
}

// Check keybinding name in keybinding.ts
const keybindingContent = fs.readFileSync(
    path.resolve("src/core/keybinding.ts"),
    "utf8",
);
// Look for default constructor arg or name usage
assert.ok(
    schemaKeys.has("toggle-edit-keybinding"),
    "Schema must contain toggle-edit-keybinding",
);
assert.ok(
    keybindingContent.includes("toggle-edit-keybinding"),
    "keybinding.ts must reference toggle-edit-keybinding",
);

console.log("schema key test passed");
