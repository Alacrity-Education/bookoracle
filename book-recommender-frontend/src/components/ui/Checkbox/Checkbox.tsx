import type { ReactNode } from "react";

interface CheckboxProps {
    id: string;
    label: ReactNode;
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
            className="flex cursor-pointer select-none items-start gap-[0.8rem]"
            htmlFor={id}
        >
            {/* The real input stays in the DOM but hidden, and drives the
                custom box below through the `peer` variant. */}
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                    onChange(event.target.checked)
                }
                className="peer hidden"
            />

            <span
                className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border-2 border-primary transition duration-200 after:text-[14px] after:text-white peer-checked:bg-primary peer-checked:after:content-['✓']"
            />

            <span className="text-base leading-[1.5]">
                {label}
            </span>
        </label>
    );
}

export default Checkbox;
