import { useNavigate } from "react-router-dom";

import PageLayout from "../../components/ui/PageLayout/PageLayout";
import ContentCard from "../../components/ui/ContentCard/ContentCard";
import Button from "../../components/ui/Button/Button";

import { ROUTES } from "../../utils/routes";

function Welcome() {
    const navigate = useNavigate();

    return (
        <PageLayout>
            <ContentCard
                title="Descoperă următoarea ta carte preferată"
                subtitle="Răspunde la câteva întrebări și primește recomandări personalizate."
            >
                <p>
                    Testul durează aproximativ 2 minute și îți recomandă cărți
                    în funcție de personalitatea și preferințele tale de lectură.
                </p>

                <Button
                    variant="primary"
                    onClick={() => navigate(ROUTES.TERMS)}
                >
                    Începe
                </Button>
            </ContentCard>
        </PageLayout>
    );
}

export default Welcome;