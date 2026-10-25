export interface TimerState {
    endTimestamp: number | null;
    durationSeconds: number;
    initialDuration?: number;
    running: boolean;
}

export const remainingSeconds = (
    state: TimerState,
    now = Date.now(),
): number =>
    state.running && state.endTimestamp !== null
        ? Math.max(0, Math.ceil((state.endTimestamp - now) / 1000))
        : state.durationSeconds;

export const startTimer = (
    durationSeconds: number,
    now = Date.now(),
): TimerState => {
    const dur = Math.max(0, Math.round(durationSeconds));
    return {
        durationSeconds: dur,
        initialDuration: dur,
        endTimestamp: now + dur * 1000,
        running: true,
    };
};

export const pauseTimer = (
    state: TimerState,
    now = Date.now(),
): TimerState => ({
    ...state,
    durationSeconds: remainingSeconds(state, now),
    endTimestamp: null,
    running: false,
});

export const resetTimer = (state: TimerState): TimerState => {
    const initial = state.initialDuration ?? state.durationSeconds;
    return {
        ...state,
        durationSeconds: initial,
        initialDuration: initial,
        endTimestamp: null,
        running: false,
    };
};
