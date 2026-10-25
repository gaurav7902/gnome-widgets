import {cp, mkdir, readdir, readFile, rm, writeFile} from "node:fs/promises";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);
const root = new URL("..", import.meta.url);
const path = (relative) => new URL(relative, root);

await rm(path("dist"), {recursive: true, force: true});
await mkdir(path("dist"), {recursive: true});
await execFileAsync("npx", ["tsc", "-p", path("tsconfig.json").pathname]);
await cp(path("metadata.json"), path("dist/metadata.json"));
await cp(path("schemas"), path("dist/schemas"), {recursive: true});
await execFileAsync("glib-compile-schemas", [path("dist/schemas").pathname]);

const styleFiles = (await readdir(path("styles"))).filter((file) =>
    file.endsWith(".css"),
);
const css = (
    await Promise.all(
        styleFiles.map((file) => readFile(path(`styles/${file}`), "utf8")),
    )
).join("\n");
await writeFile(path("dist/stylesheet.css"), css);
