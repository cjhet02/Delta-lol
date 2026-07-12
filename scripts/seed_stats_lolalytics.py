#!/usr/bin/env python3
"""Scrape champion stats from Lolalytics API for Season 26 patches (16.1–16.13).

Usage:
    python3 scripts/seed_stats_lolalytics.py                    # Export patches 16.1–16.13
    python3 scripts/seed_stats_lolalytics.py --patch 16.4       # Export single patch
    python3 scripts/seed_stats_lolalytics.py --output path.json # Custom output path
"""
import argparse
import json
import sys
import time
import urllib.request

TIER_URL = "https://a1.lolalytics.com/mega/?ep=tier&v=1&patch={patch}&lane={lane}&tier=emerald_plus&queue=ranked&region=all"
DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
DDRAGON_CHAMP_URL = "https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json"

LANES = ["top", "jungle", "middle", "bottom", "support"]
LANE_TO_ROLE = {"top": "Top", "jungle": "Jungle", "middle": "Mid", "bottom": "ADC", "support": "Support"}

SEASON26_PATCHES = [f"16.{i}" for i in range(1, 14)]


def remap_patch(patch):
    """Convert dataset patch format (16.x) to our DB format (26.x)."""
    parts = patch.split(".")
    major = int(parts[0])
    if major == 16:
        return f"26.{parts[1]}"
    return patch


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "DeltaLoL/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def build_champ_id_map():
    """Fetch Data Dragon champion.json and build numeric ID → name map."""
    versions = fetch_json(DDRAGON_VERSIONS_URL)
    latest = versions[0]
    print(f"  Data Dragon version: {latest}")
    url = DDRAGON_CHAMP_URL.format(version=latest)
    data = fetch_json(url)
    mapping = {}
    for name, info in data["data"].items():
        mapping[info["key"]] = name
    return mapping


def champ_name_to_db(ddragon_name):
    """Convert Data Dragon name to match our DB format.

    Examples: AurelionSol -> Aurelionsol, KogMaw -> Kogmaw, RekSai -> RekSai
    We title-case the full string then lowercase everything after the first char,
    which matches the HuggingFace dataset's .title() convention.
    """
    return ddragon_name.title()


def fetch_lane_stats(patch, lane):
    """Fetch tier stats for a single patch+lane. Returns list of champion dicts."""
    url = TIER_URL.format(patch=patch, lane=lane)
    data = fetch_json(url)

    if not data.get("response", {}).get("valid"):
        return []

    results = []
    tiers = data.get("tier", {})
    for bucket in tiers.values():
        lane_data = bucket.get("lane", {}).get(lane, {})
        champs = lane_data.get("cid", {})
        for cid, stats in champs.items():
            results.append({
                "cid": cid,
                "wr": stats.get("wr", 0),
                "pr": stats.get("pr", 0),
                "br": stats.get("br", 0),
            })
    return results


def convert(patch, id_map):
    """Fetch all lanes for a patch and return the formatted dict."""
    all_champs = []
    seen = set()

    for lane in LANES:
        role = LANE_TO_ROLE[lane]
        entries = fetch_lane_stats(patch, lane)

        for e in entries:
            cid = e["cid"]
            ddragon_name = id_map.get(cid)
            if not ddragon_name:
                print(f"  WARNING: unknown champion ID {cid} in {patch}/{lane}, skipping")
                continue

            name = champ_name_to_db(ddragon_name)
            key = (name, role)
            if key in seen:
                continue
            seen.add(key)

            all_champs.append({
                "Name": name,
                "Class": "NA",
                "Role": role,
                "Tier": "",
                "Score": 0,
                "Trend": 0,
                "Win": round(e["wr"], 1),
                "Role_P": 0,
                "Pick": round(e["pr"], 2),
                "Ban": round(e["br"], 2),
                "KDA": 0,
            })

    all_champs.sort(key=lambda x: x["Name"])
    label = remap_patch(patch)
    return {"patch": label, "champs": all_champs}


def main():
    parser = argparse.ArgumentParser(description="Scrape champion stats from Lolalytics")
    parser.add_argument("--patch", help="Export a single patch (e.g. 16.4)")
    parser.add_argument("--output", default="/tmp/lol_stats_s26_lolalytics.json", help="Output file path")
    args = parser.parse_args()

    print("Fetching champion ID mapping from Data Dragon...")
    id_map = build_champ_id_map()
    print(f"  Mapped {len(id_map)} champions")

    patches = [args.patch] if args.patch else SEASON26_PATCHES

    result = {}
    for i, patch in enumerate(patches):
        sys.stdout.write(f"{patch}... ")
        sys.stdout.flush()
        data = convert(patch, id_map)
        label = data["patch"]
        result[label] = data
        count = len(data["champs"])
        sys.stdout.write(f"{count} champions\n")
        sys.stdout.flush()
        if i < len(patches) - 1:
            time.sleep(0.3)

    with open(args.output, "w") as f:
        json.dump(result, f)

    print(f"\nExported {len(result)} patches to {args.output}")
    for p in sorted(result.keys()):
        print(f"  {p}: {len(result[p]['champs'])} champions")


if __name__ == "__main__":
    main()
