import {remainingSeconds, type TimerState} from "./timer.js";

export interface TimerView {
    title: string;
    detail: string;
    finished: boolean;
}

export const formatDuration = (seconds: number): string => {
    const safe = Math.max(0, Math.round(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const remainder = safe % 60;
    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
        : `${minutes}:${String(remainder).padStart(2, "0")}`;
};

export const renderTimerView = (
    state: TimerState,
    now = Date.now(),
): TimerView => {
    const remaining = remainingSeconds(state, now);
    return {
        title: formatDuration(remaining),
        detail: state.running
            ? remaining === 0
                ? "Finished"
                : "Running"
            : "Paused",
        finished: state.running && remaining === 0,
    };
};
