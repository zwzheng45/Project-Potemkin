import json
import os
from typing import Dict, Optional, Tuple

STATE_PATH = os.path.expanduser("~/.membase/family_agents/state.json")


class FamilyStateStore:
    """Lightweight JSON store for family agent metadata."""

    def __init__(self, path: str = STATE_PATH) -> None:
        self.path = path
        self._data: Dict[str, Dict[str, Dict[str, str]]] = {
            "families": {},
            "users": {},
        }
        self._load()

    def _load(self) -> None:
        if not os.path.exists(self.path):
            return
        try:
            with open(self.path, "r", encoding="utf-8") as handle:
                loaded = json.load(handle)
                if isinstance(loaded, dict):
                    self._data = loaded
        except Exception:
            # If corrupted, reinitialize; keep it simple for the demo.
            self._data = {"families": {}}
        self._ensure_defaults()

    def _ensure_defaults(self) -> None:
        if "families" not in self._data:
            self._data["families"] = {}
        if "users" not in self._data:
            self._data["users"] = {}

    def _persist(self) -> None:
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "w", encoding="utf-8") as handle:
            json.dump(self._data, handle, ensure_ascii=False, indent=2)

    def upsert_family(self, family_id: str, payload: Dict[str, str]) -> None:
        existing = self._data["families"].get(family_id, {})
        merged = {**existing, **payload}
        # Preserve members/owner if not supplied in this payload
        if "members" not in merged:
            merged["members"] = existing.get("members", [])
        if "owner_id" not in merged and "owner_id" in existing:
            merged["owner_id"] = existing["owner_id"]
        self._data["families"][family_id] = merged
        self._persist()

    def get_family(self, family_id: str) -> Optional[Dict[str, str]]:
        return self._data["families"].get(family_id)

    def list_families(self) -> Dict[str, Dict[str, str]]:
        return self._data["families"]

    def add_family_member(self, family_id: str, user_id: str) -> None:
        family = self._data["families"].setdefault(family_id, {})
        members = family.setdefault("members", [])
        if user_id not in members:
            members.append(user_id)
        self._data["families"][family_id] = family
        self._persist()

    def upsert_user(self, user_id: str, payload: Dict[str, str]) -> None:
        self._data["users"][user_id] = payload
        self._persist()

    def get_user(self, user_id: str) -> Optional[Dict[str, str]]:
        return self._data["users"].get(user_id)

    def find_user_by_email(self, email: str) -> Optional[Tuple[str, Dict[str, str]]]:
        for uid, user in self._data["users"].items():
            if user.get("email", "").lower() == email.lower():
                return uid, user
        return None

    def list_users(self) -> Dict[str, Dict[str, str]]:
        return self._data["users"]

    def list_family_members(self, family_id: str) -> Dict[str, Dict[str, str]]:
        return {
            uid: user
            for uid, user in self._data["users"].items()
            if user.get("family_id") == family_id
        }
