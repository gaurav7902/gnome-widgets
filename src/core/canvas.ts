import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import {Signals} from "./lifecycle.js";
import type {WidgetActor} from "./registry.js";
import type {Rect, WorkArea} from "../lib/layout.js";

export type {WorkArea};

export class Canvas {
    readonly actor = new St.Widget({
        reactive: false,
        can_focus: false,
        style_class: "lm-canvas",
    });
    private readonly signals = new Signals();
    private readonly children = new Set<WidgetActor>();
    private readonly layouts = new Map<WidgetActor, Rect>();
    private readonly relayoutListeners = new Set<() => void>();

    enable(): void {
        Main.layoutManager._backgroundGroup.add_child(this.actor);
        const monitorsChanged = Main.layoutManager.connect(
            "monitors-changed",
            () => this.relayout(),
        );
        this.signals.add({
            disconnect: () => Main.layoutManager.disconnect(monitorsChanged),
        });
        this.relayout();
    }

    addChild(child: WidgetActor): void {
        this.children.add(child);
        this.actor.add_child?.(child);
    }

    setLayout(child: WidgetActor, rect: Rect): void {
        this.layouts.set(child, rect);
        this.applyLayout(child, rect);
    }

    subscribeRelayout(listener: () => void): () => void {
        this.relayoutListeners.add(listener);
        return () => this.relayoutListeners.delete(listener);
    }

    raise(child: WidgetActor): void {
        this.actor.set_child_above_sibling?.(child, null);
    }

    relayout(): void {
        for (const child of this.children) {
            const rect = this.layouts.get(child);
            if (rect) {
                this.applyLayout(child, rect);
            }
        }
        for (const listener of this.relayoutListeners) {
            listener();
        }
    }

    get workArea(): WorkArea {
        const monitor = Main.layoutManager.primaryMonitor;
        const layoutMgr = Main.layoutManager as unknown as {
            getWorkAreaForPrimaryMonitor?: () => {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        };
        const workArea =
            typeof layoutMgr.getWorkAreaForPrimaryMonitor === "function"
                ? layoutMgr.getWorkAreaForPrimaryMonitor()
                : monitor;
        return {
            x: workArea.x,
            y: workArea.y + 40,
            w: workArea.width,
            h: Math.max(0, workArea.height - 40),
        };
    }

    disable(): void {
        this.signals.disconnectAll();
        Main.layoutManager._backgroundGroup.remove_child(this.actor);
        this.actor.destroy();
        this.children.clear();
        this.layouts.clear();
        this.relayoutListeners.clear();
    }

    private applyLayout(child: WidgetActor, rect: Rect): void {
        if (child.destroyed) {
            this.children.delete(child);
            this.layouts.delete(child);
            return;
        }
        child.set_position(rect.x, rect.y);
        child.set_size?.(rect.w, rect.h);
    }
}
