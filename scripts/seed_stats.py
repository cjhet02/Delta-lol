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

PARQUET_URL = "https://huggingface.co/datasets/HakimT/lol-champion-ranked-stats/resolve/main/data/train-00000-of-00001.parquet"
LOCAL_CACHE = "/tmp/lol_stats.parquet"

ROLE_MAP = {"top": "Top", "jungle": "Jungle", "middle": "Mid", "adc": "ADC", "support": "Support"}


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
        df = df[df["patch"].str.match(r"^1[2-9]\.|^[2-9][0-9]\.")]

    df["role"] = df["role"].map(ROLE_MAP)

    result = {}
    for patch, group in df.groupby("patch"):
        champs = []
        for _, row in group.iterrows():
            champs.append({
                "Name": row["champion"].title(),
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
        result[patch] = {"patch": patch, "champs": champs}

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
