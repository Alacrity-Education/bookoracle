import json

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.services.personality_service import calculate_profile
from app.services.recomendation_service import rank_books


BASE_DIR = Path(__file__).resolve().parent.parent

BOOKS_PATH = BASE_DIR / "data" / "books" / "books.json"
BOOKS_PROFILES_PATH = BASE_DIR / "data" / "profiles" / "books_profiles.json"


def load_json(path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


# ============================================================
# 1. Generate real user profile
# ============================================================

# Folosim exact răspunsurile din testul automat.
answers = {
    1: 2,
    2: 1,
    3: 0,
    4: -1,
    5: 2,
    6: -2,
    7: 1,
    8: -1,
    9: 2,
    10: 1,
    11: 0,
    12: 2,
    13: 1,
    14: 2,
    15: 1,
    16: -1,
    17: 2,
    18: 2,
    19: 1,
    20: -1,
}


profile_results = calculate_profile(answers)


# ============================================================
# 2. Convert normalized dimensions [0,100] → [-1,1]
# ============================================================

user_dimensions = {
    dimension: (score - 50) / 50
    for dimension, score
    in profile_results["normalized_scores"].items()
}


# ============================================================
# 3. Get literary profiles
# ============================================================

user_profiles = {
    profile["id"]: profile["similarity"]
    for profile in profile_results["profiles"]
}


# ============================================================
# 4. Load books
# ============================================================

books = load_json(BOOKS_PATH)
books_profiles = load_json(BOOKS_PROFILES_PATH)


# ============================================================
# 5. Rank
# ============================================================

recommendations = rank_books(
    user_dimensions=user_dimensions,
    user_profiles=user_profiles,
    books=books,
    books_profiles=books_profiles,
    top_n=10,
)


# ============================================================
# 6. Display results
# ============================================================

print()
print("=" * 80)
print("USER PROFILE")
print("=" * 80)

for dimension, value in user_dimensions.items():
    print(f"{dimension:<15} {value:.4f}")

print()
print("Literary profiles:")

for profile, value in user_profiles.items():
    print(f"{profile:<15} {value:.6f}")


print()
print("=" * 80)
print("TOP 10 RECOMMENDATIONS")
print("=" * 80)

for book in recommendations:
    print(
        f"{book['rank']:>2}. "
        f"{book['title']} — {book['author']}"
    )
    print(
        f"    Dimension: {book['dimension_score']:.6f} | "
        f"Profile: {book['profile_score']:.6f} | "
        f"Base: {book['base_score']:.6f} | "
        f"Bonus: ×{book['source_bonus']:.2f} | "
        f"Final: {book['final_score']:.6f}"
    )