const allowed = new Set(["date", "time", "user", "host", "uptime"]);

export const expandTokens = (
    text: string,
    values: Readonly<Record<string, string>>,
): string =>
    text.replace(/\{([a-z]+)\}/gi, (match, name: string) =>
        allowed.has(name) ? (values[name] ?? match) : match,
    );
