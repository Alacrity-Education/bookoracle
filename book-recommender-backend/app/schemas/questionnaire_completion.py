from typing import Literal

from pydantic import BaseModel


class QuestionnaireCompletion(BaseModel):
    answers: dict[int, int]
    destination: Literal["email", "finish"]