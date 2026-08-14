import type { ReactNode } from "react";

import "./PageLayout.css";

interface PageLayoutProps {
    children: ReactNode;
    className?: string;
}

function PageLayout({
    children,
    className = "",
}: PageLayoutProps) {
    return (
        <main className={`page-layout ${className}`}>
            <div className="page-layout__container">
                {children}
            </div>
        </main>
    );
}

export default PageLayout;