import "./AnswerOption.css";

interface AnswerOptionProps {
    label: string;
    value: number;
    selected: boolean;
    onSelect: (value: number) => void;
}

function AnswerOption({
    label,
    value,
    selected,
    onSelect,
}: AnswerOptionProps) {
    return (
        <button
            type="button"
            className={`answer-option ${
                selected ? "answer-option--selected" : ""
            }`}
            onClick={() => onSelect(value)}
        >
            <span className="answer-option__indicator" />

            <span>{label}</span>
        </button>
    );
}

export default AnswerOption;