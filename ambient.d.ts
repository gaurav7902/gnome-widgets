declare const console: {
    warn(message: string): void;
    debug(message: string): void;
    error(message: string): void;
};

declare function setTimeout(callback: () => void, delayMs: number): number;
declare function clearTimeout(timeoutId: number): void;
declare class TextDecoder {
    decode(input?: Uint8Array): string;
}
declare class TextEncoder {
    encode(input: string): Uint8Array;
}

declare module "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js" {
    export class ExtensionPreferences {
        readonly metadata: {uuid: string};
        path: string;
        getSettings(schema?: string): {
            get_string(key: string): string;
            get_strv(key: string): string[];
            get_boolean(key: string): boolean;
            set_boolean(key: string, value: boolean): void;
            set_string(key: string, value: string): void;
            bind(
                key: string,
                object: unknown,
                property: string,
                flags: number,
            ): void;
        };
    }
}

declare module "gi://Adw" {
    export class PreferencesWindow {
        constructor(props?: Record<string, unknown>);
        add(page: unknown): void;
    }
    export class PreferencesPage {
        title: string;
        icon_name: string;
        constructor(props?: Record<string, unknown>);
        add(group: unknown): void;
    }
    export class PreferencesGroup {
        title: string;
        description: string;
        constructor(props?: Record<string, unknown>);
        add(row: unknown): void;
    }
    export class ActionRow {
        title: string;
        subtitle: string;
        constructor(props?: Record<string, unknown>);
        add_suffix(widget: unknown): void;
    }
    export class EntryRow {
        constructor(props?: Record<string, unknown>);
        get_text(): string;
        set_text(value: string): void;
    }
    namespace Adw {
        type PreferencesWindow = InstanceType<typeof PreferencesWindow>;
    }
    const Adw: {
        PreferencesWindow: typeof PreferencesWindow;
        PreferencesPage: typeof PreferencesPage;
        PreferencesGroup: typeof PreferencesGroup;
        ActionRow: typeof ActionRow;
        EntryRow: typeof EntryRow;
    };
    export default Adw;
}

declare module "gi://Gtk" {
    export class Switch {
        valign: number;
        active: boolean;
        constructor(props?: Record<string, unknown>);
    }
    export class Button {
        constructor(props?: Record<string, unknown>);
        connect(signal: string, callback: (...args: any[]) => void): number;
        set_label(label: string): void;
    }
    export class FileChooserNative {
        constructor(props?: Record<string, unknown>);
        connect(
            signal: string,
            callback: (dialog: FileChooserNative, response: number) => void,
        ): number;
        get_file(): {get_path(): string | null} | null;
        show(): void;
        destroy(): void;
    }
    export class TextView {
        readonly buffer: {
            set_text(text: string, length: number): void;
            get_bounds(): [unknown, unknown];
            get_text(
                start: unknown,
                end: unknown,
                includeHiddenChars: boolean,
            ): string;
        };
        constructor(props?: Record<string, unknown>);
    }
    export class ScrolledWindow {
        constructor(props?: Record<string, unknown>);
    }
    const Gtk: {
        Switch: typeof Switch;
        Button: typeof Button;
        FileChooserNative: typeof FileChooserNative;
        TextView: typeof TextView;
        ScrolledWindow: typeof ScrolledWindow;
        Align: {CENTER: number};
        FileChooserAction: {SELECT_FOLDER: number; OPEN: number};
        ResponseType: {ACCEPT: number};
        WrapMode: {WORD_CHAR: number};
    };
    export default Gtk;
}
declare module "resource:///org/gnome/shell/extensions/extension.js" {
    import type {File} from "gi://Gio";
    export class Extension {
        readonly metadata: {uuid: string};
        constructor(metadata: {uuid: string});
        path: string;
        openPreferences(): void;
        getStylesheet(): File | null;
        getSettings(schema?: string): {
            get_string(key: string): string;
            get_strv(key: string): string[];
            get_boolean(key: string): boolean;
            set_boolean(key: string, value: boolean): void;
            set_string(key: string, value: string): void;
            connect(signal: string, callback: () => void): number;
            disconnect(id: number): void;
        };
    }
}

declare module "resource:///org/gnome/shell/ui/main.js" {
    export const themeManager: {
        loadStylesheet(stylesheet: unknown): void;
        unloadStylesheet(stylesheet: unknown): void;
    };
    export const layoutManager: {
        primaryMonitor: {x: number; y: number; width: number; height: number};
        addChrome(actor: unknown, params?: {trackFullscreen?: boolean}): void;
        removeChrome(actor: unknown): void;
        _backgroundGroup: {
            add_child(actor: unknown): void;
            remove_child(actor: unknown): void;
        };
        connect(signal: string, callback: () => void): number;
        disconnect(id: number): void;
    };
    export const wm: {
        addKeybinding(
            name: string,
            settings: unknown,
            flags: unknown,
            mode: number,
            handler: () => void,
        ): void;
        removeKeybinding(name: string): void;
    };
    export const panel: {
        addToStatusArea(name: string, indicator: unknown): void;
    };
}

declare module "gi://Meta" {
    const Meta: {
        KeyBindingFlags: {NONE: number};
    };
    export default Meta;
}

declare module "gi://Shell" {
    const Shell: {
        ActionMode: {NORMAL: number};
    };
    export default Shell;
}

declare module "resource:///org/gnome/shell/ui/panelMenu.js" {
    export class Button {
        readonly menu: {
            addMenuItem(item: unknown): void;
            removeAll(): void;
        };
        visible: boolean;
        destroy(): void;
        add_child(actor: unknown): void;
        constructor(
            menuAlignment?: number,
            name?: string,
            dontCreateMenu?: boolean,
        );
    }
}

declare module "gi://Clutter" {
    const Clutter: {
        Orientation: {
            HORIZONTAL: number;
            VERTICAL: number;
        };
        BUTTON_PRIMARY: number;
        EVENT_PROPAGATE: number;
        EVENT_STOP: number;
        EventType: {
            MOTION: number;
            BUTTON_RELEASE: number;
        };
        ActorAlign: {CENTER: number};
    };
    export default Clutter;
}

declare module "resource:///org/gnome/shell/ui/popupMenu.js" {
    export class PopupSwitchMenuItem {
        readonly checked: boolean;
        constructor(label: string, active: boolean);
        connect(
            signal: string,
            callback: (item: PopupSwitchMenuItem, state: boolean) => void,
        ): number;
        setToggleState(state: boolean): void;
    }
    export class PopupMenuItem {
        constructor(label: string);
        connect(signal: string, callback: () => void): number;
    }
    export class PopupImageMenuItem {
        constructor(label: string, icon: string);
        connect(signal: string, callback: () => void): number;
        setIcon(icon: string): void;
    }
    export class PopupSeparatorMenuItem {
        constructor();
    }
}

declare module "gi://St" {
    const St: {
        BoxLayout: {
            new (props?: Record<string, unknown>): {
                add_child(child: unknown): void;
                set_position(x: number, y: number): void;
                set_size(width: number, height: number): void;
                connect(
                    signal: string,
                    callback: (...args: any[]) => unknown,
                ): number;
                destroy(): void;
            };
        };
        Label: {
            new (props?: Record<string, unknown>): {
                set_text(text: string): void;
                add_style_class_name?(name: string): void;
                destroy(): void;
            };
        };
        Button: {
            new (props?: Record<string, unknown>): {
                connect(signal: string, callback: () => void): number;
                destroy(): void;
            };
        };
        Entry: {
            new (props?: Record<string, unknown>): {
                get_text(): string;
                set_text(text: string): void;
                clutter_text: {
                    connect(
                        signal: string,
                        callback: (...args: any[]) => unknown,
                    ): number;
                };
                connect(
                    signal: string,
                    callback: (...args: any[]) => unknown,
                ): number;
                destroy(): void;
            };
        };
        Icon: {
            new (props?: Record<string, unknown>): {
                icon_name: string;
                gicon?: unknown;
                set_icon_name(name: string): void;
                add_style_class_name?(name: string): void;
                destroy(): void;
            };
        };
        DrawingArea: {
            new (props?: Record<string, unknown>): {
                set_width(width: number): void;
                set_height(height: number): void;
                set_size(width: number, height: number): void;
                queue_repaint(): void;
                get_context(): unknown;
                get_surface_size(): [number, number];
                setProgress(value: number): void;
                setGeometry(diameter: number, thickness: number): void;
                setColors(track: string, color: string): void;
                setValues(values: readonly number[]): void;
                connect(signal: string, callback: () => void): number;
                disconnect(id: number): void;
                destroy(): void;
            };
        };
        Widget: new (props: Record<string, unknown>) => {
            set_style(style: string): void;
            set_size?(width: number, height: number): void;
            set_position(x: number, y: number): void;
            add_child?(actor: unknown): void;
            set_child_above_sibling?(actor: unknown, sibling: unknown): void;
            add_style_class_name?(name: string): void;
            remove_style_class_name?(name: string): void;
            destroy(): void;
        };
    };
    export default St;
}

declare module "gi://GLib" {
    const GLib: {
        PRIORITY_DEFAULT: number;
        SOURCE_CONTINUE: boolean;
        SOURCE_REMOVE: boolean;
        timeout_add_seconds(
            priority: number,
            interval: number,
            callback: () => boolean,
        ): number;
        timeout_add(
            priority: number,
            interval: number,
            callback: () => boolean,
        ): number;
        PRIORITY_DEFAULT_IDLE: number;
        get_home_dir(): string;
        build_filenamev(parts: string[]): string;
        Bytes: {new(data: Uint8Array): unknown};
        Source: {remove(id: number): void};
    };
    export default GLib;
}

declare module "gi://Gio" {
    const Gio: {
        File: {
            new_for_path(path: string): {
                get_path(): string;
                get_basename(): string;
                get_parent(): {
                    get_path(): string;
                    query_exists(cancellable: unknown): boolean;
                    make_directory_with_parents(cancellable: unknown): boolean;
                    monitor_directory(
                        flags: number,
                        cancellable: unknown,
                    ): {
                        connect(
                            signal: string,
                            callback: (...args: any[]) => void,
                        ): number;
                        disconnect(id: number): void;
                        cancel(): void;
                    };
                } | null;
                query_exists(cancellable: unknown): boolean;
                make_directory_with_parents(cancellable: unknown): boolean;
                enumerate_children_async(
                    attributes: string,
                    flags: number,
                    priority: number,
                    cancellable: unknown,
                ): Promise<{
                    next_files_async(
                        count: number,
                        priority: number,
                        cancellable: unknown,
                    ): Promise<unknown[]>;
                    get_child(info: unknown): {
                        get_path(): string;
                    };
                    close(cancellable: unknown): void;
                }>;
                load_contents_async(
                    cancellable: unknown,
                ): Promise<[boolean, Uint8Array]>;
                monitor_file(
                    flags: number,
                    cancellable: unknown,
                ): {
                    connect(
                        signal: string,
                        callback: (...args: any[]) => void,
                    ): number;
                    disconnect(id: number): void;
                    cancel(): void;
                };
                replace_contents_async(
                    contents: unknown,
                    etag: string | null,
                    makeBackup: boolean,
                    flags: number,
                    cancellable: unknown,
                ): Promise<string>;
            };
            prototype: {
                load_contents_async: unknown;
                load_contents_finish: unknown;
                replace_contents_async: unknown;
                replace_contents_finish: unknown;
                enumerate_children_async: unknown;
                enumerate_children_finish: unknown;
            };
        };
        FileEnumerator: {
            prototype: {
                next_files_async: unknown;
                next_files_finish: unknown;
            };
        };
        _promisify(
            prototype: unknown,
            asyncName: string,
            finishName: string,
        ): void;
        FileMonitorFlags: {NONE: number; WATCH_MOVES: number};
        FileQueryInfoFlags: {NONE: number};
        FileCreateFlags: {REPLACE_DESTINATION: number};
        FileType: {DIRECTORY: number};
        SettingsBindFlags: {DEFAULT: number};
    };
    export default Gio;
}

declare module "gi://GObject" {
    const GObject: {
        registerClass<T>(options: Record<string, unknown>, klass: T): T;
    };
    export default GObject;
}

declare module "gi://cairo" {
    const Cairo: {
        LineCap: {ROUND: number};
    };
    export default Cairo;
}
