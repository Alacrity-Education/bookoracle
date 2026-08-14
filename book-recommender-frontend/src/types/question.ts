import type { Answer } from "./answer";
import type { Dimension } from "./dimension";

export interface Question {
    id: number;
    text: string;
    importance: number;
    control: boolean;
    weights: Partial<Record<Dimension, number>>;
    answers: Answer[];
}