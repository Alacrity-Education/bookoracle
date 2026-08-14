import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageLayout from "../../components/ui/PageLayout/PageLayout";
import ContentCard from "../../components/ui/ContentCard/ContentCard";
import Checkbox from "../../components/ui/Checkbox/Checkbox";
import Button from "../../components/ui/Button/Button";

import { ROUTES } from "../../utils/routes";

import gdprText from "../../content/gdpr";

import "./GDPR.css";

function GDPR() {
    const navigate = useNavigate();

    const [accepted, setAccepted] = useState(false);

    return (
        <PageLayout>
            <ContentCard
                title="Protecția datelor (GDPR)"
                subtitle="Înainte de a începe testul, te rugăm să citești informațiile privind prelucrarea datelor."
            >
                <div className="gdpr-content">
                    {gdprText.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </div>

                <Checkbox
                    id="gdpr"
                    checked={accepted}
                    onChange={setAccepted}
                    label={
                        <>
                            Am citit și sunt de acord cu prelucrarea datelor
                            personale conform informațiilor prezentate.
                        </>
                    }
                />

                <Button
                    disabled={!accepted}
                    onClick={() => navigate(ROUTES.INTRODUCTION)}
                >
                    Accept și continui
                </Button>
            </ContentCard>
        </PageLayout>
    );
}

export default GDPR;