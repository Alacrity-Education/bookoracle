import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import PageLayout from "../../components/ui/PageLayout/PageLayout";

import "./Finish.css";

function Finish() {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate("/");
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [navigate]);

    return (
        <PageLayout>
            <main className="finish-page">

                <section className="finish-card">

                    <div className="finish-content">

                        <p className="finish-eyebrow">
                            LIRA
                        </p>

                        <h1>
                            Mulțumim pentru participare!
                        </h1>

                        <p className="finish-message">
                            Îți mulțumim că ai completat chestionarul.
                            Sperăm ca recomandările LIRA să te ajute
                            să descoperi următoarea ta lectură.
                        </p>

                        <div className="finish-loading">

                            <div className="finish-loading-track">
                                <div className="finish-loading-progress" />
                            </div>

                            <p className="finish-loading-text">
                                Revenim la început...
                            </p>

                        </div>

                    </div>

                </section>

            </main>
        </PageLayout>
    );
}

export default Finish;