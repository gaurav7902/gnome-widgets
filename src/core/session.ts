export interface SessionSettings {
    set_boolean(key: string, value: boolean): void;
}

export function resetSessionState(settings: SessionSettings): void {
    try {
        settings.set_boolean("edit-mode", false);
    } catch (err) {
        console.error(
            `[lumen-extension] Failed to reset edit-mode session state: ${String(err)}`,
        );
    }
}
