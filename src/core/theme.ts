import {accentFor, type Accent} from "./accent.js";

export type PalettePreset =
    "system" | "dark" | "light" | "nord" | "dracula" | "gruvbox" | "custom";
export type ColorScheme = "light" | "dark";

export interface Palette {
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textDim: string;
    accent: string;
    accentText: string;
    ok: string;
    warn: string;
    crit: string;
    shadow: string;
}

export interface CustomPalette {
    surface: string;
    surfaceAlt?: string;
    border: string;
    text: string;
    textDim?: string;
    ok?: string;
    warn?: string;
    crit?: string;
    shadow?: string;
}

export interface StyleOverrides {
    textScale: number;
    radius: number;
    opacity: number | null;
    palette: PalettePreset | null;
}

export type ThemeListener = (theme: Theme) => void;

const basePalettes: Record<
    Exclude<PalettePreset, "system" | "custom">,
    Palette
> = {
    dark: {
        surface: "#241f31",
        surfaceAlt: "#3d3846",
        border: "#5e5c64",
        text: "#ffffff",
        textDim: "#c0bfbc",
        accent: "#3584e4",
        accentText: "#ffffff",
        ok: "#33d17a",
        warn: "#f6d32d",
        crit: "#ff7b63",
        shadow: "#000000",
    },
    light: {
        surface: "#ffffff",
        surfaceAlt: "#f6f5f4",
        border: "#deddda",
        text: "#241f31",
        textDim: "#5e5c64",
        accent: "#3584e4",
        accentText: "#ffffff",
        ok: "#26a269",
        warn: "#c88800",
        crit: "#c01c28",
        shadow: "#000000",
    },
    nord: {
        surface: "#2e3440",
        surfaceAlt: "#3b4252",
        border: "#4c566a",
        text: "#eceff4",
        textDim: "#d8dee9",
        accent: "#88c0d0",
        accentText: "#2e3440",
        ok: "#a3be8c",
        warn: "#ebcb8b",
        crit: "#bf616a",
        shadow: "#1b1f27",
    },
    dracula: {
        surface: "#282a36",
        surfaceAlt: "#44475a",
        border: "#6272a4",
        text: "#f8f8f2",
        textDim: "#bdc0c9",
        accent: "#bd93f9",
        accentText: "#282a36",
        ok: "#50fa7b",
        warn: "#f1fa8c",
        crit: "#ff5555",
        shadow: "#191a21",
    },
    gruvbox: {
        surface: "#282828",
        surfaceAlt: "#3c3836",
        border: "#665c54",
        text: "#fbf1c7",
        textDim: "#d5c4a1",
        accent: "#83a598",
        accentText: "#282828",
        ok: "#b8bb26",
        warn: "#fabd2f",
        crit: "#fb4934",
        shadow: "#1d2021",
    },
};

export const validateStyleOverrides = (raw: unknown): StyleOverrides => {
    const value = isRecord(raw) ? raw : {};
    const preset =
        typeof value.palette === "string" &&
        [
            "system",
            "dark",
            "light",
            "nord",
            "dracula",
            "gruvbox",
            "custom",
        ].includes(value.palette)
            ? (value.palette as PalettePreset)
            : null;
    return {
        textScale: clamp(value.textScale, 1, 0.5, 3),
        radius: clamp(value.radius, 20, 0, 64),
        opacity:
            value.opacity === null ? null : clamp(value.opacity, 1, 0.1, 1),
        palette: preset,
    };
};

export const contrastRatio = (
    foreground: string,
    background: string,
): number => {
    const foregroundLuminance = luminance(parseColor(foreground));
    const backgroundLuminance = luminance(parseColor(background));
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
};

export const presetPalette = (
    preset: PalettePreset,
    scheme: ColorScheme,
    accent: Accent,
    custom?: CustomPalette,
): Palette => {
    const selected =
        preset === "system"
            ? basePalettes[scheme]
            : preset === "custom"
              ? customPalette(custom)
              : basePalettes[preset];
    return {
        ...selected,
        accent: accent.value,
        accentText: accent.text,
    };
};

export class Theme {
    readonly palette: Palette;
    readonly accent: Accent;
    readonly style: StyleOverrides;

    constructor(
        readonly scheme: ColorScheme = "dark",
        accentName = "blue",
        readonly preset: PalettePreset = "system",
        custom?: CustomPalette,
        style: unknown = {},
    ) {
        this.accent = accentFor(accentName);
        this.palette = presetPalette(preset, scheme, this.accent, custom);
        this.style = validateStyleOverrides(style);
    }

    styleFor(overrides: Partial<StyleOverrides> = {}): string {
        const style = {...this.style, ...validateStyleOverrides(overrides)};
        const surface = hexWithAlpha(
            this.palette.surface,
            style.opacity === null ? 1 : style.opacity,
        );
        return `background-color: ${surface}; border-radius: ${style.radius}px;`;
    }
}

export class ThemeController {
    private theme = new Theme();
    private readonly listeners = new Set<ThemeListener>();

    get current(): Theme {
        return this.theme;
    }

    set(
        scheme: ColorScheme,
        accentName?: string,
        preset?: PalettePreset,
        custom?: CustomPalette,
        style?: unknown,
    ): void {
        this.theme = new Theme(scheme, accentName, preset, custom, style);
        for (const listener of this.listeners) {
            listener(this.theme);
        }
    }

    subscribe(listener: ThemeListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

function customPalette(custom?: CustomPalette): Palette {
    const value = custom ?? {
        surface: "#241f31",
        border: "#5e5c64",
        text: "#ffffff",
    };
    return {
        surface: value.surface,
        surfaceAlt: value.surfaceAlt ?? value.surface,
        border: value.border,
        text: value.text,
        textDim: value.textDim ?? value.text,
        accent: "#3584e4",
        accentText: "#ffffff",
        ok: value.ok ?? "#33d17a",
        warn: value.warn ?? "#f6d32d",
        crit: value.crit ?? "#ff7b63",
        shadow: value.shadow ?? "#000000",
    };
}

function clamp(
    value: unknown,
    fallback: number,
    min: number,
    max: number,
): number {
    const number =
        typeof value === "number" && Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(min, number));
}

function parseColor(value: string): [number, number, number] {
    const hex = value.replace("#", "");
    const normalized =
        hex.length === 3
            ? hex
                  .split("")
                  .map((part) => part + part)
                  .join("")
            : hex;
    const number = Number.parseInt(normalized, 16);
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function luminance([red, green, blue]: [number, number, number]): number {
    const channel = (value: number): number => {
        const normalized = value / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    return (
        0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
    );
}

function hexWithAlpha(hex: string, alpha: number): string {
    const [red, green, blue] = parseColor(hex);
    return `rgb(${red} ${green} ${blue} / ${Math.round(alpha * 100)}%)`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
