#!/usr/bin/env python3
"""Shared champion name mapping from Data Dragon.

Provides two functions:
  - get_ddragon_id_map(): numeric ID → ddragon key (used by lolalytics scraper)
  - get_display_name(ddragon_key): ddragon key → proper display name
  - normalize_name(raw): raw HuggingFace name → proper display name
"""
import json
import urllib.request

DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
DDRAGON_CHAMP_URL = "https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json"

_cache = None


def _fetch():
    global _cache
    if _cache is not None:
        return _cache
    versions = json.loads(urllib.request.urlopen(DDRAGON_VERSIONS_URL, timeout=10).read())
    latest = versions[0]
    url = DDRAGON_CHAMP_URL.format(version=latest)
    raw = json.loads(urllib.request.urlopen(url, timeout=10).read())

    id_map = {}       # numeric key → ddragon key (e.g. "64" → "LeeSin")
    ddragon_to_name = {}  # ddragon key → display name (e.g. "LeeSin" → "Lee Sin")
    raw_to_name = {}   # raw lowercase → display name (e.g. "leesin" → "Lee Sin")

    for ddragon_key, info in raw["data"].items():
        id_map[info["key"]] = ddragon_key
        ddragon_to_name[ddragon_key] = info["name"]
        raw_to_name[ddragon_key.lower()] = info["name"]

    _cache = {
        "id_map": id_map,
        "ddragon_to_name": ddragon_to_name,
        "raw_to_name": raw_to_name,
    }
    return _cache


def get_ddragon_id_map():
    """Return numeric ID → ddragon key map. Used by lolalytics scraper."""
    return _fetch()["id_map"]


def get_display_name(ddragon_key):
    """Convert Data Dragon key (e.g. 'LeeSin') to display name ('Lee Sin')."""
    return _fetch()["ddragon_to_name"].get(ddragon_key, ddragon_key)


def normalize_name(raw_name):
    """Convert raw name (e.g. 'leesin') to display name ('Lee Sin').

    Falls back to title-casing if no match is found.
    """
    data = _fetch()
    key = raw_name.lower()
    if key in data["raw_to_name"]:
        return data["raw_to_name"][key]
    return raw_name.title()
