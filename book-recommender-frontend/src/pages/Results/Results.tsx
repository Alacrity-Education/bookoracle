import { useLocation, useNavigate } from "react-router-dom";

import PageLayout from "../../components/ui/PageLayout/PageLayout";

import type { QuestionnaireResult } from "../../types";

import Button from "../../components/ui/Button/Button";

import "./Results.css";

interface ResultsLocationState {
    result?: QuestionnaireResult;
}

const dimensionLabels = {
    curiosity: "Curiozitate",
    reflection: "Reflecție",
    complexity: "Complexitate",
    emotionality: "Emoționalitate",
    characters: "Personaje",
    pace: "Ritm",
    imagination: "Imaginație",
    realism: "Realism",
    ambiguity: "Ambiguitate",
    culture: "Deschidere culturală",
};

function Results() {

    const location = useLocation();
    const navigate = useNavigate();

    const state =
        location.state as ResultsLocationState | null;

    const result = state?.result;

    if (!result) {
        return (
            <PageLayout>
                <h1>Rezultatul nu este disponibil</h1>

                <p>
                    Nu am putut încărca rezultatul testului.
                </p>

                <Button onClick={() => navigate("/")}>
                    Înapoi la început
                </Button>
            </PageLayout>
        );
    }

    const mainProfile = result.profiles[0];

    return (
        <PageLayout>

            <section className="results-page">

                <div className="results-header">

                    <p className="results-eyebrow">
                        Profilul tău literar
                    </p>

                    <h1>
                        {mainProfile.name}
                    </h1>

                    <p className="results-description">
                        {mainProfile.description}
                    </p>

                </div>

                <section className="results-dimensions">

                    <h2>
                        Profilul tău de lectură
                    </h2>

                    <div className="dimension-list">

                        {Object.entries(
                            result.normalized_scores
                        ).map(
                            ([dimension, score]) => (
                                <div
                                    className="dimension-item"
                                    key={dimension}
                                >

                                    <div className="dimension-header">

                                        <span>
                                            {dimensionLabels[dimension as keyof typeof dimensionLabels]}
                                        </span>

                                        <span>
                                            {Math.round(score)}
                                        </span>

                                    </div>

                                    <div className="dimension-bar">

                                        <div
                                            className="dimension-bar-fill"
                                            style={{
                                                width: `${score}%`,
                                            }}
                                        />

                                    </div>

                                </div>
                            )
                        )}

                    </div>

                </section>

                <section className="results-profiles">

                    <h2>
                        Alte profiluri apropiate
                    </h2>

                    <div className="profile-list">

                        {result.profiles
                            .slice(1, 3)
                            .map((profile) => (
                                <article
                                    className="profile-card"
                                    key={profile.id}
                                >

                                    <h3>
                                        {profile.name}
                                    </h3>

                                    <p>
                                        {profile.description}
                                    </p>

                                    <span>
                                        Potrivire:{" "}
                                        {Math.round(
                                            profile.similarity * 100
                                        )}
                                        %
                                    </span>

                                </article>
                            ))}

                    </div>

                </section>

                <div className="results-actions">

                    <Button onClick={() => navigate("/")}>

                        Înapoi la început

                    </Button>

                </div>

            </section>

        </PageLayout>
    );
}

export default Results;