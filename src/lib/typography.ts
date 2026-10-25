export const TYPOGRAPHY = {
    caption: 11,
    body: 13,
    title: 15,
    displayCompact: 28,
    displayRegular: 40,
    displayLarge: 56,
} as const;

export type TypographyToken = keyof typeof TYPOGRAPHY;
