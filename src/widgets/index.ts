import type {WidgetDefinition} from "../core/registry.js";
import {manifest as clockManifest} from "./clock/manifest.js";
import {manifest as systemManifest} from "./system/manifest.js";
import {manifest as calendarManifest} from "./calendar/manifest.js";
import {manifest as batteryManifest} from "./battery/manifest.js";
import {manifest as todoManifest} from "./todo/manifest.js";
import {manifest as textManifest} from "./text/manifest.js";
import {manifest as timerManifest} from "./timer/manifest.js";
import {manifest as photosManifest} from "./photos/manifest.js";
import {manifest as weatherManifest} from "./weather/manifest.js";
import {manifest as mediaManifest} from "./media/manifest.js";

export const widgetDefinitions: WidgetDefinition[] = [
    {
        manifest: clockManifest,
        load: async () => import("./clock/widget.js"),
    },
    {
        manifest: systemManifest,
        load: async () => import("./system/widget.js"),
    },
    {
        manifest: calendarManifest,
        load: async () => import("./calendar/widget.js"),
    },
    {
        manifest: batteryManifest,
        load: async () => import("./battery/widget.js"),
    },
    {
        manifest: todoManifest,
        load: async () => import("./todo/widget.js"),
    },
    {
        manifest: textManifest,
        load: async () => import("./text/widget.js"),
    },
    {
        manifest: timerManifest,
        load: async () => import("./timer/widget.js"),
    },
    {
        manifest: photosManifest,
        load: async () => import("./photos/widget.js"),
    },
    {
        manifest: weatherManifest,
        load: async () => import("./weather/widget.js"),
    },
    {
        manifest: mediaManifest,
        load: async () => import("./media/widget.js"),
    },
];
