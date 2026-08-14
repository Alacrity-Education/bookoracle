import { useNavigate } from "react-router-dom";

import PageLayout from "../../components/ui/PageLayout/PageLayout";
import ContentCard from "../../components/ui/ContentCard/ContentCard";
import Button from "../../components/ui/Button/Button";

import { FaBookOpen, FaPenNib, FaBook} from "react-icons/fa";
import { RiTimerLine } from "react-icons/ri";
import { SiBookstack } from "react-icons/si";

import { questionnaireRoute, ROUTES } from "../../utils/routes";

import "./Introduction.css";
import SelectionCard from "../../components/ui/SelectionCard/SelectionCard";

function Introduction() {
    const navigate = useNavigate();

    return (
        <PageLayout>
            <ContentCard
                title="Ești pregătit să începi?"
                subtitle="Mai ai doar un pas până la recomandările tale personalizate."
            >
                <div className="introduction-description">
                    <p>
                        Vei răspunde la <strong>20 de întrebări</strong> despre
                        preferințele tale de lectură.
                    </p>

                    <p>
                        Nu există răspunsuri corecte sau greșite. Alege
                        varianta care te reprezintă cel mai bine.
                    </p>
                </div>

                <div className="introduction-info">

                    <div className="info-item">
                        {<FaBook />} 20 întrebări
                    </div>

                    <div className="info-item">
                        {<RiTimerLine />} Aproximativ 2-3 minute
                    </div>

                    <div className="info-item">
                        {<SiBookstack />} Recomandări personalizate
                    </div>

                </div>

                <SelectionCard
                    title="Proză"
                    description="Descoperă romane și volume de proză potrivite preferințelor tale."
                    icon={<FaBookOpen />}
                >
                    <Button
                        onClick={() => navigate(questionnaireRoute("prose"))}
                    >
                        Începe testul
                    </Button>
                </SelectionCard>

                <SelectionCard
                    title="Poezie"
                    description="Această secțiune va fi disponibilă într-o versiune viitoare."
                    icon={<FaPenNib />}
                    disabled
                >
                    <Button
                        variant="outline"
                        disabled
                    >
                        Disponibil în curând
                    </Button>
                </SelectionCard>

            </ContentCard>
        </PageLayout>
    );
}

export default Introduction;