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
            data-answer={value}
            className={`flex w-full cursor-pointer items-center gap-4 rounded-medium border p-4 transition-all duration-200 hover:border-primary ${
                selected
                    ? "border-primary bg-[rgba(101,80,163,0.08)]"
                    : "border-border bg-background"
            }`}
            onClick={() => onSelect(value)}
        >
            <span
                className={`size-[18px] shrink-0 rounded-full border-2 border-primary ${
                    selected ? "bg-primary" : ""
                }`}
            />

            <span>{label}</span>
        </button>
    );
}

export default AnswerOption;
