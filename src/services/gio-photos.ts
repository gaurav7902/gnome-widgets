import Gio from "gi://Gio";
import GLib from "gi://GLib";
import "./gio-async.js";
import type {PhotoEntry} from "../lib/photos.js";
import type {PhotoSource} from "./photos.js";

const IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/tiff",
    "image/bmp",
    "image/heic",
    "image/heif",
    "image/avif",
]);

interface FileEnumeratorLike {
    next_files_async(
        count: number,
        priority: number,
        cancellable: unknown,
    ): Promise<unknown[]>;
    get_child(info: unknown): {get_path(): string};
    close(cancellable: unknown): void;
}

interface FileInfoLike {
    get_file_type?(): number;
    get_content_type?(): string | null;
    get_display_name?(): string;
    get_attribute_uint64?(name: string): number;
}

export class GioPhotoSource implements PhotoSource {
    async enumerate(
        roots: readonly string[],
        options: {maxDepth: number; maxFiles: number},
    ): Promise<PhotoEntry[]> {
        const entries: PhotoEntry[] = [];
        for (const root of roots) {
            await this.walk(root, 0, options, entries);
            if (entries.length >= options.maxFiles) {
                break;
            }
        }
        return entries.slice(0, options.maxFiles);
    }

    private async walk(
        path: string,
        depth: number,
        options: {maxDepth: number; maxFiles: number},
        entries: PhotoEntry[],
    ): Promise<void> {
        if (depth > options.maxDepth || entries.length >= options.maxFiles) {
            return;
        }
        const directory = Gio.File.new_for_path(path);
        let enumerator: FileEnumeratorLike;
        try {
            enumerator = await directory.enumerate_children_async(
                "standard::name,standard::display-name,standard::content-type,standard::type,time::modified",
                Gio.FileQueryInfoFlags.NONE,
                GLib.PRIORITY_DEFAULT,
                null,
            );
        } catch {
            // One absent/unreadable folder should not hide photos in other roots.
            return;
        }
        try {
            while (entries.length < options.maxFiles) {
                const batch = (await enumerator.next_files_async(
                    32,
                    GLib.PRIORITY_DEFAULT,
                    null,
                )) as FileInfoLike[];
                if (batch.length === 0) {
                    break;
                }
                for (const info of batch) {
                    const child = enumerator.get_child(info);
                    const contentType = info.get_content_type?.() ?? "";
                    const childPath = child.get_path();
                    if (IMAGE_TYPES.has(contentType)) {
                        entries.push({
                            path: childPath,
                            name:
                                info.get_display_name?.() ??
                                childPath.split("/").pop() ??
                                childPath,
                            modifiedMs:
                                info.get_attribute_uint64?.("time::modified") ??
                                0,
                        });
                    } else if (
                        info.get_file_type?.() === Gio.FileType.DIRECTORY &&
                        depth < options.maxDepth
                    ) {
                        await this.walk(childPath, depth + 1, options, entries);
                    }
                    if (entries.length >= options.maxFiles) {
                        break;
                    }
                }
            }
        } finally {
            enumerator.close(null);
        }
    }
}
