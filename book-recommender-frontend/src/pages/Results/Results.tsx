import { useLocation, useNavigate } from "react-router-dom";

import PageLayout from "../../components/ui/PageLayout/PageLayout";
import Button from "../../components/ui/Button/Button";

import type { QuestionnaireResult } from "../../types";

import participationService from "../../services/participationService";

import "./Results.css";

interface Recommendation {
    rank: number;
    book_id: string;
    title: string;
    author: string;
    dimension_score: number;
    profile_score: number;
    base_score: number;
    source_score: number;
    source_bonus: number;
    final_score: number;
}

interface ResultsLocationState {
    result?: QuestionnaireResult;
    recommendations?: Recommendation[];
    answers?: Record<number, number>;
    category?: "prose" | "poetry";
}

function Results() {
    const location = useLocation();
    const navigate = useNavigate();

    const state =
        location.state as ResultsLocationState | null;

    const result = state?.result;
    const recommendations = state?.recommendations ?? [];

    if (!result) {
        return (
            <PageLayout>
                <section className="results-page results-empty">
                    <h1>Rezultatul nu este disponibil</h1>

                    <p>
                        Nu am putut încărca rezultatul testului.
                    </p>

                    <Button onClick={() => navigate("/")}>
                        Înapoi la început
                    </Button>
                </section>
            </PageLayout>
        );
    }

    const mainProfile = result.profiles[0];

    const handleFinish = async (
        destination: "email" | "finish",
    ) => {
        if (!state?.answers || !state.category) {
            return;
        }

        try {
            await participationService.saveParticipation(
                state.category,
                state.answers,
                destination,
            );

            if (destination === "email") {
                navigate("/email");
            } else {
                navigate("/finish");
            }
        } catch (error) {
            console.error(
                "Could not save participation:",
                error,
            );
        }
    };

    return (
        <PageLayout>
            <section className="results-page">

                {/* ========================= */}
                {/* Literary profile            */}
                {/* ========================= */}

                <section className="results-profile">

                    <p className="results-eyebrow">
                        Profilul tău literar
                    </p>

                    <h1>
                        {mainProfile.name}
                    </h1>

                    <p className="results-description">
                        {mainProfile.description}
                    </p>

                    <div className="profile-match">
                        <span className="profile-match-label">
                            Potrivire cu profilul tău
                        </span>

                        <strong>
                            {Math.round(
                                mainProfile.similarity * 100
                            )}%
                        </strong>
                    </div>

                    <p className="profile-explanation">
                        Acesta este profilul literar care se
                        potrivește cel mai bine cu răspunsurile tale.
                    </p>

                </section>


                {/* ========================= */}
                {/* Recommendations             */}
                {/* ========================= */}

                <section className="results-recommendations">

                    <div className="recommendations-header">
                        <p className="results-eyebrow">
                            Recomandările LIRA
                        </p>

                        <h2>
                            Uite ce cărți îți recomandăm
                        </h2>

                        <p>
                            Am ales aceste cărți pe baza
                            personalității tale literare.
                        </p>
                    </div>


                    {recommendations.length > 0 ? (
                        <div className="recommendation-list">

                            {recommendations.map((book) => (
                                <article
                                    className="recommendation-card"
                                    key={book.book_id}
                                >

                                    <div className="recommendation-rank">
                                        {String(book.rank).padStart(2, "0")}
                                    </div>

                                    <div className="recommendation-content">

                                        <h3>
                                            {book.title}
                                        </h3>

                                        <p className="recommendation-author">
                                            {book.author}
                                        </p>

                                        <div className="recommendation-meta">

                                            <span>
                                                Potrivire cu profilul tău
                                            </span>

                                            <strong>
                                                {Math.round(
                                                    book.base_score * 100
                                                )}%
                                            </strong>

                                        </div>

                                    </div>

                                </article>
                            ))}

                        </div>
                    ) : (
                        <p className="recommendations-empty">
                            Recomandările nu sunt disponibile momentan.
                        </p>
                    )}

                </section>


                {/* ========================= */}
                {/* Actions                     */}
                {/* ========================= */}

                <div className="results-actions">

                    <Button
                        onClick={() => handleFinish("email")}
                    >
                        Trimite-mi rezultatele pe mail
                    </Button>

                    <Button
                        onClick={() => handleFinish("finish")}
                    >
                        Revin la început
                    </Button>

                </div>

            </section>
        </PageLayout>
    );
}

export default Results;