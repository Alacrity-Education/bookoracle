import type { DimensionScores } from "../types";

export function cosineSimilarity(
    a: DimensionScores,
    b: DimensionScores
): number {

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (const dimension of Object.keys(a) as Array<keyof DimensionScores>) {

        const valueA = a[dimension];
        const valueB = b[dimension];

        dotProduct += valueA * valueB;

        magnitudeA += valueA * valueA;
        magnitudeB += valueB * valueB;
    }

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return (
        dotProduct /
        (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
    );
}