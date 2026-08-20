from fastapi import APIRouter

from app.schemas.questionnaire_submission import QuestionnaireSubmission
from app.schemas.recommendation_result import RecommendationResult

from app.services.personality_service import calculate_profile
from app.services.recommendation_data_service import (
    load_books,
    load_book_profiles,
)
from app.services.recomendation_service import rank_books


router = APIRouter()


@router.post(
    "/{category}",
    response_model=RecommendationResult,
)
def get_recommendations(
    category: str,
    submission: QuestionnaireSubmission,
):
    profile = calculate_profile(
        answers=submission.answers,
        category=category,
    )

    user_dimensions = {
        dimension: (score - 50) / 50
        for dimension, score
        in profile["normalized_scores"].items()
    }

    user_profiles = {
        literary_profile["id"]: literary_profile["similarity"]
        for literary_profile in profile["profiles"]
    }

    books = load_books()
    books_profiles = load_book_profiles()

    recommendations = rank_books(
        user_dimensions=user_dimensions,
        user_profiles=user_profiles,
        books=books,
        books_profiles=books_profiles,
        top_n=10,
    )

    return {
        "recommendations": recommendations
    }