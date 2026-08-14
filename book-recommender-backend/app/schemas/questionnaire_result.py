from pydantic import BaseModel

class Contribution(BaseModel):
    question_id: int
    dimension: str
    contribution: float

class ProfileResult(BaseModel):
    id: str
    name: str
    description: str
    similarity: float

class QuestionnaireResult(BaseModel):
    raw_scores: dict[str, float]
    normalized_scores: dict[str, float]
    contributions: list[Contribution]
    profiles: list[ProfileResult]