import type { ReactNode } from "react";

interface SelectionCardProps {
    title: string;
    description: string;
    icon?: ReactNode;
    disabled?: boolean;
    children: ReactNode;
    className?: string;
}

function SelectionCard({
    title,
    description,
    icon,
    disabled = false,
    children,
    className = "",
}: SelectionCardProps) {
    return (
        <article
            className={`flex flex-col gap-4 rounded-large border border-border bg-surface p-8 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-medium ${
                disabled ? "opacity-75" : ""
            } ${className}`}
        >
            {icon && (
                <div className="text-[2rem]">
                    {icon}
                </div>
            )}

            <h2 className="text-text">
                {title}
            </h2>

            <p className="flex-1 leading-[1.6]">
                {description}
            </p>

            <div className="mt-auto">
                {children}
            </div>
        </article>
    );
}

export default SelectionCard;
