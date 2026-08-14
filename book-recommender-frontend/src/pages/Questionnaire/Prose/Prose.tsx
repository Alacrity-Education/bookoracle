import { useEffect, useState } from "react";


import PageLayout from "../../../components/ui/PageLayout/PageLayout";
import QuestionCard from "../../../components/ui/QuestionCard/QuestionCard";

import type {
    Questionnaire,
    Question,
    Answer,
    QuestionnaireCategory,
} from "../../../types";

import { getQuestionnaire, submitQuestionnaire } from "../../../services/questionnaireService";

import { useNavigate } from "react-router-dom";



import "./Prose.css";

function Prose() {

    const [loading, setLoading] = useState(true);
    const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const currentQuestion = questionnaire?.questions[currentQuestionIndex];
    const navigate = useNavigate();

    useEffect(() => {
        async function loadQuestionnaire() {
            try {
                const data = await getQuestionnaire("prose");
                setQuestionnaire(data);
            } catch {
                setError("Nu s-a putut încărca chestionarul.");
            } finally {
                setLoading(false);
            }
        }

        loadQuestionnaire();
    }, []);

    const handleAnswerSelect = (value : number) => {
        if (!currentQuestion) return;
        setAnswers((previous) => ({
            ...previous,
            [currentQuestion.id]: value,
        }));
    };

    const handleNext = async () => {
        if (!currentQuestion || !questionnaire) {
            return;
        }

        if (answers[currentQuestion.id] === undefined) {
            return;
        }

        if (currentQuestionIndex < questionnaire.questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
            return;
        }

        try {
            setSubmitting(true);

            const result = await submitQuestionnaire("prose", answers);

            navigate("/results/prose", { state: { result } });
        } catch (error) {
            console.error("Error submitting questionnaire:", error);

            setError("A apărut o eroare la trimiterea chestionarului.");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        }
    };

    const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;

    if (loading) {
        return (
            <PageLayout>
                <p>Se încarcă...</p>
            </PageLayout>
        );
    }

    if (error) {
        return (
            <PageLayout>
                <p>{error}</p>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            {questionnaire && currentQuestion && (
                <QuestionCard
                    question={currentQuestion}
                    current={currentQuestionIndex + 1}
                    total={questionnaire.questions.length}
                    selectedAnswer={selectedAnswer ?? null}
                    onAnswerChange={handleAnswerSelect}
                    onNext={handleNext}
                    onPrevious={
                        currentQuestionIndex > 0 ? handlePrevious : undefined
                    }
                />
            )}

        </PageLayout>
    );

}

export default Prose;