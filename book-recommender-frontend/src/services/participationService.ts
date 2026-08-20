import api from "./api";

export interface ParticipationSubmission {
    category: "prose" | "poetry";
    answers: Record<number, number>;
    destination: "email" | "finish";
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
};

export default participationService;