import type { ReactNode } from "react";

import "./SelectionCard.css";

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
            className={`selection-card ${
                disabled ? "selection-card--disabled" : ""
            } ${className}`}
        >
            {icon && (
                <div className="selection-card__icon">
                    {icon}
                </div>
            )}

            <h2 className="selection-card__title">
                {title}
            </h2>

            <p className="selection-card__description">
                {description}
            </p>

            <div className="selection-card__actions">
                {children}
            </div>
        </article>
    );
}

export default SelectionCard;