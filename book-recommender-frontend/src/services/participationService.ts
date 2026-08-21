import api from "./api";

export interface ParticipationSubmission {
    category: "prose" | "poetry";
    answers: Record<number, number>;
    destination: "email" | "finish";
}

interface EmailRecommendation {
    rank: number;
    book_id: string;
    title: string;
    author: string;
}

export interface ParticipationCompletion {
    answers: Record<number, number>;
    destination: "email" | "finish";
    email?: string;
    newsletter?: boolean;
    profile?: {
        id: string;
        name: string;
        description: string;
    };
    recommendations?: EmailRecommendation[];
}


const participationService = {
    async saveParticipation(
        category: "prose" | "poetry",
        answers: Record<number, number>,
        destination: "email" | "finish",
    ): Promise<void> {
        await api.post(
            `/questionnaires/${category}/complete`,
            {
                answers,
                destination,
            },
        );
    },

    async complete(
        category: "prose" | "poetry",
        data: ParticipationCompletion,
    ): Promise<void> {
        await api.post(
            `/questionnaires/${category}/complete`,
            data,
        );
    },
};

export default participationService;