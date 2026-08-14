import type {
    Dimension,
    DimensionScores,
    Question,
} from "../types";

export function normalizeDimensions(
    rawScores: DimensionScores,
    questions: Question[]
): DimensionScores {

    const normalized = {} as DimensionScores;

    const maxScores = {} as DimensionScores;

    for (const dimension of Object.keys(rawScores) as Dimension[]) {

        maxScores[dimension] = 0;

    }

    for (const question of questions) {

        for (const dimension in question.weights) {

            const weight =
                question.weights[
                    dimension as Dimension
                ];

            if (weight === undefined) {
                continue;
            }

            maxScores[
                dimension as Dimension
            ] +=
                Math.abs(weight) *
                question.importance *
                2;

        }

    }

    for (const dimension of Object.keys(rawScores) as Dimension[]) {

        const max = maxScores[dimension];

        if (max === 0) {

            normalized[dimension] = 50;

            continue;

        }

        normalized[dimension] = Math.round(

            ((rawScores[dimension] + max)

                /

                (2 * max))

            * 100
        );

    }

    return normalized;

}