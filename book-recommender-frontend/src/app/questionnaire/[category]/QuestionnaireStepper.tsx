"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import PageLayout from "@/components/ui/PageLayout/PageLayout";
import QuestionCard from "@/components/ui/QuestionCard/QuestionCard";

import { computeResults, warmScoringData } from "@/lib/scoring";
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

  // The book data is a couple of hundred kilobytes and is not needed until the
  // last question is answered. Fetching it now means the reader never waits
  // for it, and that it is on the device before the tablet loses its network.
  useEffect(() => {
    warmScoringData();
  }, []);

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

      // Scored on the device against the very questions the reader answered,
      // so the result does not depend on a network the tablet may not have.
      const { result, recommendations } = await computeResults(
        questionnaire.questions,
        answers,
      );

      // Replaces react-router's navigate(..., { state }): the results page
      // reads this from the session context instead of the router.
      setSession({ category, answers, result, recommendations });

      router.push(`/results/${category}`);
    } catch (submitError) {
      console.error("Error scoring questionnaire:", submitError);

      setError("A apărut o eroare la calcularea rezultatelor.");
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
