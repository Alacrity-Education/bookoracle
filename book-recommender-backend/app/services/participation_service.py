import csv
from datetime import datetime, timezone
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"

PARTICIPATIONS_PATH = DATA_DIR / "participations.csv"


FIELDNAMES = [
    "timestamp",
    "category",
    "destination",
    *[f"answer_{i}" for i in range(1, 21)],
]


def save_participation(
    category: str,
    answers: dict[int, int],
    destination: str,
) -> None:

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    file_exists = PARTICIPATIONS_PATH.exists()

    row = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "category": category,
        "destination": destination,
    }

    for question_id in range(1, 21):
        row[f"answer_{question_id}"] = answers.get(question_id)

    with open(
        PARTICIPATIONS_PATH,
        "a",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=FIELDNAMES,
        )

        if not file_exists:
            writer.writeheader()

        writer.writerow(row)