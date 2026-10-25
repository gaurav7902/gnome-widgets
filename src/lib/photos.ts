export interface PhotoEntry {
    path: string;
    name: string;
    modifiedMs: number;
}

export const selectPhotos = (
    entries: readonly PhotoEntry[],
    limit = 6,
): PhotoEntry[] =>
    [...entries]
        .filter(
            (entry) =>
                typeof entry.path === "string" &&
                typeof entry.name === "string" &&
                Number.isFinite(entry.modifiedMs),
        )
        .sort((a, b) => b.modifiedMs - a.modifiedMs)
        .slice(0, Math.max(0, Math.min(24, Math.round(limit))));
