#!/usr/bin/env python3
"""
Validate books.json and inspect the distribution of the 10 book dimensions.

Usage:
    python validate_books_json.py --input books.json

Optional:
    python validate_books_json.py --input books.json --top 5
    python validate_books_json.py --input books.json --json-report books_validation_report.json
"""

import argparse
import json
import math
import statistics
from collections import Counter
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

EXPECTED_DIMENSION_RANGE = (-1.0, 1.0)


def load_books(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("books.json must contain a top-level JSON array.")

    return data


def is_finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def percentile(values: list[float], p: float) -> float:
    """Linear-interpolated percentile without requiring NumPy."""
    if not values:
        return float("nan")

    values = sorted(values)
    if len(values) == 1:
        return values[0]

    position = (len(values) - 1) * p
    lower = math.floor(position)
    upper = math.ceil(position)

    if lower == upper:
        return values[lower]

    weight = position - lower
    return values[lower] * (1.0 - weight) + values[upper] * weight


def format_float(value: float) -> str:
    if not math.isfinite(value):
        return "n/a"
    return f"{value: .6f}"


def validate_structure(books: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    ids: Counter[str] = Counter()
    titles: Counter[str] = Counter()

    dimension_presence = Counter()
    dimension_invalid = Counter()
    dimension_out_of_range = Counter()

    score_values: Counter[Any] = Counter()

    for index, book in enumerate(books):
        prefix = f"Book #{index + 1}"

        if not isinstance(book, dict):
            errors.append(f"{prefix}: expected object, got {type(book).__name__}.")
            continue

        book_id = book.get("id")
        title = book.get("title")
        author = book.get("author")
        dimensions = book.get("dimensions")

        if not isinstance(book_id, str) or not book_id.strip():
            errors.append(f"{prefix}: missing/invalid 'id'.")
        else:
            ids[book_id] += 1

        if not isinstance(title, str) or not title.strip():
            errors.append(f"{prefix}: missing/invalid 'title'.")
        else:
            titles[title] += 1

        if not isinstance(author, str) or not author.strip():
            errors.append(f"{prefix}: missing/invalid 'author'.")

        if not isinstance(dimensions, dict):
            errors.append(f"{prefix}: missing/invalid 'dimensions' object.")
            continue

        actual_dimensions = set(dimensions.keys())
        expected_dimensions = set(DIMENSIONS)

        missing = expected_dimensions - actual_dimensions
        extra = actual_dimensions - expected_dimensions

        for dimension in missing:
            errors.append(f"{prefix} '{title}': missing dimension '{dimension}'.")

        for dimension in extra:
            warnings.append(f"{prefix} '{title}': unexpected dimension '{dimension}'.")

        for dimension in DIMENSIONS:
            if dimension not in dimensions:
                continue

            dimension_presence[dimension] += 1
            value = dimensions[dimension]

            if not is_finite_number(value):
                errors.append(
                    f"{prefix} '{title}': dimension '{dimension}' is not a finite number: {value!r}."
                )
                dimension_invalid[dimension] += 1
                continue

            value = float(value)

            if not (EXPECTED_DIMENSION_RANGE[0] <= value <= EXPECTED_DIMENSION_RANGE[1]):
                errors.append(
                    f"{prefix} '{title}': dimension '{dimension}'={value} "
                    f"is outside [-1, 1]."
                )
                dimension_out_of_range[dimension] += 1

        if "score" not in book:
            errors.append(f"{prefix} '{title}': missing 'score'.")
        else:
            score = book["score"]
            try:
                hash(score)
                score_values[score] += 1
            except TypeError:
                errors.append(f"{prefix} '{title}': unhashable 'score': {score!r}.")

    duplicate_ids = {k: v for k, v in ids.items() if v > 1}
    duplicate_titles = {k: v for k, v in titles.items() if v > 1}

    for book_id, count in duplicate_ids.items():
        errors.append(f"Duplicate id '{book_id}' appears {count} times.")

    for title, count in duplicate_titles.items():
        warnings.append(f"Duplicate title '{title}' appears {count} times.")

    return {
        "errors": errors,
        "warnings": warnings,
        "duplicate_ids": duplicate_ids,
        "duplicate_titles": duplicate_titles,
        "dimension_presence": dict(dimension_presence),
        "dimension_invalid": dict(dimension_invalid),
        "dimension_out_of_range": dict(dimension_out_of_range),
        "score_values": dict(score_values),
    }


def collect_distributions(books: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    distributions: dict[str, list[dict[str, Any]]] = {}

    for dimension in DIMENSIONS:
        rows = []

        for index, book in enumerate(books):
            dimensions = book.get("dimensions", {})
            value = dimensions.get(dimension)

            if not is_finite_number(value):
                continue

            rows.append(
                {
                    "index": index,
                    "id": book.get("id", ""),
                    "title": book.get("title", ""),
                    "author": book.get("author", ""),
                    "value": float(value),
                }
            )

        distributions[dimension] = rows

    return distributions


def print_structure_report(
    books: list[dict[str, Any]],
    validation: dict[str, Any],
) -> None:
    print("=" * 110)
    print("BOOKS.JSON VALIDATION")
    print("=" * 110)
    print(f"Books:              {len(books)}")
    print(f"Expected dimensions: {len(DIMENSIONS)}")
    print(f"Errors:             {len(validation['errors'])}")
    print(f"Warnings:           {len(validation['warnings'])}")
    print()

    print("-" * 110)
    print("STRUCTURE")
    print("-" * 110)

    all_present = all(
        validation["dimension_presence"].get(d, 0) == len(books)
        for d in DIMENSIONS
    )

    if all_present:
        print("✓ All 10 dimensions are present for every book.")
    else:
        print("✗ Some dimensions are missing.")
        for dimension in DIMENSIONS:
            count = validation["dimension_presence"].get(dimension, 0)
            if count != len(books):
                print(f"  {dimension:<15} {count}/{len(books)}")

    if not validation["duplicate_ids"]:
        print("✓ All book IDs are unique.")
    else:
        print("✗ Duplicate book IDs:")
        for book_id, count in validation["duplicate_ids"].items():
            print(f"  {book_id}: {count}")

    if validation["dimension_invalid"]:
        print("✗ Invalid/non-finite dimension values:")
        for dimension, count in validation["dimension_invalid"].items():
            print(f"  {dimension:<15} {count}")
    else:
        print("✓ No NaN, Infinity, null, or non-numeric dimension values.")

    if validation["dimension_out_of_range"]:
        print("✗ Values outside [-1, 1]:")
        for dimension, count in validation["dimension_out_of_range"].items():
            print(f"  {dimension:<15} {count}")
    else:
        print("✓ All dimension values are inside [-1, 1].")

    print()
    print("Score distribution:")
    for score, count in sorted(
        validation["score_values"].items(),
        key=lambda item: str(item[0]),
    ):
        print(f"  {score!r}: {count}")

    if validation["warnings"]:
        print()
        print("Warnings:")
        for warning in validation["warnings"][:20]:
            print(f"  - {warning}")
        if len(validation["warnings"]) > 20:
            print(f"  ... {len(validation['warnings']) - 20} more warnings")

    if validation["errors"]:
        print()
        print("Errors:")
        for error in validation["errors"][:30]:
            print(f"  - {error}")
        if len(validation["errors"]) > 30:
            print(f"  ... {len(validation['errors']) - 30} more errors")


def print_distribution_report(
    distributions: dict[str, list[dict[str, Any]]],
    top_n: int,
) -> dict[str, Any]:
    print()
    print("=" * 110)
    print("DIMENSION DISTRIBUTIONS")
    print("=" * 110)

    print(
        f"{'Dimension':<15}"
        f"{'N':>5}"
        f"{'Min':>11}"
        f"{'P10':>11}"
        f"{'Median':>11}"
        f"{'Mean':>11}"
        f"{'P90':>11}"
        f"{'Max':>11}"
        f"{'Std':>11}"
    )
    print("-" * 110)

    report: dict[str, Any] = {}

    for dimension in DIMENSIONS:
        rows = distributions[dimension]
        values = [row["value"] for row in rows]

        if not values:
            print(f"{dimension:<15}{0:>5}")
            report[dimension] = {"n": 0}
            continue

        mean = statistics.fmean(values)
        std = statistics.pstdev(values) if len(values) > 1 else 0.0

        stats = {
            "n": len(values),
            "min": min(values),
            "p10": percentile(values, 0.10),
            "median": statistics.median(values),
            "mean": mean,
            "p90": percentile(values, 0.90),
            "max": max(values),
            "std": std,
        }
        report[dimension] = stats

        print(
            f"{dimension:<15}"
            f"{len(values):>5}"
            f"{format_float(stats['min']):>11}"
            f"{format_float(stats['p10']):>11}"
            f"{format_float(stats['median']):>11}"
            f"{format_float(stats['mean']):>11}"
            f"{format_float(stats['p90']):>11}"
            f"{format_float(stats['max']):>11}"
            f"{format_float(stats['std']):>11}"
        )

    print()
    print("-" * 110)
    print("EXTREMES BY DIMENSION")
    print("-" * 110)

    for dimension in DIMENSIONS:
        rows = distributions[dimension]

        if not rows:
            continue

        lowest = sorted(rows, key=lambda row: row["value"])[:top_n]
        highest = sorted(rows, key=lambda row: row["value"], reverse=True)[:top_n]

        print()
        print(f"[{dimension}]")
        print(f"  LOWEST {top_n}:")

        for i, row in enumerate(lowest, 1):
            print(
                f"    {i:>2}. {row['value']:>9.6f}  "
                f"{row['title']} — {row['author']}"
            )

        print(f"  HIGHEST {top_n}:")
        for i, row in enumerate(highest, 1):
            print(
                f"    {i:>2}. {row['value']:>9.6f}  "
                f"{row['title']} — {row['author']}"
            )

    return report


def print_concentration_report(distributions: dict[str, list[dict[str, Any]]]) -> None:
    """
    Useful diagnostics for spotting axes that are too compressed or saturated.
    """
    print()
    print("-" * 110)
    print("RANGE / SATURATION CHECK")
    print("-" * 110)

    print(
        f"{'Dimension':<15}"
        f"{'Near -1':>12}"
        f"{'Near +1':>12}"
        f"{'Middle':>12}"
        f"{'Range':>12}"
    )
    print("-" * 110)

    for dimension in DIMENSIONS:
        rows = distributions[dimension]
        values = [row["value"] for row in rows]

        if not values:
            continue

        near_low = sum(v <= -0.90 for v in values)
        near_high = sum(v >= 0.90 for v in values)
        middle = sum(-0.10 < v < 0.10 for v in values)
        value_range = max(values) - min(values)

        print(
            f"{dimension:<15}"
            f"{near_low:>12}"
            f"{near_high:>12}"
            f"{middle:>12}"
            f"{value_range:>12.6f}"
        )

    print()
    print("Interpretation:")
    print("  Near -1 / +1: number of books strongly saturated at either extreme.")
    print("  Middle:        number of books close to neutral (-0.10, +0.10).")
    print("  Range:         max - min; very small ranges may indicate weak separation.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate books.json and inspect dimension distributions."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("books.json"),
        help="Path to books.json.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=5,
        help="Number of lowest/highest books to display per dimension.",
    )
    parser.add_argument(
        "--json-report",
        type=Path,
        default=None,
        help="Optional path for a machine-readable validation report.",
    )

    args = parser.parse_args()

    if args.top < 1:
        raise ValueError("--top must be >= 1")

    books = load_books(args.input)
    validation = validate_structure(books)

    print_structure_report(books, validation)

    distributions = collect_distributions(books)
    stats_report = print_distribution_report(distributions, args.top)
    print_concentration_report(distributions)

    report = {
        "input": str(args.input),
        "book_count": len(books),
        "dimensions": DIMENSIONS,
        "expected_range": list(EXPECTED_DIMENSION_RANGE),
        "validation": validation,
        "distributions": stats_report,
    }

    if args.json_report:
        args.json_report.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print()
        print(f"JSON report written to: {args.json_report}")

    print()
    if validation["errors"]:
        print("RESULT: FAIL — books.json contains validation errors.")
        raise SystemExit(1)

    print("RESULT: PASS — books.json structure and dimension values are valid.")


if __name__ == "__main__":
    main()