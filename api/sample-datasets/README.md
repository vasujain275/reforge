# Sample Datasets

This folder contains pre-cleaned datasets for bulk importing problems into Reforge.

## Available Datasets

### `leetcode.csv`

A dataset of **2,160 LeetCode problems** (free tier only, premium excluded).

**Statistics:**
- Easy: 592 problems
- Medium: 1,105 problems  
- Hard: 463 problems
- Patterns: 72 unique patterns

**Format:**
```csv
title,url,source,difficulty,patterns
Two Sum,https://leetcode.com/problems/two-sum,LeetCode,easy,"Array, Hash Table"
```

---

## Standard CSV Format

When uploading custom CSVs, use this format:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `title` | string | Yes | Problem title |
| `url` | string | No | Problem URL |
| `source` | string | No | Source name (e.g., "LeetCode", "NeetCode 150") |
| `difficulty` | enum | Yes | `easy`, `medium`, or `hard` |
| `patterns` | string | No | Comma-separated pattern names |

**Notes:**
- First row must be headers
- Patterns are auto-created if they don't exist
- Duplicate problems (same title + source) are skipped
- UTF-8 encoding required

---

## Regenerating the LeetCode Dataset

If you need to regenerate from the raw CSV:

```bash
cd api/scripts
python3 clean-leetcode-csv.py
```

Source file: `api/data/leetcode.csv`
