import "./Checkbox.css";

interface CheckboxProps {
    id: string;
    label: React.ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function Checkbox({
    id,
    label,
    checked,
    onChange,
}: CheckboxProps) {
    return (
        <label
            className="checkbox"
            htmlFor={id}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                    onChange(event.target.checked)
                }
            />

            <span className="checkbox__custom"></span>

            <span className="checkbox__label">
                {label}
            </span>
        </label>
    );
}

export default Checkbox;