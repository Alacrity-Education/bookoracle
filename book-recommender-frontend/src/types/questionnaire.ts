import type { Question } from "./question";

export type QuestionnaireCategory =
    | "prose"
    | "poetry";

export interface Questionnaire {
    category: QuestionnaireCategory;
    title: string;
    description: string;
    version: number;
    questions: Question[];
}