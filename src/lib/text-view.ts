import {expandTokens} from "./tokens.js";

export interface TextConfig {
    text: string;
    source: "inline" | "file";
    maxLines: number;
}

export interface TextView {
    text: string;
    truncated: boolean;
}

export const normalizeTextConfig = (raw: unknown): TextConfig => {
    const value =
        typeof raw === "object" && raw !== null && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
    return {
        text: typeof value.text === "string" ? value.text : "",
        source: value.source === "file" ? "file" : "inline",
        maxLines:
            typeof value.maxLines === "number" &&
            Number.isFinite(value.maxLines)
                ? Math.max(1, Math.min(100, Math.round(value.maxLines)))
                : 10,
    };
};

export const renderTextView = (
    rawConfig: unknown,
    tokens: Readonly<Record<string, string>> = {},
): TextView => {
    const config = normalizeTextConfig(rawConfig);
    const lines = expandTokens(config.text, tokens).split(/\r?\n/);
    const truncated = lines.length > config.maxLines;
    return {
        text: lines.slice(0, config.maxLines).join("\n"),
        truncated,
    };
};
