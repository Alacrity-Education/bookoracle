import ContentCard from "../ContentCard/ContentCard";
import ProgressBar from "../ProgressBar/ProgressBar";
import AnswerOption from "../AnswerOption/AnswerOption";
import Button from "../Button/Button";

import type { Question } from "../../../types/question";

import "./QuestionCard.css";

interface QuestionCardProps {
    question: Question;
    current: number;
    total: number;
    selectedAnswer: number | null;
    onAnswerChange: (value: number) => void;
    onNext: () => void;
    onPrevious?: () => void;
}

function QuestionCard({
    question,
    current,
    total,
    selectedAnswer,
    onAnswerChange: onAnswerChange,
    onNext,
    onPrevious,
}: QuestionCardProps) {

    const isLastQuestion = current === total;

    return (
        <ContentCard>
            <ProgressBar
                current={current}
                total={total}
            />

            <div className="question-card__header">

                <span>Întrebare</span>

                <h2>{question.text}</h2>

            </div>

            <div className="question-card__answers">
                {question.answers.map((answer) => (
                    <AnswerOption
                        key={answer.value}
                        label={answer.text}
                        value={answer.value}
                        selected={selectedAnswer === answer.value}
                        onSelect={onAnswerChange}
                    />
                ))}
            </div>

            <div className="question-card__actions">
                {onPrevious && (
                    <Button
                        variant="outline"
                        onClick={onPrevious}
                    >
                        Înapoi
                    </Button>
                )}

                <Button
                    onClick={onNext}
                    disabled={selectedAnswer === null}
                >
                    {isLastQuestion
                        ? "Vezi recomandările"
                        : "Continuă"}
                </Button>
            </div>
        </ContentCard>
    );
}

export default QuestionCard;