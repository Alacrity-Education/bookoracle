from typing import Literal

from pydantic import BaseModel, EmailStr


class QuestionnaireCompletion(BaseModel):
    answers: dict[int, int]
    destination: Literal["email", "finish"]
    email: EmailStr | None = None
    newsletter: bool = False
    profile: dict | None = None
    recommendations: list[dict] | None = None