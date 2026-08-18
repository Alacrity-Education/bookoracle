#!/usr/bin/env python3
"""
Analyze correlations between the 10 book-profile dimensions.

Computes:
  - Pearson correlation matrix
  - Spearman correlation matrix
  - sorted dimension pairs by absolute correlation
  - summary statistics for each dimension

Outputs:
  - correlation_analysis.json
  - correlation_matrix_pearson.csv
  - correlation_matrix_spearman.csv
  - correlation_pairs.csv

Usage:
    python analyze_book_correlations.py --input books.json

Optional:
    python analyze_book_correlations.py \
        --input books.json \
        --output-dir correlation_analysis
"""

import argparse
import csv
import json
import math
import statistics
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


def load_books(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("books.json must contain a top-level JSON array.")

    return data


def rank_values(values: list[float]) -> list[float]:
    """
    Average-rank implementation, including tied values.
    """
    indexed = sorted(enumerate(values), key=lambda item: item[1])
    ranks = [0.0] * len(values)

    i = 0
    while i < len(indexed):
        j = i + 1
        while j < len(indexed) and indexed[j][1] == indexed[i][1]:
            j += 1

        # Ranks are 1-based; tied values receive their average rank.
        average_rank = ((i + 1) + j) / 2.0

        for k in range(i, j):
            original_index = indexed[k][0]
            ranks[original_index] = average_rank

        i = j

    return ranks


def pearson(x: list[float], y: list[float]) -> float:
    if len(x) != len(y) or len(x) < 2:
        return float("nan")

    mean_x = statistics.fmean(x)
    mean_y = statistics.fmean(y)

    centered_x = [value - mean_x for value in x]
    centered_y = [value - mean_y for value in y]

    numerator = sum(a * b for a, b in zip(centered_x, centered_y))
    denominator_x = math.sqrt(sum(a * a for a in centered_x))
    denominator_y = math.sqrt(sum(b * b for b in centered_y))

    denominator = denominator_x * denominator_y

    if denominator == 0:
        return float("nan")

    return numerator / denominator


def spearman(x: list[float], y: list[float]) -> float:
    return pearson(rank_values(x), rank_values(y))


def correlation_label(value: float) -> str:
    absolute = abs(value)

    if absolute >= 0.80:
        return "very strong"
    if absolute >= 0.60:
        return "strong"
    if absolute >= 0.40:
        return "moderate"
    if absolute >= 0.20:
        return "weak"
    return "very weak"


def build_dimension_values(
    books: list[dict[str, Any]],
) -> tuple[dict[str, list[float]], int]:
    values = {dimension: [] for dimension in DIMENSIONS}
    skipped = 0

    for book in books:
        dimensions = book.get("dimensions")

        if not isinstance(dimensions, dict):
            skipped += 1
            continue

        row: dict[str, float] = {}

        valid = True
        for dimension in DIMENSIONS:
            value = dimensions.get(dimension)

            if (
                not isinstance(value, (int, float))
                or isinstance(value, bool)
                or not math.isfinite(float(value))
            ):
                valid = False
                break

            row[dimension] = float(value)

        if not valid:
            skipped += 1
            continue

        for dimension in DIMENSIONS:
            values[dimension].append(row[dimension])

    return values, skipped


def write_matrix_csv(
    path: Path,
    dimensions: list[str],
    matrix: dict[str, dict[str, float]],
) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["dimension", *dimensions])

        for dimension in dimensions:
            writer.writerow(
                [
                    dimension,
                    *[
                        matrix[dimension][other]
                        for other in dimensions
                    ],
                ]
            )


def write_pairs_csv(path: Path, pairs: list[dict[str, Any]]) -> None:
    fieldnames = [
        "dimension_a",
        "dimension_b",
        "pearson",
        "spearman",
        "abs_pearson",
        "abs_spearman",
        "label_pearson",
        "label_spearman",
    ]

    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(pairs)


def print_matrix(
    title: str,
    dimensions: list[str],
    matrix: dict[str, dict[str, float]],
) -> None:
    print()
    print("=" * 110)
    print(title)
    print("=" * 110)

    short_names = {
        dimension: dimension[:10]
        for dimension in dimensions
    }

    print(f"{'Dimension':<15}", end="")
    for dimension in dimensions:
        print(f"{short_names[dimension]:>11}", end="")
    print()

    print("-" * 125)

    for dimension in dimensions:
        print(f"{dimension:<15}", end="")

        for other in dimensions:
            value = matrix[dimension][other]
            if math.isnan(value):
                print(f"{'n/a':>11}", end="")
            else:
                print(f"{value:>11.3f}", end="")

        print()


def print_pairs(pairs: list[dict[str, Any]], limit: int = 20) -> None:
    print()
    print("=" * 110)
    print(f"STRONGEST CORRELATION PAIRS — TOP {min(limit, len(pairs))}")
    print("=" * 110)

    print(
        f"{'Pair':<32}"
        f"{'Pearson':>11}"
        f"{'Spearman':>11}"
        f"{'|Pearson|':>11}"
        f"{'|Spearman|':>12}"
    )
    print("-" * 110)

    for pair in pairs[:limit]:
        name = f"{pair['dimension_a']} ↔ {pair['dimension_b']}"

        print(
            f"{name:<32}"
            f"{pair['pearson']:>11.3f}"
            f"{pair['spearman']:>11.3f}"
            f"{pair['abs_pearson']:>11.3f}"
            f"{pair['abs_spearman']:>12.3f}"
        )

    print()
    print("Interpretation:")
    print("  Very strong: |r| >= 0.80")
    print("  Strong:      0.60 <= |r| < 0.80")
    print("  Moderate:    0.40 <= |r| < 0.60")
    print("  Weak:        0.20 <= |r| < 0.40")
    print("  Very weak:   |r| < 0.20")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analyze Pearson and Spearman correlations between book dimensions."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("books.json"),
        help="Path to books.json.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("."),
        help="Directory for generated correlation reports.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=20,
        help="Number of strongest pairs to print.",
    )

    args = parser.parse_args()

    if args.top < 1:
        raise ValueError("--top must be >= 1")

    books = load_books(args.input)
    values, skipped = build_dimension_values(books)

    n = len(values[DIMENSIONS[0]])

    if n < 2:
        raise ValueError("Not enough valid books for correlation analysis.")

    pearson_matrix = {
        dimension: {}
        for dimension in DIMENSIONS
    }

    spearman_matrix = {
        dimension: {}
        for dimension in DIMENSIONS
    }

    for dimension_a in DIMENSIONS:
        for dimension_b in DIMENSIONS:
            pearson_matrix[dimension_a][dimension_b] = pearson(
                values[dimension_a],
                values[dimension_b],
            )
            spearman_matrix[dimension_a][dimension_b] = spearman(
                values[dimension_a],
                values[dimension_b],
            )

    pairs: list[dict[str, Any]] = []

    for i, dimension_a in enumerate(DIMENSIONS):
        for dimension_b in DIMENSIONS[i + 1:]:
            pearson_value = pearson_matrix[dimension_a][dimension_b]
            spearman_value = spearman_matrix[dimension_a][dimension_b]

            pairs.append(
                {
                    "dimension_a": dimension_a,
                    "dimension_b": dimension_b,
                    "pearson": pearson_value,
                    "spearman": spearman_value,
                    "abs_pearson": abs(pearson_value),
                    "abs_spearman": abs(spearman_value),
                    "label_pearson": correlation_label(pearson_value),
                    "label_spearman": correlation_label(spearman_value),
                }
            )

    # Sort by the stronger absolute relationship of the two coefficients.
    pairs.sort(
        key=lambda pair: max(
            pair["abs_pearson"],
            pair["abs_spearman"],
        ),
        reverse=True,
    )

    dimension_stats = {}

    for dimension in DIMENSIONS:
        dimension_values = values[dimension]

        dimension_stats[dimension] = {
            "n": len(dimension_values),
            "mean": statistics.fmean(dimension_values),
            "median": statistics.median(dimension_values),
            "std": statistics.pstdev(dimension_values),
            "min": min(dimension_values),
            "max": max(dimension_values),
        }

    args.output_dir.mkdir(parents=True, exist_ok=True)

    json_path = args.output_dir / "correlation_analysis.json"
    pearson_csv = args.output_dir / "correlation_matrix_pearson.csv"
    spearman_csv = args.output_dir / "correlation_matrix_spearman.csv"
    pairs_csv = args.output_dir / "correlation_pairs.csv"

    report = {
        "input": str(args.input),
        "book_count": len(books),
        "valid_book_count": n,
        "skipped_books": skipped,
        "dimensions": DIMENSIONS,
        "dimension_stats": dimension_stats,
        "pearson_matrix": pearson_matrix,
        "spearman_matrix": spearman_matrix,
        "pairs_sorted_by_absolute_correlation": pairs,
    }

    json_path.write_text(
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    write_matrix_csv(
        pearson_csv,
        DIMENSIONS,
        pearson_matrix,
    )

    write_matrix_csv(
        spearman_csv,
        DIMENSIONS,
        spearman_matrix,
    )

    write_pairs_csv(pairs_csv, pairs)

    print(f"Books analyzed: {n}")
    if skipped:
        print(f"Books skipped:  {skipped}")

    print_matrix(
        "PEARSON CORRELATION MATRIX",
        DIMENSIONS,
        pearson_matrix,
    )

    print_matrix(
        "SPEARMAN CORRELATION MATRIX",
        DIMENSIONS,
        spearman_matrix,
    )

    print_pairs(pairs, args.top)

    print()
    print("=" * 110)
    print("GENERATED FILES")
    print("=" * 110)
    print(f"JSON report:       {json_path}")
    print(f"Pearson CSV:       {pearson_csv}")
    print(f"Spearman CSV:      {spearman_csv}")
    print(f"Pairs CSV:         {pairs_csv}")


if __name__ == "__main__":
    main()