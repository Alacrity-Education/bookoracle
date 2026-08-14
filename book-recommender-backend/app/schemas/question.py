from pydantic import BaseModel
from typing import Literal

Dimension = Literal[
    "ambiguity",
    "reflection",
    "complexity",
    "realism",
    "characters",
    "pace",
    "culture",
    "curiosity",
    "imagination",
    "emotionality",
]

class Answer(BaseModel):
    id: int
    text: str
    value: int

class Question(BaseModel):
    id: int
    text: str
    importance: float
    control: bool
    weights: dict[Dimension, float]
    answers: list[Answer]