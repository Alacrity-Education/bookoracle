import type { ReactNode } from "react";

interface ContentCardProps {

    title?: string;

    subtitle?: string;

    children: ReactNode;

    className?: string;

}

function ContentCard({

    title,

    subtitle,

    children,

    className=""

}:ContentCardProps){

    return(

        // mx-auto centres the card inside the wider PageLayout container.
        <section
            className={`mx-auto w-full max-w-[760px] animate-fade-in rounded-large border border-border bg-surface p-6 shadow-small md:p-10 ${className}`}
        >

            {(title || subtitle) && (

                <header className="mb-8">

                    {title &&

                        <h1 className="mb-3 text-text">

                            {title}

                        </h1>

                    }

                    {subtitle &&

                        <p className="text-subtle leading-[1.6]">

                            {subtitle}

                        </p>

                    }

                </header>

            )}

            <div className="flex flex-col gap-6">

                {children}

            </div>

        </section>

    );

}

export default ContentCard;
