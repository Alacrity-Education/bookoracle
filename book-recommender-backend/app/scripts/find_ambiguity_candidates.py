#!/usr/bin/env python3
"""
Find candidate books for the ambiguity golden set.

The script reads the diagnostics JSON produced by generate_book_profiles.py,
excludes books already used in the ambiguity golden set, and prints the
lowest/highest scoring candidates.

Example:
    python find_ambiguity_candidates.py \
        --diagnostics book_profile_diagnostics_large.json \
        --golden golden_set.json \
        --top 20
"""

import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize_title(title: str) -> str:
    """Normalize titles enough to handle small formatting differences."""
    return " ".join(title.casefold().strip().split())


def get_books(data: Any) -> list[dict[str, Any]]:
    """
    Accept the diagnostics structures commonly produced by the project.

    Supports either:
      {"books": [...]}
    or a top-level list of books.
    """
    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        for key in ("books", "results", "profiles", "diagnostics"):
            value = data.get(key)
            if isinstance(value, list):
                return value

    raise ValueError(
        "Could not find a book list in the diagnostics JSON. "
        "Expected a top-level list or a 'books'/'results'/'profiles'/'diagnostics' key."
    )


def get_title(book: dict[str, Any]) -> str:
    return str(book.get("title", "")).strip()


def get_author(book: dict[str, Any]) -> str:
    return str(book.get("author", "")).strip()


def get_ambiguity(book: dict[str, Any]) -> float | None:
    """
    Read ambiguity from common diagnostics layouts.

    Expected project layout:
        book["raw"]["ambiguity"]

    Also accepts:
        book["dimensions"]["ambiguity"]
        book["ambiguity"]
    """
    candidates = []

    raw = book.get("raw")
    if isinstance(raw, dict):
        candidates.append(raw.get("ambiguity"))

    dimensions = book.get("dimensions")
    if isinstance(dimensions, dict):
        candidates.append(dimensions.get("ambiguity"))

    candidates.append(book.get("ambiguity"))

    for value in candidates:
        try:
            if value is not None:
                return float(value)
        except (TypeError, ValueError):
            pass

    return None


def get_golden_titles(golden: Any) -> set[str]:
    """
    Extract titles already used for ambiguity.

    Supports:
        {"axes": {"ambiguity": {"high": [...], "low": [...]}}}
    and a direct:
        {"ambiguity": {"high": [...], "low": [...]}}
    """
    axis = None

    if isinstance(golden, dict):
        axes = golden.get("axes")
        if isinstance(axes, dict):
            axis = axes.get("ambiguity")

        if axis is None:
            axis = golden.get("ambiguity")

    if not isinstance(axis, dict):
        raise ValueError(
            "Could not find the ambiguity golden set. "
            "Expected 'axes.ambiguity' or top-level 'ambiguity'."
        )

    titles: set[str] = set()

    for group in ("high", "low"):
        items = axis.get(group, [])
        if not isinstance(items, list):
            continue

        for item in items:
            if isinstance(item, str):
                titles.add(normalize_title(item))
            elif isinstance(item, dict):
                title = item.get("title")
                if title:
                    titles.add(normalize_title(str(title)))

    return titles


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Find candidate books for the ambiguity golden set."
    )
    parser.add_argument(
        "--diagnostics",
        type=Path,
        default=Path("book_profile_diagnostics_large.json"),
        help="Large-model diagnostics JSON.",
    )
    parser.add_argument(
        "--golden",
        type=Path,
        default=Path("golden_set.json"),
        help="Golden set JSON.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=20,
        help="Number of candidates to show for each side.",
    )
    parser.add_argument(
        "--include-used",
        action="store_true",
        help="Also show books already present in the ambiguity golden set.",
    )
    args = parser.parse_args()

    diagnostics = load_json(args.diagnostics)
    golden = load_json(args.golden)

    books = get_books(diagnostics)
    used_titles = get_golden_titles(golden)

    candidates = []

    for book in books:
        title = get_title(book)
        score = get_ambiguity(book)

        if not title or score is None:
            continue

        if not args.include_used and normalize_title(title) in used_titles:
            continue

        candidates.append(
            {
                "title": title,
                "author": get_author(book),
                "score": score,
            }
        )

    if not candidates:
        raise SystemExit("No ambiguity candidates found.")

    candidates.sort(key=lambda x: x["score"])

    low = candidates[: args.top]
    high = list(reversed(candidates[-args.top:]))

    print("=" * 105)
    print("AMBIGUITY GOLDEN SET CANDIDATES — LARGE MODEL")
    print("=" * 105)
    print(f"Diagnostics: {args.diagnostics}")
    print(f"Golden set:  {args.golden}")
    print(f"Available candidates after exclusion: {len(candidates)}")
    print(f"Excluded books already in ambiguity golden set: {len(books) - len(candidates)}")
    print()

    print("-" * 105)
    print(f"LOW CANDIDATES — lowest {args.top} ambiguity scores")
    print("-" * 105)
    print(f"{'#':>3}  {'Score':>10}  {'Title':<50}  Author")
    print("-" * 105)

    for i, book in enumerate(low, 1):
        print(
            f"{i:>3}  "
            f"{book['score']:>10.6f}  "
            f"{book['title'][:50]:<50}  "
            f"{book['author']}"
        )

    print()
    print("-" * 105)
    print(f"HIGH CANDIDATES — highest {args.top} ambiguity scores")
    print("-" * 105)
    print(f"{'#':>3}  {'Score':>10}  {'Title':<50}  Author")
    print("-" * 105)

    for i, book in enumerate(high, 1):
        print(
            f"{i:>3}  "
            f"{book['score']:>10.6f}  "
            f"{book['title'][:50]:<50}  "
            f"{book['author']}"
        )

    print()
    print("IMPORTANT:")
    print("These are candidates ranked by the current model, not automatic golden labels.")
    print("Choose replacements based on the literary definition of ambiguity.")
    print("For LOW, prefer clear/direct narratives without interpretation being central.")
    print("For HIGH, prefer books where multiple plausible interpretations are central to the work.")


if __name__ == "__main__":
    main()