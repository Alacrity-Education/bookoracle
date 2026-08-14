import type { ReactNode } from "react";

import "./ContentCard.css";

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

        <section className={`content-card ${className}`}>

            {(title || subtitle) && (

                <header className="content-card__header">

                    {title &&

                        <h1 className="content-card__title">

                            {title}

                        </h1>

                    }

                    {subtitle &&

                        <p className="content-card__subtitle">

                            {subtitle}

                        </p>

                    }

                </header>

            )}

            <div className="content-card__body">

                {children}

            </div>

        </section>

    );

}

export default ContentCard;