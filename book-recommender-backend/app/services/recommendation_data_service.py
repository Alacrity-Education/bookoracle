import json
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_books() -> list[dict[str, Any]]:
    path = DATA_DIR / "books" / "books.json"

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def load_book_profiles() -> list[dict[str, Any]]:
    path = DATA_DIR / "profiles" / "books_profiles.json"

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)