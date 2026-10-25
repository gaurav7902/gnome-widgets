import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execSync} from "node:child_process";

console.log("Building and packing extension for verification...");
execSync("npm run build && npm run pack", {stdio: "inherit"});

// Find the packed zip
const buildDir = path.resolve("build");
const files = fs.readdirSync(buildDir);
const zipFile = files.find((f) => f.endsWith(".zip"));
assert.ok(zipFile, "Packed extension zip should exist in build/");

const zipPath = path.join(buildDir, zipFile);
console.log(`Verifying contents of ${zipPath}...`);

// Use python zipfile or unzip list to verify contents
const listOutput = execSync(`python3 scripts/list_zip.py "${zipPath}"`, {
    encoding: "utf8",
});
const entries = listOutput
    .split("\n")
    .map((e) => e.trim())
    .filter(Boolean);

console.log("Zip contents:", entries);

const requiredEntries = [
    "metadata.json",
    "extension.js",
    "prefs.js",
    "stylesheet.css",
    "schemas/org.gnome.shell.extensions.lumen.gschema.xml",
];

for (const req of requiredEntries) {
    assert.ok(
        entries.includes(req),
        `Packed zip must contain required entry: ${req}`,
    );
}

console.log("Packaging check passed successfully!");
