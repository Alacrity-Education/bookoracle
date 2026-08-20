#!/usr/bin/env python3

"""
Generate literary profile scores for all books in LIRA.

Input:
    books.json
    literary_profiles.json

Output:
    books_profile.json

For each book, the script calculates the cosine similarity between
the book's 10 literary dimensions and each literary profile.

Both books and literary profiles use the same [-1, 1] dimension space.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any


DIMENSIONS = [
    "curiosity",
    "reflection",
    "complexity",
    "emotionality",
    "characters",
    "pace",
    "imagination",
    "realism",
    "ambiguity",
    "culture",
]


# ============================================================
# DATA LOADING
# ============================================================

def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_books(path: Path) -> list[dict[str, Any]]:
    data = load_json(path)

    if not isinstance(data, list):
        raise ValueError(
            f"{path} must contain a top-level JSON array."
        )

    return data


def load_profiles(path: Path) -> list[dict[str, Any]]:
    data = load_json(path)

    if not isinstance(data, list):
        raise ValueError(
            f"{path} must contain a top-level JSON array."
        )

    return data


# ============================================================
# VALIDATION
# ============================================================

def validate_dimensions(
    dimensions: dict[str, Any],
    source_name: str,
) -> None:

    expected = set(DIMENSIONS)
    actual = set(dimensions.keys())

    missing = expected - actual
    extra = actual - expected

    if missing:
        raise ValueError(
            f"{source_name}: missing dimensions: "
            + ", ".join(sorted(missing))
        )

    if extra:
        raise ValueError(
            f"{source_name}: unexpected dimensions: "
            + ", ".join(sorted(extra))
        )

    for dimension in DIMENSIONS:
        value = dimensions[dimension]

        if (
            not isinstance(value, (int, float))
            or isinstance(value, bool)
            or not math.isfinite(float(value))
        ):
            raise ValueError(
                f"{source_name}: invalid value for "
                f"'{dimension}': {value}"
            )

        if not -1.0 <= float(value) <= 1.0:
            raise ValueError(
                f"{source_name}: value for '{dimension}' "
                f"is outside [-1, 1]: {value}"
            )


# ============================================================
# VECTOR OPERATIONS
# ============================================================

def cosine_similarity(
    vector_a: dict[str, float],
    vector_b: dict[str, float],
) -> float:

    dot_product = 0.0
    magnitude_a = 0.0
    magnitude_b = 0.0

    for dimension in DIMENSIONS:

        value_a = float(vector_a[dimension])
        value_b = float(vector_b[dimension])

        dot_product += value_a * value_b
        magnitude_a += value_a ** 2
        magnitude_b += value_b ** 2

    if magnitude_a == 0.0 or magnitude_b == 0.0:
        return 0.0

    return (
        dot_product
        / (
            math.sqrt(magnitude_a)
            * math.sqrt(magnitude_b)
        )
    )


# ============================================================
# BOOK PROFILE GENERATION
# ============================================================

def generate_book_profiles(
    books: list[dict[str, Any]],
    literary_profiles: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    generated = []

    for index, book in enumerate(books):

        book_id = book.get("id")
        title = book.get("title")
        author = book.get("author")
        dimensions = book.get("dimensions")

        if not isinstance(book_id, str) or not book_id:
            raise ValueError(
                f"Book #{index + 1}: missing 'id'."
            )

        if not isinstance(title, str) or not title:
            raise ValueError(
                f"Book #{index + 1}: missing 'title'."
            )

        if not isinstance(author, str) or not author:
            raise ValueError(
                f"Book #{index + 1}: missing 'author'."
            )

        if not isinstance(dimensions, dict):
            raise ValueError(
                f"Book '{book_id}': missing 'dimensions'."
            )

        validate_dimensions(
            dimensions,
            f"Book '{book_id}'",
        )

        profile_scores = {}

        for profile in literary_profiles:

            profile_id = profile.get("id")
            profile_dimensions = profile.get("dimensions")

            if not isinstance(profile_id, str) or not profile_id:
                raise ValueError(
                    "Literary profile is missing 'id'."
                )

            if not isinstance(profile_dimensions, dict):
                raise ValueError(
                    f"Profile '{profile_id}' is missing "
                    "'dimensions'."
                )

            validate_dimensions(
                profile_dimensions,
                f"Profile '{profile_id}'",
            )

            similarity = cosine_similarity(
                dimensions,
                profile_dimensions,
            )

            profile_scores[profile_id] = round(
                similarity,
                6,
            )

        generated.append(
            {
                "id": book_id,
                "title": title,
                "author": author,
                "profiles": profile_scores,
            }
        )

    return generated


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    parser = argparse.ArgumentParser(
        description=(
            "Generate literary profile scores for books "
            "from books.json."
        )
    )

    parser.add_argument(
        "--books",
        type=Path,
        default=Path("books.json"),
        help="Path to books.json.",
    )

    parser.add_argument(
        "--profiles",
        type=Path,
        default=Path("literary_profiles.json"),
        help="Path to literary_profiles.json.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("books_profile.json"),
        help="Path to generated books_profile.json.",
    )

    args = parser.parse_args()

    if not args.books.exists():
        raise FileNotFoundError(
            f"Books file not found: {args.books}"
        )

    if not args.profiles.exists():
        raise FileNotFoundError(
            f"Literary profiles file not found: {args.profiles}"
        )

    print(f"Loading books: {args.books}")
    books = load_books(args.books)

    print(f"Loading literary profiles: {args.profiles}")
    literary_profiles = load_profiles(args.profiles)

    print(f"Books loaded: {len(books)}")
    print(
        f"Literary profiles loaded: "
        f"{len(literary_profiles)}"
    )

    generated = generate_book_profiles(
        books,
        literary_profiles,
    )

    args.output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    args.output.write_text(
        json.dumps(
            generated,
            ensure_ascii=False,
            indent=4,
        ),
        encoding="utf-8",
    )

    print()
    print(
        f"Generated {len(generated)} book profiles."
    )
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()