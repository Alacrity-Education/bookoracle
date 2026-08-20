import os

from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.questionnaires import router as questionnaire_router

from app.api.routes import recommendations

from dotenv import load_dotenv

load_dotenv()

# Comma-separated list of allowed browser origins.
# In the deployed stack the browser talks to the Next server, which proxies
# to this API server-side, so no cross-origin request is made and this is
# unused. It still matters if the API is ever exposed publicly, and for
# calling it directly during development.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app = FastAPI(
    title="LIRA API",
    version="1.0.0",
)

app.include_router(
    questionnaire_router,
    prefix="/api/questionnaires",
    tags=["Questionnaires"],
)

app.include_router(
    recommendations.router,
    prefix="/api/recommendations",
    tags=["Recommendations"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "LIRA API"
    }