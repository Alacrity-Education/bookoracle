#!/usr/bin/env python3
"""
Evaluate LIRA book-profile models against a human-defined golden set.

Example:
    python evaluate_golden_set.py \
        --golden golden_set.json \
        --base book_profile_diagnostics_base.json \
        --large book_profile_diagnostics_large.json

The evaluator uses RAW axis scores. It intentionally does not use the
provisional normalized values from generate_book_profiles.py.

For every axis it reports:
- average HIGH score
- average LOW score
- separation (HIGH - LOW)
- pairwise accuracy: fraction of HIGH/LOW pairs where HIGH > LOW
- overlap / ambiguous examples
- individual predictions and failures

Outputs:
    golden_set_evaluation.json
    golden_set_evaluation.csv
    golden_set_misclassifications.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from pathlib import Path
from statistics import mean

import numpy as np


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", str(value)).lower()
    value = value.replace("’", "'").replace("–", "-").replace("—", "-")
    value = re.sub(r"[^a-z0-9ăâîșțşţà-ž\s-]", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def make_key(title: str, author: str) -> str:
    return f"{normalize_text(title)}|{normalize_text(author)}"


def load_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def index_books(data: dict) -> dict[str, dict]:
    books = {}
    for book in data["books"]:
        key = make_key(book.get("title", ""), book.get("author", ""))
        books[key] = book
    return books


def pairwise_accuracy(high: list[float], low: list[float]) -> float:
    pairs = len(high) * len(low)
    if pairs == 0:
        return float("nan")

    wins = sum(h > l for h in high for l in low)
    return wins / pairs


def auc_from_scores(high: list[float], low: list[float]) -> float:
    """
    Equivalent to pairwise accuracy, with ties receiving 0.5.
    """
    pairs = len(high) * len(low)
    if pairs == 0:
        return float("nan")

    wins = sum(h > l for h in high for l in low)
    ties = sum(h == l for h in high for l in low)

    return (wins + 0.5 * ties) / pairs


def classify(score: float, high_mean: float, low_mean: float) -> str:
    midpoint = (high_mean + low_mean) / 2.0
    expected_high = high_mean > low_mean

    if expected_high:
        return "HIGH" if score >= midpoint else "LOW"
    return "LOW" if score >= midpoint else "HIGH"


def evaluate_axis(
    axis: str,
    golden_axis: dict,
    books: dict[str, dict],
) -> dict:
    examples = []
    missing = []

    for label in ("high", "low"):
        for item in golden_axis.get(label, []):
            if isinstance(item, (list, tuple)) and len(item) == 2:
                title, author = item
            elif isinstance(item, dict):
                title = item["title"]
                author = item["author"]
            else:
                raise ValueError(
                    f"Invalid golden-set entry for {axis}/{label}: {item!r}"
                )

            key = make_key(title, author)
            book = books.get(key)

            if book is None:
                missing.append({
                    "label": label,
                    "title": title,
                    "author": author,
                    "key": key,
                })
                continue

            raw = book.get("raw", {}).get(axis)
            if raw is None:
                missing.append({
                    "label": label,
                    "title": title,
                    "author": author,
                    "key": key,
                    "reason": f"missing raw axis: {axis}",
                })
                continue

            examples.append({
                "label": label,
                "title": title,
                "author": author,
                "id": book.get("id"),
                "raw": float(raw),
            })

    high = [x["raw"] for x in examples if x["label"] == "high"]
    low = [x["raw"] for x in examples if x["label"] == "low"]

    high_mean = mean(high) if high else float("nan")
    low_mean = mean(low) if low else float("nan")

    separation = high_mean - low_mean if high and low else float("nan")

    midpoint = (
        (high_mean + low_mean) / 2.0
        if high and low
        else float("nan")
    )

    for example in examples:
        example["predicted"] = (
            "HIGH" if example["raw"] >= midpoint else "LOW"
        )
        example["correct"] = (
            example["predicted"].lower() == example["label"].lower()
        )

    return {
        "axis": axis,
        "high_count": len(high),
        "low_count": len(low),
        "missing_count": len(missing),
        "missing": missing,
        "high_mean": high_mean,
        "low_mean": low_mean,
        "separation": separation,
        "high_min": min(high) if high else float("nan"),
        "high_max": max(high) if high else float("nan"),
        "low_min": min(low) if low else float("nan"),
        "low_max": max(low) if low else float("nan"),
        "midpoint": midpoint,
        "pairwise_accuracy": pairwise_accuracy(high, low),
        "auc": auc_from_scores(high, low),
        "examples": examples,
    }


def print_model_summary(name: str, result: dict) -> None:
    print()
    print("=" * 110)
    print(f"{name.upper()} — GOLDEN SET EVALUATION")
    print("=" * 110)

    header = (
        f"{'Axis':<16}"
        f"{'HIGH mean':>12}"
        f"{'LOW mean':>12}"
        f"{'Separation':>13}"
        f"{'Pair Acc.':>12}"
        f"{'AUC':>10}"
        f"{'Missing':>10}"
    )
    print(header)
    print("-" * len(header))

    for axis, item in result["axes"].items():
        print(
            f"{axis:<16}"
            f"{item['high_mean']:>12.5f}"
            f"{item['low_mean']:>12.5f}"
            f"{item['separation']:>13.5f}"
            f"{item['pairwise_accuracy']:>12.3f}"
            f"{item['auc']:>10.3f}"
            f"{item['missing_count']:>10}"
        )

    print()
    print(f"Overall pairwise accuracy: {result['overall_pairwise_accuracy']:.3f}")
    print(f"Overall AUC:               {result['overall_auc']:.3f}")


def build_model_result(
    name: str,
    data: dict,
    golden: dict,
) -> dict:
    books = index_books(data)
    axis_results = {}

    all_high = []
    all_low = []

    for axis, golden_axis in golden["axes"].items():
        result = evaluate_axis(axis, golden_axis, books)
        axis_results[axis] = result

        all_high.extend(
            x["raw"]
            for x in result["examples"]
            if x["label"] == "high"
        )
        all_low.extend(
            x["raw"]
            for x in result["examples"]
            if x["label"] == "low"
        )

    # Overall metric is calculated across all HIGH/LOW pairs within axes,
    # rather than comparing unrelated dimensions to each other.
    pair_wins = 0
    pair_count = 0
    pair_auc_sum = 0.0

    for result in axis_results.values():
        high = [
            x["raw"]
            for x in result["examples"]
            if x["label"] == "high"
        ]
        low = [
            x["raw"]
            for x in result["examples"]
            if x["label"] == "low"
        ]

        if high and low:
            pair_count += len(high) * len(low)
            pair_wins += sum(h > l for h in high for l in low)
            pair_auc_sum += auc_from_scores(high, low) * len(high) * len(low)

    return {
        "model": data.get("model", name),
        "book_count": len(books),
        "axes": axis_results,
        "overall_pairwise_accuracy": (
            pair_wins / pair_count if pair_count else float("nan")
        ),
        "overall_auc": (
            pair_auc_sum / pair_count if pair_count else float("nan")
        ),
    }


def write_summary_csv(path: Path, base: dict, large: dict) -> None:
    rows = []

    for axis in base["axes"]:
        b = base["axes"][axis]
        l = large["axes"].get(axis)

        rows.append({
            "axis": axis,
            "base_high_mean": b["high_mean"],
            "base_low_mean": b["low_mean"],
            "base_separation": b["separation"],
            "base_pairwise_accuracy": b["pairwise_accuracy"],
            "base_auc": b["auc"],
            "large_high_mean": l["high_mean"] if l else None,
            "large_low_mean": l["low_mean"] if l else None,
            "large_separation": l["separation"] if l else None,
            "large_pairwise_accuracy": l["pairwise_accuracy"] if l else None,
            "large_auc": l["auc"] if l else None,
        })

    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def write_misclassifications_csv(
    path: Path,
    base: dict,
    large: dict,
) -> None:
    rows = []

    for model_name, result in (("base", base), ("large", large)):
        for axis, axis_result in result["axes"].items():
            for example in axis_result["examples"]:
                if not example["correct"]:
                    rows.append({
                        "model": model_name,
                        "axis": axis,
                        "expected": example["label"],
                        "predicted": example["predicted"],
                        "raw": example["raw"],
                        "title": example["title"],
                        "author": example["author"],
                        "id": example["id"],
                    })

    with path.open("w", encoding="utf-8", newline="") as f:
        fieldnames = [
            "model", "axis", "expected", "predicted", "raw",
            "title", "author", "id"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--golden", required=True, type=Path)
    parser.add_argument("--base", required=True, type=Path)
    parser.add_argument("--large", required=True, type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("golden_set_evaluation.json"),
    )
    args = parser.parse_args()

    golden = load_json(args.golden)
    base_data = load_json(args.base)
    large_data = load_json(args.large)

    base_result = build_model_result("base", base_data, golden)
    large_result = build_model_result("large", large_data, golden)

    report = {
        "golden_set_version": golden.get("version"),
        "base": base_result,
        "large": large_result,
    }

    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=4),
        encoding="utf-8",
    )

    write_summary_csv(
        args.output.with_name("golden_set_evaluation.csv"),
        base_result,
        large_result,
    )

    write_misclassifications_csv(
        args.output.with_name("golden_set_misclassifications.csv"),
        base_result,
        large_result,
    )

    print_model_summary("BASE", base_result)
    print_model_summary("LARGE", large_result)

    print()
    print("=" * 110)
    print("FILES GENERATED")
    print("=" * 110)
    print(args.output)
    print(args.output.with_name("golden_set_evaluation.csv"))
    print(args.output.with_name("golden_set_misclassifications.csv"))


if __name__ == "__main__":
    main()