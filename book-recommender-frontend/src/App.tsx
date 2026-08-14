import { Routes, Route } from "react-router-dom";

import Welcome from "./pages/Welcome/Welcome";
import Terms from "./pages/Terms/Terms";
import GDPR from "./pages/GDPR/GDPR";
import Introduction from "./pages/Introduction/Introduction";
import Questionnaire from "./pages/Questionnaire/Questionnaire";
import Processing from "./pages/Processing/Processing";
import Results from "./pages/Results/Results";
import Email from "./pages/Email/Email";
import Finish from "./pages/Finish/Finish";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Welcome />} />

            <Route path="/terms" element={<Terms />} />

            <Route path="/gdpr" element={<GDPR />} />

            <Route
                path="/introduction"
                element={<Introduction />}
            />

            <Route
                path="/questionnaire/:category"
                element={<Questionnaire />}
            />

            <Route
                path="/processing"
                element={<Processing />}
            />

            <Route
                path="/results/:category"
                element={<Results />}
            />

            <Route
                path="/email"
                element={<Email />}
            />

            <Route
                path="/finish"
                element={<Finish />}
            />
        </Routes>
    );
}

export default App;