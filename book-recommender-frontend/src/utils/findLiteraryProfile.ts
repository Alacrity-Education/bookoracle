import type {
    DimensionScores,
    LiteraryProfile,
} from "../types";

import { cosineSimilarity } from "./cosineSimilarity";
import { centerDimensionScores } from "./centerDimensionScores";

export function findLiteraryProfile(
    userScores: DimensionScores,
    profiles: LiteraryProfile[]
): LiteraryProfile | null {

    const centeredUser =
        centerDimensionScores(userScores);

    let bestProfile: LiteraryProfile | null = null;
    let bestSimilarity = -Infinity;

    for (const profile of profiles) {

        const similarity =
            cosineSimilarity(
                centeredUser,
                profile.dimensions
            );

        if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestProfile = profile;
        }
    }

    return bestProfile;
}