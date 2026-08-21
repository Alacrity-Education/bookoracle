export interface DimensionContribution {
    /** snake_case because this mirrors the backend's Contribution schema. */
    question_id: number;
    dimension: string;
    contribution: number;
}

export interface ProfileResult {
    id: string;
    name: string;
    description: string;
    similarity: number;
}

export interface QuestionnaireResult {
    /**
     * Keyed by dimension name, but not necessarily complete: a dimension no
     * answered question carries a weight for is absent rather than zero, in
     * both the backend and the browser engine that mirrors it.
     */
    raw_scores: Record<string, number>;
    normalized_scores: Record<string, number>;
    contributions: DimensionContribution[];
    profiles: ProfileResult[];
}