from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.questionnaires import router as questionnaire_router

from app.api.routes import recommendations

from dotenv import load_dotenv

load_dotenv()

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
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "LIRA API"
    }