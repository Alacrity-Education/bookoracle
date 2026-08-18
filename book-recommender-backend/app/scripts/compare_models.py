#!/usr/bin/env python3
import argparse
import csv
import json
from pathlib import Path
from statistics import mean, median, pstdev

import numpy as np

AXES = [
    "curiosity", "reflection", "complexity", "emotionality", "characters",
    "pace", "imagination", "realism", "ambiguity", "culture"
]

def load(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "books" not in data:
        raise ValueError(f"{path} does not contain 'books'.")
    return data

def index_books(data):
    return {b["id"]: b for b in data["books"]}

def pearson(x, y):
    if len(x) < 2 or np.std(x) == 0 or np.std(y) == 0:
        return float("nan")
    return float(np.corrcoef(x, y)[0, 1])

def rankdata(values):
    values = np.asarray(values, dtype=float)
    order = np.argsort(values, kind="mergesort")
    ranks = np.empty(len(values), dtype=float)
    i = 0
    while i < len(values):
        j = i
        while j + 1 < len(values) and values[order[j + 1]] == values[order[i]]:
            j += 1
        ranks[order[i:j+1]] = (i + j) / 2.0 + 1.0
        i = j + 1
    return ranks

def spearman(x, y):
    return pearson(rankdata(x), rankdata(y))

def values_for_axis(base, large, axis):
    ids = sorted(set(base) & set(large))
    rows = []
    for bid in ids:
        br = base[bid].get("raw", {}).get(axis)
        lr = large[bid].get("raw", {}).get(axis)
        if br is not None and lr is not None:
            rows.append((bid, float(br), float(lr)))
    return rows

def summary(rows):
    b = [r[1] for r in rows]
    l = [r[2] for r in rows]
    d = [y-x for x, y in zip(b, l)]
    return {
        "book_count": len(rows),
        "base": {
            "min": min(b), "p5": float(np.percentile(b, 5)),
            "p25": float(np.percentile(b, 25)), "median": median(b),
            "mean": mean(b), "p75": float(np.percentile(b, 75)),
            "p95": float(np.percentile(b, 95)), "max": max(b),
            "std": pstdev(b)
        },
        "large": {
            "min": min(l), "p5": float(np.percentile(l, 5)),
            "p25": float(np.percentile(l, 25)), "median": median(l),
            "mean": mean(l), "p75": float(np.percentile(l, 75)),
            "p95": float(np.percentile(l, 95)), "max": max(l),
            "std": pstdev(l)
        },
        "difference": {
            "mean": mean(d),
            "mean_absolute": mean(abs(x) for x in d),
            "median_absolute": median(abs(x) for x in d),
            "max_absolute": max(abs(x) for x in d)
        },
        "correlation": {
            "pearson": pearson(b, l),
            "spearman": spearman(b, l)
        }
    }

def write_csv(path, rows):
    if not rows:
        return
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True, type=Path)
    p.add_argument("--large", required=True, type=Path)
    p.add_argument("--output", default="model_comparison_report.json", type=Path)
    p.add_argument("--top", default=10, type=int)
    args = p.parse_args()

    base_data = load(args.base)
    large_data = load(args.large)
    base = index_books(base_data)
    large = index_books(large_data)

    common = sorted(set(base) & set(large))
    if not common:
        raise ValueError("No common book IDs found.")

    report = {
        "base_model": base_data.get("model"),
        "large_model": large_data.get("model"),
        "common_book_count": len(common),
        "axes": {},
        "top_absolute_differences": [],
        "top_rank_changes": [],
        "note": "Comparison uses raw positive_similarity - negative_similarity."
    }

    summary_rows = []
    difference_rows = []
    rank_rows = []

    for axis in AXES:
        rows = values_for_axis(base, large, axis)
        if not rows:
            continue

        s = summary(rows)
        report["axes"][axis] = s

        summary_rows.append({
            "axis": axis,
            "pearson": s["correlation"]["pearson"],
            "spearman": s["correlation"]["spearman"],
            "base_p5": s["base"]["p5"],
            "base_median": s["base"]["median"],
            "base_p95": s["base"]["p95"],
            "base_std": s["base"]["std"],
            "large_p5": s["large"]["p5"],
            "large_median": s["large"]["median"],
            "large_p95": s["large"]["p95"],
            "large_std": s["large"]["std"],
            "mean_difference": s["difference"]["mean"],
            "mean_absolute_difference": s["difference"]["mean_absolute"],
            "max_absolute_difference": s["difference"]["max_absolute"]
        })

        diffs = []
        for bid, b, l in rows:
            diffs.append({
                "axis": axis,
                "id": bid,
                "title": base[bid].get("title", ""),
                "author": base[bid].get("author", ""),
                "base_raw": b,
                "large_raw": l,
                "difference": l-b,
                "absolute_difference": abs(l-b)
            })
        diffs.sort(key=lambda x: x["absolute_difference"], reverse=True)
        report["top_absolute_differences"].extend(diffs[:args.top])
        difference_rows.extend(diffs[:args.top])

        br = rankdata([r[1] for r in rows])
        lr = rankdata([r[2] for r in rows])
        ranks = []
        for (bid, b, l), rb, rl in zip(rows, br, lr):
            ranks.append({
                "axis": axis,
                "id": bid,
                "title": base[bid].get("title", ""),
                "author": base[bid].get("author", ""),
                "base_rank": float(rb),
                "large_rank": float(rl),
                "rank_change": float(rl-rb),
                "absolute_rank_change": float(abs(rl-rb))
            })
        ranks.sort(key=lambda x: x["absolute_rank_change"], reverse=True)
        report["top_rank_changes"].extend(ranks[:args.top])
        rank_rows.extend(ranks[:args.top])

    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=4),
        encoding="utf-8"
    )

    write_csv(args.output.with_name("model_comparison_summary.csv"), summary_rows)
    write_csv(args.output.with_name("model_comparison_top_differences.csv"), difference_rows)
    write_csv(args.output.with_name("model_comparison_rank_changes.csv"), rank_rows)

    print(f"Base model:  {report['base_model']}")
    print(f"Large model: {report['large_model']}")
    print(f"Common books: {len(common)}")
    print()
    print(f"{'Axis':<15}{'Pearson':>10}{'Spearman':>10}{'Base SD':>12}{'Large SD':>12}{'Mean |Δ|':>12}")
    print("-" * 71)
    for axis in AXES:
        if axis not in report["axes"]:
            continue
        s = report["axes"][axis]
        print(
            f"{axis:<15}"
            f"{s['correlation']['pearson']:>10.3f}"
            f"{s['correlation']['spearman']:>10.3f}"
            f"{s['base']['std']:>12.6f}"
            f"{s['large']['std']:>12.6f}"
            f"{s['difference']['mean_absolute']:>12.6f}"
        )

    print()
    print("Generated:")
    print(f"  {args.output}")
    print(f"  {args.output.with_name('model_comparison_summary.csv')}")
    print(f"  {args.output.with_name('model_comparison_top_differences.csv')}")
    print(f"  {args.output.with_name('model_comparison_rank_changes.csv')}")

if __name__ == "__main__":
    main()