import json
from pathlib import Path

from app.schemas.questionnaire import Questionnaire


BASE_DIR = Path(__file__).resolve().parent.parent / "data"
QUESTIONNAIRE_DIR = BASE_DIR / "questionnaires"


def get_questionnaire(category: str) -> Questionnaire:
    path = QUESTIONNAIRE_DIR / f"{category}.json"

    with open(path, encoding="utf-8") as file:
        data = json.load(file)

    return Questionnaire(**data)