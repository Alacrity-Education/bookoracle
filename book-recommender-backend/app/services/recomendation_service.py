from __future__ import annotations

import math
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

LITERARY_PROFILES = [
    "explorer",
    "analyst",
    "empath",
    "adventurer",
    "realist",
    "visionary",
]

DIMENSION_SCORE_WEIGHT = 0.85
PROFILE_SCORE_WEIGHT = 0.15

SOURCE_BONUS = {
    1: 1.00,
    2: 1.05,
}

def calculate_dimension_score(
    user_dimensions: dict[str, float],
    book_dimensions: dict[str, float],
) -> dict[str, Any]:

    similarities = {}
    total_similarity = 0.0

    for dimension in DIMENSIONS:
        user_value = user_dimensions[dimension]
        book_value = book_dimensions[dimension]

        similarity = 1.0 - (
            abs(user_value - book_value) / 2.0
        )

        similarities[dimension] = {
            "user": user_value,
            "book": book_value,
            "similarity": similarity,
        }

        total_similarity += similarity

    score = total_similarity / len(DIMENSIONS)

    return {
        "score": score,
        "dimensions": similarities,
    }


def cosine_similarity(
    vector_a: list[float],
    vector_b: list[float],
) -> float:
    """
    Calculate cosine similarity between two vectors.
    """

    if len(vector_a) != len(vector_b):
        raise ValueError(
            "Vectors must have the same length."
        )

    dot_product = sum(
        a * b
        for a, b in zip(vector_a, vector_b)
    )

    magnitude_a = math.sqrt(
        sum(a * a for a in vector_a)
    )

    magnitude_b = math.sqrt(
        sum(b * b for b in vector_b)
    )

    if magnitude_a == 0.0 or magnitude_b == 0.0:
        return 0.0

    return dot_product / (
        magnitude_a * magnitude_b
    )


def calculate_profile_score(
    user_profiles: dict[str, float],
    book_profiles: dict[str, float],
) -> dict[str, Any]:
    """
    Calculate the compatibility between the user's
    literary-profile vector and the book's literary-profile vector.

    The six profiles are compared as a single vector:

        [explorer, analyst, empath, adventurer, realist, visionary]

    Cosine similarity is in [-1, 1].

    It is converted to [0, 1]:

        profile_score = (cosine + 1) / 2
    """

    user_vector = [
        user_profiles[profile]
        for profile in LITERARY_PROFILES
    ]

    book_vector = [
        book_profiles[profile]
        for profile in LITERARY_PROFILES
    ]

    profile_cosine = cosine_similarity(
        user_vector,
        book_vector,
    )

    profile_score = (
        profile_cosine + 1.0
    ) / 2.0

    return {
        "score": profile_score,
        "cosine": profile_cosine,
        "user_profiles": {
            profile: user_profiles[profile]
            for profile in LITERARY_PROFILES
        },
        "book_profiles": {
            profile: book_profiles[profile]
            for profile in LITERARY_PROFILES
        },
    }


def calculate_base_score(
    dimension_score: float,
    profile_score: float,
) -> dict[str, float]:
    """
    Combine dimension and literary-profile compatibility.

    Dimension compatibility has a weight of 85%.
    Literary-profile compatibility has a weight of 15%.
    """

    base_score = (
        DIMENSION_SCORE_WEIGHT * dimension_score
        + PROFILE_SCORE_WEIGHT * profile_score
    )

    return {
        "dimension_score": dimension_score,
        "profile_score": profile_score,
        "base_score": base_score,
    }


def calculate_source_bonus(
    book_source_score: int,
) -> float:
    """
    Return the source-priority multiplier for a book.

    score = 1 -> no bonus
    score = 2 -> 5% bonus
    """

    if book_source_score not in SOURCE_BONUS:
        raise ValueError(
            f"Invalid book source score: {book_source_score}. "
            "Expected 1 or 2."
        )

    return SOURCE_BONUS[book_source_score]


def calculate_book_score(
    user_dimensions: dict[str, float],
    user_profiles: dict[str, float],
    book: dict[str, Any],
    book_profiles: dict[str, float],
) -> dict[str, Any]:
    """
    Calculate the final recommendation score for one book.

    The score consists of:

        1. Dimension Score
        2. Literary Profile Score
        3. Weighted Base Score
        4. Source-priority bonus
        5. Final Score

    Final formula:

        base_score =
            0.85 * dimension_score
            + 0.15 * profile_score

        final_score =
            base_score * source_bonus
    """

    # --------------------------------------------------------
    # 1. Dimension Score
    # --------------------------------------------------------

    dimension_result = calculate_dimension_score(
        user_dimensions=user_dimensions,
        book_dimensions=book["dimensions"]
    )

    dimension_score = dimension_result["score"]

    # --------------------------------------------------------
    # 2. Literary Profile Score
    # --------------------------------------------------------

    profile_result = calculate_profile_score(
        user_profiles=user_profiles,
        book_profiles=book_profiles,
    )

    profile_score = profile_result["score"]

    # --------------------------------------------------------
    # 3. Base Score
    # --------------------------------------------------------

    base_result = calculate_base_score(
        dimension_score=dimension_score,
        profile_score=profile_score,
    )

    base_score = base_result["base_score"]

    # --------------------------------------------------------
    # 4. Source Bonus
    # --------------------------------------------------------

    source_bonus = calculate_source_bonus(
        book_source_score=book["score"],
    )

    # --------------------------------------------------------
    # 5. Final Score
    # --------------------------------------------------------

    final_score = base_score * source_bonus

    return {
        "book_id": book["id"],
        "title": book["title"],
        "author": book["author"],

        "dimension_score": dimension_score,
        "profile_score": profile_score,
        "base_score": base_score,

        "source_score": book["score"],
        "source_bonus": source_bonus,

        "final_score": final_score,

        "dimension_details": dimension_result["dimensions"],

        "profile_details": {
            "cosine": profile_result["cosine"],
            "user_profiles": profile_result["user_profiles"],
            "book_profiles": profile_result["book_profiles"],
        },
    }


def rank_books(
    user_dimensions: dict[str, float],
    user_profiles: dict[str, float],
    books: list[dict[str, Any]],
    books_profiles: list[dict[str, Any]],
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """
    Rank all books according to their compatibility with a user.

    Books are scored using:

        Dimension Score
        Profile Score
        Base Score
        Source Bonus
        Final Score

    Results are sorted by final_score in descending order.

    Args:
        user_dimensions:
            User's 10 literary dimensions in [-1, 1].

        user_profiles:
            User's 6 literary-profile scores.

        books:
            Books loaded from books.json.

        books_profiles:
            Precomputed literary-profile scores loaded from
            books_profiles.json.

        top_n:
            Number of recommendations to return.

    Returns:
        A list containing the top_n ranked books.
    """

    if top_n <= 0:
        raise ValueError(
            "top_n must be greater than zero."
        )

    # --------------------------------------------------------
    # Create a lookup table for precomputed book profiles
    # --------------------------------------------------------

    profiles_by_book_id = {
        book_profile["id"]: book_profile["profiles"]
        for book_profile in books_profiles
    }

    ranked_books = []

    # --------------------------------------------------------
    # Score every book
    # --------------------------------------------------------

    for book in books:
        book_id = book["id"]

        if book_id not in profiles_by_book_id:
            raise ValueError(
                f"No precomputed profile found for book "
                f"'{book_id}'."
            )

        book_profiles = profiles_by_book_id[book_id]

        result = calculate_book_score(
            user_dimensions=user_dimensions,
            user_profiles=user_profiles,
            book=book,
            book_profiles=book_profiles,
        )

        ranked_books.append(result)

    # --------------------------------------------------------
    # Sort by final score
    # --------------------------------------------------------

    ranked_books.sort(
        key=lambda book: book["final_score"],
        reverse=True,
    )

    # --------------------------------------------------------
    # Assign rank
    # --------------------------------------------------------

    for rank, book in enumerate(
        ranked_books[:top_n],
        start=1,
    ):
        book["rank"] = rank

    return ranked_books[:top_n]

