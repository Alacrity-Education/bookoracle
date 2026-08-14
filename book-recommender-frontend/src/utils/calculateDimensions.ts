import type {
    Question,
    DimensionScores,
    Dimension,
    DimensionCalculation,
} from "../types";

export function calculateDimensions(
    questions: Question[],
    answers: Record<number, number>
): DimensionCalculation {

    const scores = {} as DimensionScores;

    const contributions: DimensionCalculation["contributions"] = [];

    const dimensions = Object.keys(
        questions.reduce<Record<string, boolean>>(
            (result, question) => {

                for (const dimension of Object.keys(question.weights)) {
                    result[dimension] = true;
                }

                return result;
            },
            {}
        )
    ) as Dimension[];

    for (const dimension of dimensions) {
        scores[dimension] = 0;
    }

    for (const question of questions) {

        const answer = answers[question.id];

        if (answer === undefined) {
            continue;
        }

        for (const dimension in question.weights) {

            const weight =
                question.weights[dimension as Dimension];

            if (weight === undefined) {
                continue;
            }

            const contribution =
                answer *
                weight *
                question.importance;

            scores[dimension as Dimension] += contribution;

            contributions.push({
                questionId: question.id,
                dimension: dimension as Dimension,
                contribution,
            });
        }
    }

    return {
        scores,
        contributions,
    };
}