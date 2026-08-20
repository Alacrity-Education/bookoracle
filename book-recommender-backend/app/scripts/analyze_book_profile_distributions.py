import json
import statistics
from pathlib import Path


BOOKS_PROFILES_PATH = Path("../data/profiles/books_profiles.json")


def load_books_profiles():
    with open(BOOKS_PROFILES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_profile_names(books):
    profiles = set()

    for book in books:
        book_profiles = book.get("profiles", {})

        if isinstance(book_profiles, dict):
            profiles.update(book_profiles.keys())

    return sorted(profiles)


def analyze_profile(books, profile_name):
    values = []

    for book in books:
        profiles = book.get("profiles", {})

        if profile_name not in profiles:
            continue

        value = profiles[profile_name]

        if isinstance(value, (int, float)):
            values.append({
                "title": book.get("title", "Unknown"),
                "value": float(value)
            })

    if not values:
        return None

    scores = [item["value"] for item in values]

    sorted_values = sorted(values, key=lambda x: x["value"], reverse=True)

    return {
        "count": len(scores),
        "min": min(scores),
        "max": max(scores),
        "mean": statistics.mean(scores),
        "median": statistics.median(scores),
        "std": statistics.stdev(scores) if len(scores) > 1 else 0.0,
        "top": sorted_values[:5],
        "bottom": sorted_values[-5:]
    }


def print_number(value):
    return f"{value:.4f}"


def print_profile_analysis(profile_name, analysis):
    print("=" * 70)
    print(f"PROFILE: {profile_name.upper()}")
    print("=" * 70)

    print(f"Books analyzed : {analysis['count']}")
    print(f"Minimum        : {print_number(analysis['min'])}")
    print(f"Maximum        : {print_number(analysis['max'])}")
    print(f"Mean           : {print_number(analysis['mean'])}")
    print(f"Median         : {print_number(analysis['median'])}")
    print(f"Std deviation  : {print_number(analysis['std'])}")

    print("\nTop 5 books:")
    for index, book in enumerate(analysis["top"], start=1):
        print(
            f"  {index}. "
            f"{book['title']} "
            f"({print_number(book['value'])})"
        )

    print("\nBottom 5 books:")
    for index, book in enumerate(analysis["bottom"], start=1):
        print(
            f"  {index}. "
            f"{book['title']} "
            f"({print_number(book['value'])})"
        )

    print()


def main():
    print("Loading books profiles...")

    books = load_books_profiles()

    if not isinstance(books, list):
        raise ValueError(
            "books_profiles.json must contain a list of books."
        )

    print(f"Books loaded: {len(books)}")

    profile_names = get_profile_names(books)

    if not profile_names:
        raise ValueError("No profiles found in books_profiles.json.")

    print(f"Profiles found: {len(profile_names)}")
    print("Profiles:", ", ".join(profile_names))
    print()

    for profile_name in profile_names:
        analysis = analyze_profile(books, profile_name)

        if analysis is None:
            print(f"No valid data for profile: {profile_name}")
            continue

        print_profile_analysis(profile_name, analysis)


if __name__ == "__main__":
    main()