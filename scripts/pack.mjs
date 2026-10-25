import {cp, mkdtemp, readdir, rm, mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);
await mkdir("build", {recursive: true});

let packed = false;
try {
    const staging = await mkdtemp(join(tmpdir(), "lumen-extension-"));
    try {
        await cp("dist", staging, {recursive: true});
        // Ensure compiled schemas are included in staging schemas dir
        await cp("dist/schemas", join(staging, "schemas"), {recursive: true});
        const extraSources = (await readdir(staging, {withFileTypes: true}))
            .filter(
                (entry) =>
                    entry.isDirectory() &&
                    entry.name !== "schemas" &&
                    entry.name !== "locales",
            )
            .map((entry) => entry.name)
            .flatMap((name) => ["--extra-source", join(staging, name)]);
        await execFileAsync("gnome-extensions", [
            "pack",
            "--force",
            "--out-dir",
            "build",
            staging,
            ...extraSources,
        ]);
        packed = true;
    } finally {
        await rm(staging, {recursive: true, force: true});
    }
} catch (err) {
    console.warn(
        "gnome-extensions pack failed, falling back to zip:",
        err.message,
    );
}

if (!packed) {
    await execFileAsync(
        "zip",
        ["-r", "../build/gaurav7902@thegorav.xyz.shell-extension.zip", "."],
        {cwd: "dist"},
    );
    console.log("Successfully packed extension via zip fallback.");
}
