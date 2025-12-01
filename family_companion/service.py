import logging
import re
from datetime import datetime
from typing import Dict, List, Optional

from family_companion.agent import FamilyAgent
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

    def register_family(
        self,
        name: str,
        description: str = "",
        family_id: Optional[str] = None,
        task_price: Optional[int] = None,
        members: Optional[List[Dict[str, str]]] = None,
    ) -> FamilyAgent:
        fid = family_id or _slugify(name)
        if fid in self.agents:
            return self.agents[fid]

        agent = FamilyAgent(
            family_id=fid,
            name=name,
            description=description or "家庭陪伴、家务提醒、健康守护的数字小助手。",
            memory=self.memory,
            chain=self.chain,
            members=members or [],
            task_price=task_price,
        )
        # Prepare on-chain memory/auth when credentials exist
        self.chain.ensure_family_space(fid, price=task_price)
        self.chain.grant_agent_access(fid)

        self.agents[fid] = agent
        self.state.upsert_family(fid, agent.to_dict())
        logger.info("Registered new family agent %s (%s)", fid, name)
        return agent

    def list_families(self) -> Dict[str, Dict[str, object]]:
        return {fid: agent.to_dict() for fid, agent in self.agents.items()}

    def get_family(self, family_id: str) -> FamilyAgent:
        if family_id not in self.agents:
            raise KeyError(f"Family {family_id} not found, register it first.")
        return self.agents[family_id]

    def chat(self, family_id: str, sender: str, content: str) -> Dict[str, object]:
        agent = self.get_family(family_id)
        result = agent.chat(sender=sender, content=content)
        agent.last_active_at = datetime.utcnow().isoformat()
        self.state.upsert_family(family_id, agent.to_dict())
        return result

    def memory_snapshot(self, family_id: str) -> Dict[str, object]:
        # Ensure the family exists before exposing memories
        self.get_family(family_id)
        return self.memory.snapshot(family_id)

    def update_family(
        self,
        family_id: str,
        description: Optional[str] = None,
        task_price: Optional[int] = None,
        members: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, object]:
        agent = self.get_family(family_id)
        if description is not None:
            agent.description = description
        if task_price is not None:
            agent.task_price = task_price
            self.chain.ensure_family_space(family_id, price=task_price)
        if members is not None:
            agent.members = members
        self.state.upsert_family(family_id, agent.to_dict())
        return agent.to_dict()

    def delete_family(self, family_id: str) -> None:
        if family_id in self.agents:
            del self.agents[family_id]
        self.state.delete_family(family_id)

    def _load_agents_from_state(self) -> None:
        for family_id, meta in self.state.list_families().items():
            self.agents[family_id] = FamilyAgent(
                family_id=family_id,
                name=meta.get("name", family_id),
                description=meta.get("description", ""),
                memory=self.memory,
                chain=self.chain,
                members=meta.get("members", []),
                task_price=meta.get("task_price"),
                last_active_at=meta.get("last_active_at"),
            )
        if self.agents:
            logger.info("Loaded %s family agents from disk", len(self.agents))
