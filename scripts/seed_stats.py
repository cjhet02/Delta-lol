#!/usr/bin/env python3
"""Generate stats JSON from HuggingFace parquet dataset for import into MongoDB.

Usage:
    python3 scripts/seed_stats.py                    # Export patches 12.1+
    python3 scripts/seed_stats.py --all              # Export all patches
    python3 scripts/seed_stats.py --patch 14.10      # Export single patch
    python3 scripts/seed_stats.py --output path.json # Custom output path
"""
import argparse
import json
import os
import sys
import urllib.request

from champ_names import normalize_name

PARQUET_URL = "https://huggingface.co/datasets/HakimT/lol-champion-ranked-stats/resolve/main/data/train-00000-of-00001.parquet"
LOCAL_CACHE = "/tmp/lol_stats.parquet"

ROLE_MAP = {"top": "Top", "jungle": "Jungle", "middle": "Mid", "adc": "ADC", "support": "Support"}

# The dataset uses old numbering: 15.x = season 25, 16.x = season 26
# Season 25 has S1 sub-divisions: 15.1→25.S1.1, 15.2→25.S1.2, 15.3→25.S1.3
def remap_patch(patch):
    parts = patch.split('.')
    major = int(parts[0])
    minor = int(parts[1].rstrip('b'))

    if major == 15:
        if minor <= 3:
            return f"25.S1.{minor}"
        else:
            return f"25.{minor}"
    elif major == 16:
        return f"26.{minor}"
    return patch


def download_parquet():
    if os.path.exists(LOCAL_CACHE):
        print(f"Using cached parquet: {LOCAL_CACHE}")
        return
    print(f"Downloading dataset from HuggingFace...")
    urllib.request.urlretrieve(PARQUET_URL, LOCAL_CACHE)
    size_mb = os.path.getsize(LOCAL_CACHE) / 1024 / 1024
    print(f"Downloaded {size_mb:.1f}MB")


def convert(args):
    import pandas as pd

    df = pd.read_parquet(LOCAL_CACHE)

    if args.patch:
        df = df[df["patch"] == args.patch]
    elif not args.all:
        # Exclude season 16 (now sourced from Lolalytics), patch 15.24 (bad upstream data),
        # and filter to 12.1+
        df = df[df["patch"].str.match(r"^1[2-5]\.|^[2-9][0-9]\.") & ~df["patch"].str.startswith("16.") & (df["patch"] != "15.24")]

    # Deduplicate: keep only the latest date per champion-role-patch
    df = df.sort_values("date").drop_duplicates(subset=["champion", "role", "patch"], keep="last")

    # Drop rows with zero winrate (incomplete upstream data)
    df = df[df["winrate"] > 0]

    df["role"] = df["role"].map(ROLE_MAP)

    result = {}
    for patch, group in df.groupby("patch"):
        remapped = remap_patch(patch)
        champs = []
        for _, row in group.iterrows():
            champs.append({
                "Name": normalize_name(row["champion"]),
                "Class": "NA",
                "Role": row["role"],
                "Tier": "",
                "Score": 0,
                "Trend": 0,
                "Win": round(row["winrate"], 1),
                "Role_P": 0,
                "Pick": round(row["pickrate"], 2),
                "Ban": round(row["banrate"], 2),
                "KDA": 0,
            })
        champs.sort(key=lambda x: x["Name"])
        result[remapped] = {"patch": remapped, "champs": champs}

    with open(args.output, "w") as f:
        json.dump(result, f)

    print(f"\nExported {len(result)} patches to {args.output}")
    for p in sorted(result.keys()):
        print(f"  {p}: {len(result[p]['champs'])} champions")


def main():
    parser = argparse.ArgumentParser(description="Generate stats JSON from HuggingFace dataset")
    parser.add_argument("--all", action="store_true", help="Export all patches (not just 12.1+)")
    parser.add_argument("--patch", help="Export a single patch (e.g. 14.10)")
    parser.add_argument("--output", default="/tmp/lol_stats.json", help="Output file path")
    args = parser.parse_args()

    download_parquet()
    convert(args)


if __name__ == "__main__":
    main()
