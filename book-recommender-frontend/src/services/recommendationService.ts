import api from "./api";

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

export interface RecommendationSubmission {
    answers: Record<number, number>;
}

const recommendationService = {
    async getRecommendations(
        category: "prose" | "poetry",
        answers: Record<number, number>,
    ): Promise<RecommendationResult> {

        const response = await api.post<RecommendationResult>(
            `/recommendations/${category}`,
            {
                answers,
            },
        );

        return response.data;
    },
};

export default recommendationService;