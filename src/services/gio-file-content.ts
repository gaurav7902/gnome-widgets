import Gio from "gi://Gio";
import GLib from "gi://GLib";
import "./gio-async.js";
import type {FileContentReader, FileMonitor} from "./file-content.js";

export class GioFileContentReader implements FileContentReader {
    async read(path: string): Promise<string> {
        const file = Gio.File.new_for_path(path);
        const [, contents] = await file.load_contents_async(null);
        return new TextDecoder().decode(contents);
    }

    async writeAtomic(path: string, contents: string): Promise<void> {
        const file = Gio.File.new_for_path(path);
        const parent = file.get_parent();
        if (parent && !parent.query_exists(null)) {
            const created = parent.make_directory_with_parents(null);
            if (!created && !parent.query_exists(null)) {
                throw new Error(
                    `Parent directory does not exist: ${parent.get_path()}`,
                );
            }
        }
        const bytes = new GLib.Bytes(new TextEncoder().encode(contents));
        await file.replace_contents_async(
            bytes,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null,
        );
    }
}

interface PathLikeFile {
    get_path(): string;
}

export class GioFileMonitor implements FileMonitor {
    watch(path: string, callback: () => void): {cancel(): void} {
        const file = Gio.File.new_for_path(path);
        const targetPath = file.get_path();
        const parent = file.get_parent();
        // Watch the containing directory rather than the file itself. Atomic
        // writes replace the target inode, which can silently detach a file
        // monitor; the directory monitor continues to see that replacement.
        const monitor = parent
            ? parent.monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, null)
            : file.monitor_file(Gio.FileMonitorFlags.WATCH_MOVES, null);
        let source: number | null = null;
        const signal = monitor.connect(
            "changed",
            (
                _monitor: unknown,
                changedFile: PathLikeFile | null,
                otherFile: PathLikeFile | null,
            ) => {
                const matchesTarget = [changedFile, otherFile].some(
                    (changed) => changed?.get_path() === targetPath,
                );
                if (!matchesTarget) {
                    return;
                }
                if (source !== null) {
                    GLib.Source.remove(source);
                }
                source = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 120, () => {
                    source = null;
                    callback();
                    return GLib.SOURCE_REMOVE;
                });
            },
        );
        return {
            cancel: () => {
                if (source !== null) {
                    GLib.Source.remove(source);
                    source = null;
                }
                monitor.disconnect(signal);
                monitor.cancel();
            },
        };
    }
}
