from pydantic import BaseModel


class Recommendation(BaseModel):
    rank: int
    book_id: str
    title: str
    author: str

    dimension_score: float
    profile_score: float
    base_score: float

    source_score: int
    source_bonus: float

    final_score: float


class RecommendationResult(BaseModel):
    recommendations: list[Recommendation]