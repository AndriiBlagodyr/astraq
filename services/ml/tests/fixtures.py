"""The fixture files `packages/shared` keeps for both languages."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

SHARED_FIXTURES = Path(__file__).resolve().parents[3] / "packages" / "shared" / "fixtures"


# Any: these are JSON documents, read as whatever the file holds.
def load(name: str) -> Any:
    return json.loads((SHARED_FIXTURES / name).read_text(encoding="utf-8"))


def strategy(name: str) -> Any:
    """One of the valid strategy documents, by its name in strategies.json."""
    return copy.deepcopy(load("strategies.json")["valid"][name])


def altered(document: Any, path: list[str | int], case: dict[str, Any]) -> Any:
    """`document` with the value at `path` replaced, or removed."""
    result = copy.deepcopy(document)
    parent = result
    for key in path[:-1]:
        parent = parent[key]
    if case.get("remove"):
        del parent[path[-1]]
    else:
        parent[path[-1]] = case["value"]
    return result
