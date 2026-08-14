export const ROUTES = {
    WELCOME: "/",
    TERMS: "/terms",
    GDPR: "/gdpr",
    INTRODUCTION: "/introduction",
    QUESTIONNAIRE: "/questionnaire",
    PROCESSING: "/processing",
    RESULTS: "/results",
    EMAIL: "/email",
    FINISH: "/finish",
};

export const questionnaireRoute = (category: "prose" | "poetry") =>
    `${ROUTES.QUESTIONNAIRE}/${category}`;