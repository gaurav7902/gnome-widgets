import Gio from "gi://Gio";

// GJS exposes most Gio async methods as callback-based APIs until explicitly
// promisified. Keep this initialization in one module so multiple services do
// not try to promisify the same GI method more than once.
Gio._promisify(
    Gio.File.prototype,
    "load_contents_async",
    "load_contents_finish",
);
Gio._promisify(
    Gio.File.prototype,
    "replace_contents_async",
    "replace_contents_finish",
);
Gio._promisify(
    Gio.File.prototype,
    "enumerate_children_async",
    "enumerate_children_finish",
);
Gio._promisify(
    Gio.FileEnumerator.prototype,
    "next_files_async",
    "next_files_finish",
);
