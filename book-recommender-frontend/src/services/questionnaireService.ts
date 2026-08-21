import api from "./api";
import type { Questionnaire } from "../types/questionnaire";
import type { QuestionnaireResult } from "../types/questionnaireResult";

export async function getQuestionnaire(
    category: "prose" | "poetry"
): Promise<Questionnaire> {
    const response = await api.get<Questionnaire>(
        `/questionnaires/${category}`
    );

    return response.data;
}

export async function submitQuestionnaire(
    category: "prose" | "poetry",
    answers: Record<number, number>
): Promise<QuestionnaireResult> {
    const response = await api.post(`/questionnaires/${category}/submit`, {
        answers,
    });

    return response.data;
}