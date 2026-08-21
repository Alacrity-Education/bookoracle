import ContentCard from "../ContentCard/ContentCard";
import ProgressBar from "../ProgressBar/ProgressBar";
import AnswerOption from "../AnswerOption/AnswerOption";
import Button from "../Button/Button";

import type { Question } from "../../../types/question";

interface QuestionCardProps {
    question: Question;
    current: number;
    total: number;
    selectedAnswer: number | null;
    onAnswerChange: (value: number) => void;
    onNext: () => void;
    onPrevious?: () => void;
    /** Blocks the final submit while the request is in flight. */
    nextDisabled?: boolean;
}

function QuestionCard({
    question,
    current,
    total,
    selectedAnswer,
    onAnswerChange,
    onNext,
    onPrevious,
    nextDisabled = false,
}: QuestionCardProps) {

    const isLastQuestion = current === total;

    return (
        <ContentCard>
            <ProgressBar
                current={current}
                total={total}
            />

            <div>

                <span>Întrebare</span>

                <h2>{question.text}</h2>

            </div>

            <div className="flex flex-col gap-4">
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

            {/* Stacks on narrow screens, with the primary action on top. */}
            <div className="flex justify-between gap-4 max-md:flex-col-reverse max-md:[&>button]:w-full">
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
                    disabled={selectedAnswer === null || nextDisabled}
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
