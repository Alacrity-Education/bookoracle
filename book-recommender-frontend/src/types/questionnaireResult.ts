import type { Dimension } from "./dimension";

export interface DimensionContribution {
    questionId: number;
    dimension: Dimension;
    contribution: number;
}

export interface ProfileResult {
    id: string;
    name: string;
    description: string;
    similarity: number;
}

export interface QuestionnaireResult {
    raw_scores: Record<Dimension, number>;
    normalized_scores: Record<Dimension, number>;
    contributions: DimensionContribution[];
    profiles: ProfileResult[];
}