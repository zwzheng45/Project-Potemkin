import json
import os
from typing import Dict, Optional

STATE_PATH = os.path.expanduser("~/.membase/family_agents/state.json")


class FamilyStateStore:
    """Lightweight JSON store for family agent metadata."""

    def __init__(self, path: str = STATE_PATH) -> None:
        self.path = path
        self._data: Dict[str, Dict[str, str]] = {"families": {}}
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.path):
            return
        try:
            with open(self.path, "r", encoding="utf-8") as handle:
                loaded = json.load(handle)
                if isinstance(loaded, dict) and "families" in loaded:
                    self._data = loaded
        except Exception:
            # If corrupted, reinitialize; keep it simple for the demo.
            self._data = {"families": {}}

    def _persist(self) -> None:
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as handle:
            json.dump(self._data, handle, ensure_ascii=False, indent=2)

    def upsert_family(self, family_id: str, payload: Dict[str, str]) -> None:
        self._data["families"][family_id] = payload
        self._persist()

    def get_family(self, family_id: str) -> Optional[Dict[str, str]]:
        return self._data["families"].get(family_id)

    def list_families(self) -> Dict[str, Dict[str, str]]:
        return self._data["families"]
