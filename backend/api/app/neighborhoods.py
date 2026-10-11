import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Optional

_DATA = Path(__file__).parent / "data" / "neighborhoods.json"


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s-]", "", s.lower())).strip()


@lru_cache(maxsize=1)
def _load() -> dict:
    return json.loads(_DATA.read_text(encoding="utf-8"))


def all_neighborhoods() -> list[dict]:
    return _load()["neighborhoods"]


def find_neighborhood(query: str) -> Optional[dict]:
    q = normalize(query)
    if not q:
        return None
    items = all_neighborhoods()
    for n in items:
        if n["id"] == q:
            return n
    for match in (
        lambda n: normalize(n["name"]) == q,
        lambda n: normalize(n["name"]).startswith(q),
        lambda n: q in normalize(n["name"]),
    ):
        hit = next((n for n in items if match(n)), None)
        if hit:
            return hit
    return None


def search_neighborhoods(query: str, limit: int = 8) -> list[dict]:
    q = normalize(query)
    items = all_neighborhoods()
    if not q:
        by_id = {n["id"]: n for n in items}
        return [by_id[i] for i in _load()["quick_picks"] if i in by_id]

    scored = []
    for n in items:
        name, zone = normalize(n["name"]), normalize(n["zone"])
        if name.startswith(q):
            score = 3
        elif q in name:
            score = 2
        elif q in zone:
            score = 1
        else:
            continue
        scored.append((score, n))
    scored.sort(key=lambda s: (-s[0], s[1]["name"]))
    return [n for _, n in scored[:limit]]
