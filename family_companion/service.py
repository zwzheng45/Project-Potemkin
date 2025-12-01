import logging
import re
from typing import Dict, Optional

from family_companion.agent import FamilyAgent
from family_companion.auth import UserAccount
from family_companion.chain import FamilyChainAdapter
from family_companion.memory import FamilyMemoryManager
from family_companion.state import FamilyStateStore

logger = logging.getLogger(__name__)


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip()).strip("-")
    return cleaned.lower() or "family"


class FamilyService:
    """High-level orchestration for managing multiple family agents."""

    def __init__(
        self,
        state_store: Optional[FamilyStateStore] = None,
        memory_manager: Optional[FamilyMemoryManager] = None,
        chain_adapter: Optional[FamilyChainAdapter] = None,
    ) -> None:
        self.state = state_store or FamilyStateStore()
        self.memory = memory_manager or FamilyMemoryManager()
        self.chain = chain_adapter or FamilyChainAdapter()
        self.agents: Dict[str, FamilyAgent] = {}
        self._load_agents_from_state()

    def _load_agents_from_state(self) -> None:
        for family_id, meta in self.state.list_families().items():
            self.agents[family_id] = FamilyAgent(
                family_id=family_id,
                name=meta.get("name", family_id),
                description=meta.get("description", ""),
                language=meta.get("language", "zh"),
                memory=self.memory,
                chain=self.chain,
            )
        if self.agents:
            logger.info("Loaded %s family agents from disk", len(self.agents))

    def register_family(
        self,
        name: str,
        description: str = "",
        family_id: Optional[str] = None,
        task_price: Optional[int] = None,
        language: str = "zh",
        owner_id: Optional[str] = None,
        allow_existing: bool = False,
    ) -> FamilyAgent:
        fid = family_id or _slugify(name)
        if fid in self.agents:
            if allow_existing:
                return self.agents[fid]
            raise ValueError(f"Family {fid} already exists.")

        agent = FamilyAgent(
            family_id=fid,
            name=name,
            description=description or "家庭陪伴、家务提醒、健康守护的数字小助手。",
            language=language,
            memory=self.memory,
            chain=self.chain,
        )
        # Prepare on-chain memory/auth when credentials exist
        self.chain.ensure_family_space(fid, price=task_price)
        self.chain.grant_agent_access(fid)

        self.agents[fid] = agent
        self.state.upsert_family(
            fid,
            {
                "name": name,
                "description": agent.description,
                "language": agent.language,
                **({"owner_id": owner_id} if owner_id else {}),
            },
        )
        logger.info("Registered new family agent %s (%s)", fid, name)
        return agent

    def list_families(self) -> Dict[str, Dict[str, str]]:
        return {fid: agent.to_dict() for fid, agent in self.agents.items()}

    def get_family(self, family_id: str) -> FamilyAgent:
        if family_id not in self.agents:
            raise KeyError(f"Family {family_id} not found, register it first.")
        return self.agents[family_id]

    def _members_for_family(self, family_id: str) -> Dict[str, UserAccount]:
        members = self.state.list_family_members(family_id)
        hydrated: Dict[str, UserAccount] = {}
        for uid, payload in members.items():
            hydrated[uid] = UserAccount(
                user_id=uid,
                family_id=payload["family_id"],
                email=payload["email"],
                name=payload.get("name", payload["email"]),
                role=payload.get("role", "member"),
            )
        return hydrated

    def chat(self, family_id: str, user: UserAccount, content: str) -> Dict[str, object]:
        if user.family_id != family_id:
            raise PermissionError("User cannot chat outside their family.")
        agent = self.get_family(family_id)
        members = self._members_for_family(family_id)
        return agent.chat(user=user, content=content, members=members)

    def memory_snapshot(self, family_id: str, user: UserAccount) -> Dict[str, object]:
        # Ensure the family exists before exposing memories
        if user.family_id != family_id:
            raise PermissionError("User cannot access another family's memory.")
        self.get_family(family_id)
        return self.memory.snapshot(family_id, user_id=user.user_id)

    def family_detail(self, family_id: str, user: UserAccount) -> Dict[str, object]:
        if user.family_id != family_id:
            raise PermissionError("User cannot access another family.")
        family_meta = self.state.get_family(family_id)
        if not family_meta:
            raise KeyError(f"Family {family_id} not found, register it first.")
        members = self._members_for_family(family_id)
        return {
            "family_id": family_id,
            "name": family_meta.get("name", family_id),
            "description": family_meta.get("description", ""),
            "language": family_meta.get("language", "zh"),
            "owner_id": family_meta.get("owner_id"),
            "members": [
                {
                    "user_id": m.user_id,
                    "name": m.name,
                    "email": m.email,
                    "role": m.role,
                }
                for m in members.values()
            ],
        }
