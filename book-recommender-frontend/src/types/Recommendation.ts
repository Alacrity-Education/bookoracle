export interface Recommendation {
    rank: number;
    book_id: string;
    title: string;
    author: string;
    dimension_score: number;
    profile_score: number;
    base_score: number;
    source_score: number;
    source_bonus: number;
    final_score: number;
}

export interface RecommendationResult {
    recommendations: Recommendation[];
}