import math
import json
from typing import Any
from pathlib import Path


# ============================================================
# DATA
# ============================================================

DATA_DIR_PROFILES = Path(__file__).resolve().parent.parent / "data"
DATA_DIR_QUESTIONNAIRES = Path(__file__).resolve().parent.parent / "data"

def load_literary_profiles() -> list[dict[str, Any]]:
    print("DATA_DIR_PROFILES:", DATA_DIR_PROFILES)
    path = DATA_DIR_PROFILES / "profiles" / "literary_profiles.json"

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)

def load_questions(category: str = "prose") -> list[dict[str, Any]]:
    print("DATA_DIR_QUESTIONNAIRES:", DATA_DIR_QUESTIONNAIRES)
    path = DATA_DIR_QUESTIONNAIRES / "questionnaires" / f"{category}.json"

    with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)
        
    return data["questions"]


# ============================================================
# DIMENSIONS
# ============================================================

def calculate_dimensions(
        questions: list[dict[str, Any]],
        answers: dict[int, int]
) -> tuple[dict[str, float], list[dict[str, Any]]]:
    scores: dict[str, float] = {}
    contributions: list[dict[str, Any]] = []

    for question in questions:
        question_id = question["id"]

        answer = answers.get(question_id)

        if answer is None:
            continue

        importance = question["importance"]
        weights = question["weights"]

        for dimension, weight in weights.items():

            contribution = (
                answer
                * weight
                * importance
            )

            scores[dimension] = (
                scores.get(dimension, 0.0)
                + contribution
            )

            contributions.append({
                "question_id": question_id,
                "dimension": dimension,
                "contribution": contribution,
            })

    return scores, contributions


def normalize_dimensions(
    raw_scores: dict[str, float],
    questions: list[dict[str, Any]],
) -> dict[str, float]:

    max_scores: dict[str, float] = {}

    for question in questions:

        importance = question["importance"]
        weights = question["weights"]

        for dimension, weight in weights.items():

            max_scores[dimension] = (
                max_scores.get(dimension, 0.0)
                + abs(weight)
                * importance
                * 2
            )

    normalized: dict[str, float] = {}

    for dimension, raw_score in raw_scores.items():

        max_score = max_scores.get(dimension, 0.0)

        if max_score == 0:
            normalized[dimension] = 50.0
            continue

        value = (
            (raw_score + max_score)
            / (2 * max_score)
        ) * 100

        normalized[dimension] = value

    return normalized


# ============================================================
# VECTOR OPERATIONS
# ============================================================

def center_dimensions(
    normalized_scores: dict[str, float],
) -> dict[str, float]:

    centered: dict[str, float] = {}

    for dimension, score in normalized_scores.items():

        centered[dimension] = (
            score - 50
        ) / 50

    return centered


def cosine_similarity(
    vector_a: dict[str, float],
    vector_b: dict[str, float],
) -> float:

    dot_product = 0.0
    magnitude_a = 0.0
    magnitude_b = 0.0

    dimensions = set(vector_a) | set(vector_b)

    for dimension in dimensions:

        value_a = vector_a.get(dimension, 0.0)
        value_b = vector_b.get(dimension, 0.0)

        dot_product += value_a * value_b

        magnitude_a += value_a ** 2
        magnitude_b += value_b ** 2

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return (
        dot_product
        / (
            math.sqrt(magnitude_a)
            * math.sqrt(magnitude_b)
        )
    )


# ============================================================
# LITERARY PROFILE RANKING
# ============================================================

def rank_literary_profiles(
    normalized_scores: dict[str, float],
    profiles: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    user_vector = center_dimensions(
        normalized_scores
    )

    ranked_profiles = []

    for profile in profiles:

        similarity = cosine_similarity(
            user_vector,
            profile["dimensions"],
        )

        ranked_profiles.append({
            "id": profile["id"],
            "name": profile["name"],
            "description": profile["description"],
            "similarity": similarity,
        })

    ranked_profiles.sort(
        key=lambda profile: profile["similarity"],
        reverse=True,
    )

    return ranked_profiles


# ===========================================================
# CALCULATION PIPELINE
# ===========================================================

def calculate_profile(
    answers: dict[int, int],
    category: str = "prose",
) -> dict[str, Any]:

    questions = load_questions(category)
    profiles = load_literary_profiles()

    raw_scores, contributions = calculate_dimensions(
        questions,
        answers,
    )

    normalized_scores = normalize_dimensions(
        raw_scores,
        questions,
    )

    ranked_profiles = rank_literary_profiles(
        normalized_scores,
        profiles,
    )

    return {
        "raw_scores": raw_scores,
        "normalized_scores": normalized_scores,
        "contributions": contributions,
        "profiles": ranked_profiles,
    }