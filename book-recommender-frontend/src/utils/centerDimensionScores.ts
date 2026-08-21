import type { DimensionScores } from "../types";

export function centerDimensionScores(
    scores: DimensionScores
): DimensionScores {

    const centered = {} as DimensionScores;

    for (const dimension of Object.keys(scores) as Array<keyof DimensionScores>) {
        centered[dimension] =
            (scores[dimension] - 50) / 50;
    }

    return centered;
}