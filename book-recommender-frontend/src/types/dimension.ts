export const DIMENSIONS = [
    "ambiguity",
    "reflection",
    "complexity",
    "realism",
    "characters",
    "pace",
    "culture",
    "curiosity",
    "imagination",
    "emotionality",
] as const;

export type Dimension = typeof DIMENSIONS[number];