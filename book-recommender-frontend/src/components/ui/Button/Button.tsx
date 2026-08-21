import type { ButtonHTMLAttributes, ReactNode } from "react";

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

// `enabled:` maps to :enabled, which is how the old :not(:disabled) guards
// on the hover and active states are expressed.
const BASE =
    "inline-flex min-h-[3.25rem] cursor-pointer items-center justify-center " +
    "rounded-medium border px-8 py-3.5 text-base font-semibold leading-none " +
    "transition-[opacity,transform,background-color,border-color] duration-200 " +
    "enabled:hover:-translate-y-px enabled:active:translate-y-0 " +
    "focus-visible:outline-3 focus-visible:outline-offset-[3px] focus-visible:outline-accent/30 " +
    "disabled:cursor-not-allowed disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
    primary: "border-transparent bg-primary text-primary-content enabled:hover:opacity-[0.92]",
    secondary: "border-transparent bg-secondary text-secondary-content enabled:hover:opacity-[0.92]",
    accent: "border-transparent bg-accent text-accent-content enabled:hover:opacity-[0.92]",
    outline: "border-primary bg-transparent text-primary enabled:hover:bg-surface",
};

function Button({
    children,
    variant = "primary",
    fullWidth = false,
    className = "",
    ...buttonProps
}: ButtonProps) {
    const buttonClasses = [
        BASE,
        VARIANTS[variant],
        fullWidth ? "w-full" : "",
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
