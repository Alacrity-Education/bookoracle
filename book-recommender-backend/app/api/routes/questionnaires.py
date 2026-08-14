from fastapi import APIRouter

from app.schemas.questionnaire import Questionnaire
from app.services.questionnaire_service import get_questionnaire
from app.schemas.questionnaire_submission import QuestionnaireSubmission
from app.schemas.questionnaire_result import QuestionnaireResult
from app.services.personality_service import calculate_profile
from app.schemas.questionnaire_category import QuestionnaireCategory

router = APIRouter()


@router.get("/{category}", response_model=Questionnaire)
def read_questionnaire(category: QuestionnaireCategory):
    return get_questionnaire(category.value)

@router.post("/{category}/submit", response_model=QuestionnaireResult)
def submit_questionnaire(category: QuestionnaireCategory, submission: QuestionnaireSubmission):
    return calculate_profile(
        answers=submission.answers, 
        category=category.value,
    )