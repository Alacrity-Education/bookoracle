from pydantic import BaseModel

class QuestionnaireSubmission(BaseModel):
    answers: dict[int, int]