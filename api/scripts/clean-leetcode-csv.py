#!/usr/bin/env python3
"""
Clean LeetCode CSV and convert to Reforge standard format.

Input: api/data/leetcode.csv (raw LeetCode dataset)
Output: api/data/sample-datasets/leetcode-cleaned.csv

Standard CSV Format:
- title: Problem title (cleaned, no number prefix)
- url: Full problem URL
- source: "LeetCode"
- difficulty: easy, medium, hard (lowercase)
- patterns: Comma-separated pattern names (cleaned)
"""

import csv
import re
import os

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, "..", "data", "leetcode.csv")
OUTPUT_FILE = os.path.join(
    SCRIPT_DIR, "..", "data", "sample-datasets", "leetcode-cleaned.csv"
)


def clean_title(title: str) -> str:
    """Remove number prefix from title (e.g., '1. Two Sum' -> 'Two Sum')"""
    # Match patterns like "1. ", "123. ", "1234. "
    cleaned = re.sub(r"^\d+\.\s*", "", title.strip())
    return cleaned


def clean_patterns(topic_tags: str) -> str:
    """
    Clean pattern names from topic_tags.
    Input: "'Array', 'Hash Table', 'Two Pointers'"
    Output: "Array, Hash Table, Two Pointers"
    """
    if not topic_tags or topic_tags.strip() == "":
        return ""

    # Remove surrounding quotes and split
    # Pattern: 'Name' or "Name"
    patterns = re.findall(r"['\"]([^'\"]+)['\"]", topic_tags)

    # Clean each pattern name
    cleaned = [p.strip() for p in patterns if p.strip()]

    return ", ".join(cleaned)


def normalize_difficulty(difficulty: str) -> str:
    """Normalize difficulty to lowercase"""
    d = difficulty.strip().lower()
    if d in ["easy", "medium", "hard"]:
        return d
    return "medium"  # Default fallback


def main():
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    problems = []
    skipped_premium = 0
    skipped_invalid = 0

    print(f"Reading from: {INPUT_FILE}")

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            # Skip premium problems
            is_premium = row.get("is_premium", "").strip().lower()
            if is_premium == "true":
                skipped_premium += 1
                continue

            # Extract and clean fields
            title = clean_title(row.get("title", ""))
            url = row.get("problem_URL", "").strip()
            difficulty = normalize_difficulty(row.get("difficulty", "medium"))
            patterns = clean_patterns(row.get("topic_tags", ""))

            # Validate required fields
            if not title or not url:
                skipped_invalid += 1
                continue

            problems.append(
                {
                    "title": title,
                    "url": url,
                    "source": "LeetCode",
                    "difficulty": difficulty,
                    "patterns": patterns,
                }
            )

    print(f"Writing to: {OUTPUT_FILE}")
    print(f"Total problems: {len(problems)}")
    print(f"Skipped (premium): {skipped_premium}")
    print(f"Skipped (invalid): {skipped_invalid}")

    # Write cleaned CSV
    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as f:
        fieldnames = ["title", "url", "source", "difficulty", "patterns"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(problems)

    # Print stats
    difficulties = {}
    all_patterns = set()

    for p in problems:
        d = p["difficulty"]
        difficulties[d] = difficulties.get(d, 0) + 1

        if p["patterns"]:
            for pat in p["patterns"].split(", "):
                all_patterns.add(pat)

    print("\n--- Statistics ---")
    print(f"Easy: {difficulties.get('easy', 0)}")
    print(f"Medium: {difficulties.get('medium', 0)}")
    print(f"Hard: {difficulties.get('hard', 0)}")
    print(f"Unique patterns: {len(all_patterns)}")
    print("\nPatterns found:")
    for pat in sorted(all_patterns):
        print(f"  - {pat}")


if __name__ == "__main__":
    main()
