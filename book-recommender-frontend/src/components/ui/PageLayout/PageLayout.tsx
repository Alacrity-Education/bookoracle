import type { ReactNode } from "react";

interface PageLayoutProps {
    children: ReactNode;
    className?: string;
}

function PageLayout({
    children,
    className = "",
}: PageLayoutProps) {
    return (
        <main
            className={`flex min-h-screen w-full items-center justify-center bg-background p-6 text-text md:p-10 ${className}`}
        >
            {/* Wider than any card it holds; the child centres itself. */}
            <div className="w-full max-w-[75rem]">
                {children}
            </div>
        </main>
    );
}

export default PageLayout;
