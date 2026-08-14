from pydantic import BaseModel

from app.schemas.question import Question


class Questionnaire(BaseModel):
    category: str
    title: str
    description: str
    version: float
    questions: list[Question]