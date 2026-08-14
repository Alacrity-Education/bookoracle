import { Navigate, useParams } from "react-router-dom";

import Prose from "./Prose/Prose";
import Poetry from "./Poetry/Poetry";

function Questionnaire() {

    const { category } = useParams();

    switch (category) {

        case "prose":
            return <Prose />;

        case "poetry":
            return <Poetry />;

        default:
            return <Navigate to="/" replace />;
    }

}

export default Questionnaire;