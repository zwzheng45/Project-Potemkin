import logging
import os
from typing import Dict, List, Optional

from membase.memory.message import Message

from family_companion.config import settings

logger = logging.getLogger(__name__)


class FamilyMemoryManager:
    """
    Manages a dedicated LTMemory instance for each family so that
    short-term, long-term, and profile memories remain isolated.
    """

    def __init__(self) -> None:
        settings.require_openai()
        # Ensure env vars are in place before importing LTMemory (module exits if missing)
        if not os.getenv("OPENAI_API_KEY") and settings.openai_api_key:
            os.environ["OPENAI_API_KEY"] = settings.openai_api_key
        if not os.getenv("OPENAI_MODEL_NAME"):
            os.environ["OPENAI_MODEL_NAME"] = settings.openai_model_name
        if not os.getenv("MEMBASE_HUB"):
            os.environ["MEMBASE_HUB"] = settings.hub_base_url

        try:
            from membase.memory.lt_memory import LTMemory
        except SystemExit as exc:
            raise RuntimeError(
                "OPENAI_API_KEY must be provided before starting the family companion service."
            ) from exc

        self._lt_memory_cls = LTMemory
        self._memories: Dict[str, LTMemory] = {}

    def get_or_create(self, family_id: str) -> "LTMemory":
        if family_id in self._memories:
            return self._memories[family_id]

        memory = self._lt_memory_cls(
            membase_account=family_id,
            default_conversation_id=family_id,
            auto_upload_to_hub=settings.auto_upload_to_hub,
            preload_from_hub=True,
        )
        memory.update_conversation_id(family_id)
        self._memories[family_id] = memory
        logger.info("Initialized LTMemory for family %s", family_id)
        return memory

    def add_user_message(self, family_id: str, sender: str, content: str) -> Message:
        memory = self.get_or_create(family_id)
        msg = Message(
            name=sender,
            role="user",
            content=content,
            metadata={"family_id": family_id, "speaker": sender},
            type="stm",
        )
        memory.add(msg, conversation_id=family_id)
        return msg

    def add_agent_message(self, family_id: str, content: str) -> Message:
        memory = self.get_or_create(family_id)
        msg = Message(
            name=f"{family_id}-companion",
            role="assistant",
            content=content,
            metadata={"family_id": family_id},
            type="stm",
        )
        memory.add(msg, conversation_id=family_id)
        return msg

    def context(self, family_id: str, recent_n: int = 8) -> List[Message]:
        memory = self.get_or_create(family_id)
        return memory.get(
            conversation_id=family_id,
            recent_n=recent_n,
            include_ltm=True,
            include_profile=True,
        )

    def snapshot(self, family_id: str) -> dict:
        memory = self.get_or_create(family_id)
        return {
            "stm": [m.content for m in memory.get(family_id, recent_n=6)],
            "ltm": [m.content for m in memory.get_ltm(family_id, recent_n=3)],
            "profile": [m.content for m in memory.get_profile(recent_n=1)],
        }
