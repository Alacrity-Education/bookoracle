import csv
import uuid
from datetime import datetime, timezone
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"

PARTICIPATIONS_PATH = DATA_DIR / "participations.csv"
NEWSLETTER_PATH = DATA_DIR / "newsletter.csv"


PARTICIPATION_FIELDS = [
    "participant_id",
    "timestamp",
    "category",
    "destination",
    *[f"answer_{i}" for i in range(1, 21)],
]

NEWSLETTER_FIELDS = [
    "participant_id",
    "timestamp",
    "email",
]


def save_participation(
    category: str,
    answers: dict[int, int],
    destination: str,
    email: str | None = None,
    newsletter: bool = False,
) -> None:

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    participant_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    participation_row = {
        "participant_id": participant_id,
        "timestamp": timestamp,
        "category": category,
        "destination": destination,
    }

    for question_id in range(1, 21):
        participation_row[f"answer_{question_id}"] = answers.get(question_id)

    file_exists = PARTICIPATIONS_PATH.exists()

    with open(
        PARTICIPATIONS_PATH,
        "a",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=PARTICIPATION_FIELDS,
        )

        if not file_exists:
            writer.writeheader()

        writer.writerow(participation_row)
    
    if newsletter and email:
        newsletter_file_exists = NEWSLETTER_PATH.exists()

        newsletter_row = {
            "participant_id": participant_id,
            "timestamp": timestamp,
            "email": email,
        }

        with open(
            NEWSLETTER_PATH,
            "a",
            newline="",
            encoding="utf-8",
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=NEWSLETTER_FIELDS,
            )

            if not newsletter_file_exists:
                writer.writeheader()

            writer.writerow(newsletter_row)

    return participant_id