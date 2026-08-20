"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import QuestionCard from "@/components/ui/QuestionCard/QuestionCard";

import { submitQuestionnaire } from "@/services/questionnaireService";
import recommendationService from "@/services/recommendationService";
import { useSession } from "@/lib/session";

import type { Questionnaire, QuestionnaireCategory } from "@/types/questionnaire";

interface QuestionnaireStepperProps {
  // Already fetched on the server, so there is no loading state on first paint.
  questionnaire: Questionnaire;
  category: QuestionnaireCategory;
}

export default function QuestionnaireStepper({
  questionnaire,
  category,
}: QuestionnaireStepperProps) {
  const router = useRouter();
  const { setSession } = useSession();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questionnaire.questions[currentQuestionIndex];

  const handleAnswerSelect = (value: number) => {
    if (!currentQuestion) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = async () => {
    if (!currentQuestion) {
      return;
    }

    if (answers[currentQuestion.id] === undefined) {
      return;
    }

    if (currentQuestionIndex < questionnaire.questions.length - 1) {
      setCurrentQuestionIndex((previous) => previous + 1);
      return;
    }

    try {
      setSubmitting(true);

      const result = await submitQuestionnaire(category, answers);

      const { recommendations } =
        await recommendationService.getRecommendations(category, answers);

      // Replaces react-router's navigate(..., { state }): the results page
      // reads this from the session context instead of the router.
      setSession({ category, answers, result, recommendations });

      router.push(`/results/${category}`);
    } catch (submitError) {
      console.error("Error submitting questionnaire:", submitError);

      setError("A apărut o eroare la trimiterea chestionarului.");
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((previous) => previous - 1);
    }
  };

  if (error) {
    return (
      <PageLayout>
        <p>{error}</p>
      </PageLayout>
    );
  }

  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  return (
    <PageLayout>
      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          current={currentQuestionIndex + 1}
          total={questionnaire.questions.length}
          selectedAnswer={selectedAnswer ?? null}
          onAnswerChange={handleAnswerSelect}
          onNext={handleNext}
          onPrevious={currentQuestionIndex > 0 ? handlePrevious : undefined}
          nextDisabled={submitting}
        />
      )}
    </PageLayout>
  );
}
