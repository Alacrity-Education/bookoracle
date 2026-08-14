import type { ButtonHTMLAttributes, ReactNode } from "react";

import "./Button.css";

type ButtonVariant =
    | "primary"
    | "secondary"
    | "accent"
    | "outline";

interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    fullWidth?: boolean;
}

function Button({
    children,
    variant = "primary",
    fullWidth = false,
    className = "",
    ...buttonProps
}: ButtonProps) {
    const buttonClasses = [
        "button",
        `button--${variant}`,
        fullWidth ? "button--full-width" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            className={buttonClasses}
            {...buttonProps}
        >
            {children}
        </button>
    );
}

export default Button;