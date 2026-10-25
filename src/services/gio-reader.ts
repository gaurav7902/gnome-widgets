import Gio from "gi://Gio";
import "./gio-async.js";

export interface AsyncFileReader {
    read(path: string): Promise<string>;
}

export class GioFileReader implements AsyncFileReader {
    async read(path: string): Promise<string> {
        const file = Gio.File.new_for_path(path);
        const [, contents] = await file.load_contents_async(null);
        if (!contents) {
            return "";
        }
        let bytes: Uint8Array;
        const raw = contents as any;
        if (raw instanceof Uint8Array) {
            bytes = raw;
        } else if (typeof raw.toArray === "function") {
            bytes = new Uint8Array(raw.toArray());
        } else if (ArrayBuffer.isView(raw)) {
            bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        } else {
            bytes = new Uint8Array(raw);
        }
        return new TextDecoder().decode(bytes);
    }
}
