import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from openai import OpenAI

from family_companion.config import settings
from family_companion.memory import FamilyMemoryManager
from family_companion.chain import FamilyChainAdapter
from family_companion.auth import UserAccount

logger = logging.getLogger(__name__)


@dataclass
class FamilyAgent:
    """Represents a single family's companion agent."""

    family_id: str
    name: str
    description: str
    language: str
    memory: FamilyMemoryManager
    chain: FamilyChainAdapter
    client: OpenAI = field(init=False)

    def __post_init__(self) -> None:
        settings.require_openai()
        self.client = OpenAI(api_key=settings.openai_api_key)

    def _render_context(self, messages, members: Dict[str, UserAccount]) -> str:
        rendered: List[str] = []
        for msg in messages:
            metadata = getattr(msg, "metadata", {}) or {}
            speaker = metadata.get("speaker")
            user_id = metadata.get("user_id")
            if msg.role == "assistant":
                prefix = "助手"
            else:
                # Prefer stored member names so the agent can tell speakers apart
                prefix = speaker or members.get(user_id, UserAccount("", "", "", "", "")).name or "用户"
            rendered.append(f"[{prefix}] {msg.content}")
        return "\n".join(rendered) if rendered else "暂无历史记忆"

    def chat(
        self,
        user: UserAccount,
        content: str,
        members: Optional[Dict[str, UserAccount]] = None,
    ) -> Dict[str, object]:
        members = members or {}
        logger.info("family %s <- %s: %s", self.family_id, user.name, content)
        self.memory.add_user_message(self.family_id, user.user_id, user.name, content)
        family_context_msgs = self.memory.context(self.family_id, recent_n=8)
        user_context_msgs = self.memory.user_context(self.family_id, user.user_id, recent_n=6)
        family_context = self._render_context(family_context_msgs, members)
        user_context = self._render_context(user_context_msgs, members)

        member_names = ", ".join([m.name for m in members.values()]) or "未登记"

        system_prompt = (
            f"你是{self.name}家庭的链上陪伴AI，负责日常陪伴、提醒、情绪关怀。"
            "输出要温暖、具体，并给出可执行的小建议。"
            f"当前家庭说明: {self.description}。"
            "可以结合长期记忆、家庭画像和最新上下文回答。"
            f"请使用家庭首选语言({self.language})输出。"
            f"当前说话人: {user.name}。家庭成员: {member_names}。"
        )

        completion = self.client.chat.completions.create(
            model=settings.openai_model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "system",
                    "content": (
                        "长期/画像/上下文参考（包含家人之间的对话，assistant要区分说话人）:\n"
                        f"{family_context}"
                    ),
                },
                {
                    "role": "system",
                    "content": (
                        f"{user.name}个人最近对话（只包含他/她与助手的交互）:\n{user_context}"
                    ),
                },
                {"role": "user", "content": content},
            ],
            temperature=0.4,
            max_tokens=512,
        )
        reply = completion.choices[0].message.content.strip()
        logger.info("family %s -> reply length=%s", self.family_id, len(reply))
        self.memory.add_agent_message(self.family_id, user.user_id, reply)

        snapshot = self.memory.snapshot(self.family_id, user_id=user.user_id)
        return {
            "reply": reply,
            "memory": snapshot,
            "family_id": self.family_id,
            "user_id": user.user_id,
            "user_name": user.name,
            "context_used": f"family:\n{family_context}\n\nuser:\n{user_context}",
        }

    def to_dict(self) -> Dict[str, str]:
        return {
            "family_id": self.family_id,
            "name": self.name,
            "description": self.description,
            "language": self.language,
        }
