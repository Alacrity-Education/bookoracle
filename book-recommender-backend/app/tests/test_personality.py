import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.services.personality_service import (
    load_questions,
    load_literary_profiles,
    calculate_dimensions,
    normalize_dimensions,
    center_dimensions,
    rank_literary_profiles,
    calculate_profile,
)

questions = load_questions("prose")
profiles = load_literary_profiles()


# Răspunsuri de test.
# -2 = Deloc
# -1 = Puțin
#  0 = Neutru
#  1 = Mult
#  2 = Foarte mult

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


# raw_scores, contributions = calculate_dimensions(
#     questions,
#     answers,
# )

# normalized_scores = normalize_dimensions(
#     raw_scores,
#     questions,
# )

# centered_scores = center_dimensions(
#     normalized_scores,
# )

# ranked_profiles = rank_literary_profiles(
#     normalized_scores,
#     profiles,
# )

profile_results = calculate_profile(
    answers,
)


print("\n==============================")
print("RAW SCORES")
print("==============================")

for dimension, score in sorted(profile_results["raw_scores"].items()):
    print(f"{dimension:15} {score:.6f}")


print("\n==============================")
print("NORMALIZED SCORES")
print("==============================")

for dimension, score in sorted(profile_results["normalized_scores"].items()):
    print(f"{dimension:15} {score:.0f}")


print("\n==============================")
print("CENTERED VECTOR")
print("==============================")

for contribution in profile_results["contributions"]:
    print(f"{contribution['question_id']}: {contribution['dimension']} = {contribution['contribution']:.4f}")


print("\n==============================")
print("RANKED LITERARY PROFILES")
print("==============================")

for index, profile in enumerate(profile_results["profiles"], start=1):

    print(
        f"{index}. "
        f"{profile['name']} "
        f"({profile['id']}) "
        f"-> {profile['similarity']:.6f}"
    )