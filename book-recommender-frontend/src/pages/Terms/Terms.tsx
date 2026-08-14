import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageLayout from "../../components/ui/PageLayout/PageLayout";
import ContentCard from "../../components/ui/ContentCard/ContentCard";
import Checkbox from "../../components/ui/Checkbox/Checkbox";
import Button from "../../components/ui/Button/Button";

import { ROUTES } from "../../utils/routes";

import "./Terms.css";
import termsText from "../../content/terms";

function Terms() {
    const navigate = useNavigate();

    const [accepted, setAccepted] = useState(false);

    return (
        <PageLayout>
            <ContentCard
                title="Termeni și Condiții"
                subtitle="Te rugăm să citești informațiile de mai jos înainte de a continua."
            >
                <div className="terms-content">
                    {termsText.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </div>

                <Checkbox
                    id="terms"
                    checked={accepted}
                    onChange={setAccepted}
                    label={
                        <>
                            Am citit și sunt de acord cu Termenii și
                            Condițiile.
                        </>
                    }
                />

                <Button
                    disabled={!accepted}
                    onClick={() => navigate(ROUTES.GDPR)}
                >
                    Accept și continui
                </Button>
            </ContentCard>
        </PageLayout>
    );
}

export default Terms;