import type { Dimension } from "./dimension";

export type DimensionScores = Record<Dimension, number>;

export interface DimensionContribution {
    questionId: number;
    dimension: Dimension;
    contribution: number;
}

export interface DimensionCalculation {
    scores: DimensionScores;
    contributions: DimensionContribution[];
}