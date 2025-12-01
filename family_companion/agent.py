import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from openai import OpenAI

from family_companion.config import settings
from family_companion.memory import FamilyMemoryManager
from family_companion.chain import FamilyChainAdapter

logger = logging.getLogger(__name__)


@dataclass
class FamilyAgent:
    """Represents a single family's companion agent."""

    family_id: str
    name: str
    description: str
    memory: FamilyMemoryManager
    chain: FamilyChainAdapter
    members: List[Dict[str, str]] = field(default_factory=list)
    task_price: Optional[int] = None
    last_active_at: Optional[str] = None
    client: OpenAI = field(init=False)

    def __post_init__(self) -> None:
        settings.require_openai()
        self.client = OpenAI(api_key=settings.openai_api_key)

    def _render_context(self, messages) -> str:
        rendered: List[str] = []
        for msg in messages:
            prefix = "用户" if msg.role == "user" else "助手"
            rendered.append(f"[{prefix}] {msg.content}")
        return "\n".join(rendered) if rendered else "暂无历史记忆"

    def chat(self, sender: str, content: str) -> Dict[str, object]:
        logger.info("family %s <- %s: %s", self.family_id, sender, content)
        self.memory.add_user_message(self.family_id, sender, content)
        context_messages = self.memory.context(self.family_id, recent_n=8)
        context_text = self._render_context(context_messages)

        system_prompt = (
            f"你是{self.name}家庭的链上陪伴AI，负责日常陪伴、提醒、情绪关怀。"
            "输出要温暖、具体，并给出可执行的小建议。"
            f"当前家庭说明: {self.description}。"
            "可以结合长期记忆、家庭画像和最新上下文回答。"
        )

        completion = self.client.chat.completions.create(
            model=settings.openai_model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "system",
                    "content": f"长期/画像/上下文参考:\n{context_text}",
                },
                {"role": "user", "content": content},
            ],
            temperature=0.4,
            max_tokens=512,
        )
        reply = completion.choices[0].message.content.strip()
        logger.info("family %s -> reply length=%s", self.family_id, len(reply))
        self.memory.add_agent_message(self.family_id, reply)

        snapshot = self.memory.snapshot(self.family_id)
        return {
            "reply": reply,
            "memory": snapshot,
            "family_id": self.family_id,
            "context_used": context_text,
        }

    def to_dict(self) -> Dict[str, object]:
        return {
            "family_id": self.family_id,
            "name": self.name,
            "description": self.description,
            "members": self.members,
            "task_price": self.task_price,
            "last_active_at": self.last_active_at,
        }
