import logging
import os
from typing import Dict, List, Optional, Union

from membase.memory.message import Message

from family_companion.config import settings
from family_companion.memory_classifier import EventNote, MemoryClassification

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

    def _events_conversation_id(self, family_id: str) -> str:
        return f"membase_ltm_events_{family_id}"

    def _public_conversation_id(self, family_id: str) -> str:
        return f"membase_ltm_public_{family_id}"

    def _private_conversation_id(self, family_id: str, user_id: str) -> str:
        return f"membase_ltm_private_{family_id}_{user_id}"

    def _user_conversation_id(self, family_id: str, user_id: str) -> str:
        return f"{family_id}:{user_id}"

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

    def add_user_message(
        self,
        family_id: str,
        user_id: str,
        user_name: str,
        content: str,
        *,
        share_with_family: bool = True,
        visibility: str = "family",
    ) -> Message:
        memory = self.get_or_create(family_id)
        metadata = {
            "family_id": family_id,
            "speaker": user_name,
            "user_id": user_id,
            "visibility": visibility,
        }
        msg = Message(
            name=user_name,
            role="user",
            content=content,
            metadata=metadata,
            type="stm",
        )
        if share_with_family:
            memory.add(msg, conversation_id=family_id)

        # Keep a per-user conversation thread so each member has their own history view.
        user_conv_id = self._user_conversation_id(family_id, user_id)
        user_msg = Message(
            name=user_name,
            role="user",
            content=content,
            metadata=metadata,
            type="stm",
        )
        memory.add(user_msg, conversation_id=user_conv_id)
        return msg

    def add_agent_message(
        self,
        family_id: str,
        user_id: str,
        content: str,
        *,
        share_with_family: bool = True,
        visibility: str = "family",
    ) -> Message:
        memory = self.get_or_create(family_id)
        metadata = {
            "family_id": family_id,
            "user_id": user_id,
            "speaker": "assistant",
            "visibility": visibility,
        }
        msg = Message(
            name=f"{family_id}-companion",
            role="assistant",
            content=content,
            metadata=metadata,
            type="stm",
        )
        if share_with_family:
            memory.add(msg, conversation_id=family_id)

        # Mirror agent replies into the per-user conversation.
        user_conv_id = self._user_conversation_id(family_id, user_id)
        user_msg = Message(
            name=f"{family_id}-companion",
            role="assistant",
            content=content,
            metadata=metadata,
            type="stm",
        )
        memory.add(user_msg, conversation_id=user_conv_id)
        return msg

    def _add_ltm_entries(
        self,
        memory: "LTMemory",
        conversation_id: str,
        entries: List[Union[str, EventNote, dict]],
        metadata: Optional[dict] = None,
    ) -> None:
        if not entries:
            return
        base_meta = metadata or {}
        for note in entries:
            content = ""
            event_date = None
            if isinstance(note, EventNote):
                content = (note.content or "").strip()
                event_date = (note.date or "").strip() or None
            elif isinstance(note, dict):
                content = str(note.get("content") or note.get("text") or "").strip()
                event_date = str(note.get("date") or "").strip() or None
            else:
                content = str(note).strip()
            if not content:
                continue
            meta = {**base_meta}
            if event_date:
                meta["event_date"] = event_date
            msg = Message(
                name="memory-classifier",
                role="assistant",
                content=content,
                metadata=meta,
                type="ltm",
            )
            memory.add(msg, conversation_id=conversation_id)

    def store_categorized_memories(
        self,
        family_id: str,
        user_id: str,
        user_name: str,
        classification: MemoryClassification,
    ) -> None:
        memory = self.get_or_create(family_id)
        metadata_common = {
            "family_id": family_id,
            "user_id": user_id,
            "source": user_name,
            "visibility": classification.visibility,
        }
        self._add_ltm_entries(
            memory,
            self._events_conversation_id(family_id),
            classification.important_events,
            {**metadata_common, "bucket": "important_events"},
        )
        self._add_ltm_entries(
            memory,
            self._public_conversation_id(family_id),
            classification.public_notes,
            {**metadata_common, "bucket": "public"},
        )
        self._add_ltm_entries(
            memory,
            self._private_conversation_id(family_id, user_id),
            classification.private_notes,
            {**metadata_common, "bucket": "private"},
        )

    def context(self, family_id: str, recent_n: int = 8) -> List[Message]:
        memory = self.get_or_create(family_id)
        return memory.get(
            conversation_id=family_id,
            recent_n=recent_n,
            include_ltm=True,
            include_profile=True,
        )

    def user_context(self, family_id: str, user_id: str, recent_n: int = 8) -> List[Message]:
        memory = self.get_or_create(family_id)
        return memory.get(
            conversation_id=self._user_conversation_id(family_id, user_id),
            recent_n=recent_n,
            include_ltm=False,
            include_profile=False,
        )

    def snapshot(self, family_id: str, user_id: Optional[str] = None) -> dict:
        memory = self.get_or_create(family_id)
        snapshot = {
            "stm": [m.content for m in memory.get(conversation_id=family_id, recent_n=6)],
            "ltm": [m.content for m in memory.get_ltm(family_id, recent_n=3)],
            "profile": [m.content for m in memory.get_profile(recent_n=1)],
            "important_events": [
                {
                    "content": m.content,
                    "date": (getattr(m, "metadata", {}) or {}).get("event_date"),
                }
                for m in memory.get_ltm(self._events_conversation_id(family_id), recent_n=5)
            ],
            "public": [
                m.content for m in memory.get_ltm(self._public_conversation_id(family_id), recent_n=5)
            ],
        }
        if user_id:
            snapshot["user_stm"] = [
                m.content
                for m in memory.get(
                    self._user_conversation_id(family_id, user_id),
                    recent_n=6,
                )
            ]
            snapshot["private"] = [
                m.content
                for m in memory.get_ltm(
                    self._private_conversation_id(family_id, user_id),
                    recent_n=5,
                )
            ]
        return snapshot

    def important_events(self, family_id: str, recent_n: int = 5) -> List[Message]:
        memory = self.get_or_create(family_id)
        return memory.get_ltm(self._events_conversation_id(family_id), recent_n=recent_n)

    def public_memories(self, family_id: str, recent_n: int = 5) -> List[Message]:
        memory = self.get_or_create(family_id)
        return memory.get_ltm(self._public_conversation_id(family_id), recent_n=recent_n)

    def private_memories(self, family_id: str, user_id: str, recent_n: int = 5) -> List[Message]:
        memory = self.get_or_create(family_id)
        return memory.get_ltm(self._private_conversation_id(family_id, user_id), recent_n=recent_n)
