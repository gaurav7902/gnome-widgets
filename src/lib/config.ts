export const CURRENT_SCHEMA_VERSION = 1;

export type PositionMode = "free" | "grid";
export type MonitorSelection = "primary" | "all" | string;
export type Anchor =
    | "top-left"
    | "top-center"
    | "top-right"
    | "middle-left"
    | "center"
    | "middle-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";

export interface WidgetStyle {
    textScale: number;
    radius: number;
    opacity: number | null;
    palette: string | null;
}

export interface WidgetInstanceConfig {
    id: string;
    type: string;
    enabled: boolean;
    locked: boolean;
    anchor: Anchor;
    pos: {x: number; y: number};
    size: {w: number; h: number};
    style: WidgetStyle;
    config: Record<string, unknown>;
    [key: string]: unknown;
}

export interface ProfileConfig {
    name: string;
    positionMode: PositionMode;
    grid: {cols: number; rows: number; gap: number};
    snap: number;
    allowOverlap: boolean;
    monitor: MonitorSelection;
    widgets: WidgetInstanceConfig[];
    [key: string]: unknown;
}

export interface LumenConfig {
    version: number;
    activeProfile: string;
    profiles: Record<string, ProfileConfig>;
    [key: string]: unknown;
}

const anchors = new Set<Anchor>([
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "center",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
]);

const numberInRange = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
): number => {
    const number =
        typeof value === "number" && Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(min, number));
};

const stringValue = (value: unknown, fallback: string): string =>
    typeof value === "string" && value.length > 0 ? value : fallback;

const validateStyle = (raw: unknown): WidgetStyle => {
    const style = isRecord(raw) ? raw : {};
    return {
        textScale: numberInRange(style.textScale, 1, 0.5, 3),
        radius: numberInRange(style.radius, 20, 0, 64),
        opacity:
            style.opacity === null
                ? null
                : numberInRange(style.opacity, 1, 0.1, 1),
        palette: typeof style.palette === "string" ? style.palette : null,
    };
};

const validateWidget = (raw: unknown, index: number): WidgetInstanceConfig => {
    const widget = isRecord(raw) ? raw : {};
    const position = isRecord(widget.pos) ? widget.pos : {};
    const size = isRecord(widget.size) ? widget.size : {};
    const anchor = anchors.has(widget.anchor as Anchor)
        ? (widget.anchor as Anchor)
        : "top-left";
    return {
        ...widget,
        id: stringValue(widget.id, `widget-${index + 1}`),
        type: stringValue(widget.type, "unknown"),
        enabled: widget.enabled !== false,
        locked: widget.locked === true,
        anchor,
        pos: {
            x: numberInRange(position.x, 0, 0, 1),
            y: numberInRange(position.y, 0, 0, 1),
        },
        size: {
            w: numberInRange(size.w, 220, 16, 4096),
            h: numberInRange(size.h, 120, 16, 4096),
        },
        style: validateStyle(widget.style),
        config: isRecord(widget.config) ? {...widget.config} : {},
    };
};

const validateProfile = (raw: unknown, fallbackName: string): ProfileConfig => {
    const profile = isRecord(raw) ? raw : {};
    const grid = isRecord(profile.grid) ? profile.grid : {};
    return {
        ...profile,
        name: stringValue(profile.name, fallbackName),
        positionMode: profile.positionMode === "grid" ? "grid" : "free",
        grid: {
            cols: Math.round(numberInRange(grid.cols, 12, 1, 128)),
            rows: Math.round(numberInRange(grid.rows, 8, 1, 128)),
            gap: Math.round(numberInRange(grid.gap, 14, 0, 256)),
        },
        snap: Math.round(numberInRange(profile.snap, 20, 1, 512)),
        allowOverlap: profile.allowOverlap === true,
        monitor: stringValue(profile.monitor, "primary"),
        widgets: Array.isArray(profile.widgets)
            ? profile.widgets.map(validateWidget)
            : [],
    };
};

export const defaults = (): LumenConfig => ({
    version: CURRENT_SCHEMA_VERSION,
    activeProfile: "default",
    profiles: {
        default: {
            name: "Default",
            positionMode: "free",
            grid: {cols: 12, rows: 8, gap: 14},
            snap: 20,
            allowOverlap: false,
            monitor: "primary",
            widgets: [],
        },
    },
});

export const validate = (raw: unknown): LumenConfig => {
    const value = isRecord(raw) ? raw : {};
    const fallback = defaults();
    const rawProfiles = isRecord(value.profiles) ? value.profiles : {};
    const profiles = Object.fromEntries(
        Object.entries(rawProfiles).map(([id, profile]) => [
            stringValue(id, "profile"),
            validateProfile(profile, id),
        ]),
    );
    if (Object.keys(profiles).length === 0) {
        Object.assign(profiles, fallback.profiles);
    }
    const activeProfile =
        typeof value.activeProfile === "string" && profiles[value.activeProfile]
            ? value.activeProfile
            : Object.keys(profiles)[0];
    return {
        ...value,
        version:
            typeof value.version === "number" && Number.isInteger(value.version)
                ? value.version
                : CURRENT_SCHEMA_VERSION,
        activeProfile,
        profiles,
    };
};

export const parse = (json: string): LumenConfig => {
    try {
        return validate(JSON.parse(json));
    } catch {
        return defaults();
    }
};

export const migrate = (raw: unknown, fromVersion: number): LumenConfig => {
    if (fromVersion > CURRENT_SCHEMA_VERSION) {
        return validate(raw);
    }
    return validate({
        ...((isRecord(raw) && raw) || {}),
        version: CURRENT_SCHEMA_VERSION,
    });
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
