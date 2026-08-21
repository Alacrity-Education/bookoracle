/**
 * The one entry point the app uses to turn answers into a result.
 *
 * Everything runs in the browser, so this resolves at the same speed whether
 * or not the tablet has a network. What still needs the backend — recording
 * the participation and sending the result email — goes through
 * participationService, which queues when offline.
 */

import type { Question } from "@/types/question";
import type { QuestionnaireResult } from "@/types/questionnaireResult";
import type { Recommendation } from "@/types/Recommendation";

import { scoreQuestionnaire } from "./engine";
import { loadBooks, loadLiteraryProfiles } from "./offlineData";

export { warmScoringData } from "./offlineData";

export async function computeResults(
  questions: Question[],
  answers: Record<number, number>,
): Promise<{ result: QuestionnaireResult; recommendations: Recommendation[] }> {
  const [profiles, books] = await Promise.all([
    loadLiteraryProfiles(),
    loadBooks(),
  ]);

  return scoreQuestionnaire(answers, questions, profiles, books);
}
