import type { QuestionnaireCategory } from "./questionnaire";
import type { QuestionnaireResult } from "./questionnaireResult";
import type { Recommendation } from "./Recommendation";

/**
 * Everything the results and email pages need after the questionnaire is
 * submitted. Under react-router this travelled in navigate(..., { state }),
 * making it invisible to the URL and lost on refresh; it now lives in the
 * session context and sessionStorage instead.
 */
export interface QuestionnaireSession {
  category: QuestionnaireCategory;
  answers: Record<number, number>;
  result: QuestionnaireResult;
  recommendations: Recommendation[];
}
