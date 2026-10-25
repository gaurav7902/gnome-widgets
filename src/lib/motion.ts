export const MOTION = {
    short: 150,
    standard: 200,
    long: 250,
} as const;

export const duration = (
    token: keyof typeof MOTION,
    reduceMotion: boolean,
    animationsEnabled = true,
): number => (reduceMotion || !animationsEnabled ? 0 : MOTION[token]);

export const easeOutQuad = (progress: number): number => {
    const value = Math.min(1, Math.max(0, progress));
    return 1 - (1 - value) ** 2;
};
