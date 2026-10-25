import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import St from "gi://St";
import GLib from "gi://GLib";
import type {WidgetInstanceConfig} from "../../lib/config.js";
import {visibleTodos, type TodoViewItem} from "../../lib/todo-view.js";
import {parseTodo} from "../../lib/todotxt.js";
import {GioFileContentReader} from "../../services/gio-file-content.js";

export class TodoWidget {
    readonly actor = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-todo",
    });
    private readonly header = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-widget-header",
    });
    private readonly icon = new St.Icon({
        icon_name: "view-list-symbolic",
        style_class: "lm-widget-icon",
    });
    private readonly title = new St.Label({style_class: "lm-todo-title"});
    private readonly list = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        style_class: "lm-todo-list",
    });
    private readonly addRow = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        style_class: "lm-todo-add-row",
    });
    private readonly entry = new St.Entry({
        hint_text: "Add task",
        style_class: "lm-todo-entry",
        can_focus: true,
        reactive: true,
    });
    private readonly addButton = new St.Button({
        label: "Add",
        style_class: "lm-todo-button",
        reactive: true,
        can_focus: true,
    });
    private config: WidgetInstanceConfig;
    private rows: InstanceType<typeof St.Label>[] = [];
    private destroyed = false;
    private writing = false;

    constructor(config: WidgetInstanceConfig) {
        this.config = config;
        this.header.add_child(this.icon);
        this.header.add_child(this.title);
        this.actor.add_child(this.header);
        this.actor.add_child(this.list);
        this.addRow.add_child(this.entry);
        this.addRow.add_child(this.addButton);
        this.actor.add_child(this.addRow);
        this.addButton.connect("clicked", () => {
            void this.addTask();
        });
        this.entry.connect("key-press-event", (_actor, event) => {
            if (event.get_key_unicode() === "\r" || event.get_key_unicode() === "\n") {
                void this.addTask();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this.render([]);
    }

    update(config: WidgetInstanceConfig): void {
        if (!this.destroyed) {
            this.config = config;
            this.render([]);
        }
    }

    updateContents(contents: string): void {
        if (!this.destroyed) {
            this.render(parseTodo(contents));
        }
    }

    showError(message = "Unable to read todo list"): void {
        if (!this.destroyed) {
            this.title.set_text(message);
        }
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.actor.destroy();
        this.rows = [];
    }

    private render(items: ReturnType<typeof parseTodo>): void {
        const raw = this.config.config;
        const includeCompleted = raw.includeCompleted === true;
        const limit =
            typeof raw.limit === "number" && Number.isFinite(raw.limit)
                ? Math.max(1, Math.min(50, Math.round(raw.limit)))
                : 8;
        const visible = visibleTodos(items, includeCompleted, limit);
        this.title.set_text(visible.length ? "Todo" : "No open tasks");
        for (const row of this.rows) {
            row.destroy();
        }
        this.rows = visible.map((item) => this.createRow(item));
    }

    private createRow(item: TodoViewItem): InstanceType<typeof St.Label> {
        const row = new St.Label({style_class: "lm-todo-row"});
        row.set_text(
            `${item.completed ? "✓" : "○"} ${item.priority ?? ""} ${item.text}`,
        );
        this.list.add_child(row);
        return row;
    }

    private async addTask(): Promise<void> {
        if (this.destroyed || this.writing) {
            return;
        }
        const text = this.entry.get_text().trim();
        const rawPath = this.config.config.path;
        const path =
            typeof rawPath === "string" && rawPath.trim()
                ? rawPath
                : GLib.build_filenamev([GLib.get_home_dir(), "todo.txt"]);
        if (!text) {
            return;
        }
        this.writing = true;
        try {
            let current = "";
            const reader = new GioFileContentReader();
            try {
                current = await reader.read(path);
            } catch (error) {
                // Only treat a missing file as an empty todo list. Do not silently
                // overwrite a file that exists but cannot be read.
                if (Gio.File.new_for_path(path).query_exists(null)) {
                    throw error;
                }
            }
            if (this.destroyed) {
                return;
            }
            const separator =
                current.length === 0 || current.endsWith("\n") ? "" : "\n";
            const updated = `${current}${separator}${text}\n`;
            await reader.writeAtomic(path, updated);
            if (!this.destroyed) {
                this.entry.set_text("");
                this.render(parseTodo(updated));
            }
        } catch (error) {
            this.showError(`Unable to add task: ${String(error)}`);
        } finally {
            this.writing = false;
        }
    }
}

export const create = ({config}: {config: WidgetInstanceConfig}): TodoWidget =>
    new TodoWidget(config);
