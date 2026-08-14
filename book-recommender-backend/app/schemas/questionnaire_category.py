from enum import Enum

class QuestionnaireCategory(str, Enum):
    PROSE = "prose"
    POETRY = "poetry"