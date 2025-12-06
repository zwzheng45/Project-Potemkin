import json
import logging
from dataclasses import dataclass, field
from typing import List, Optional

from openai import OpenAI

from family_companion.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EventNote:
    content: str
    date: Optional[str] = None


@dataclass
class MemoryClassification:
    visibility: str = "family"  # family | private | public
    important_events: List[EventNote] = field(default_factory=list)
    private_notes: List[str] = field(default_factory=list)
    public_notes: List[str] = field(default_factory=list)

    @property
    def share_with_family(self) -> bool:
        return self.visibility != "private"


class MemoryClassifier:
    """Uses an LLM to assign a user turn to the correct memory buckets."""

    def __init__(self, client: OpenAI) -> None:
        self.client = client

    def classify(
        self,
        *,
        user_name: str,
        content: str,
        language: str,
        family_description: str = "",
        recent_user_context: str = "",
    ) -> MemoryClassification:
        prompt = self._build_prompt(
            user_name=user_name,
            content=content,
            language=language,
            family_description=family_description,
            recent_user_context=recent_user_context,
        )
        try:
            response = self.client.chat.completions.create(
                model=settings.openai_model_name,
                messages=prompt,
                temperature=0.1,
                max_tokens=320,
            )
            raw = response.choices[0].message.content or ""
            return self._parse_response(raw)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("memory classification failed, fallback to defaults: %s", exc)
            return MemoryClassification()

    def _build_prompt(
        self,
        *,
        user_name: str,
        content: str,
        language: str,
        family_description: str,
        recent_user_context: str,
    ) -> List[dict]:
        context = recent_user_context.strip() or "无"
        family_desc = family_description.strip() or "无"
        return [
            {
                "role": "system",
                "content": (
                    "你是家庭陪伴AI的记忆分层助手，需要把用户的最新发言自动归类到不同的记忆池。"
                    "务必保护隐私，输出可被json.loads解析的JSON，内容使用家庭设定语言。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"家庭简介: {family_desc}\n"
                    f"家庭设定语言: {language}\n"
                    f"最近该用户的对话摘录(新->旧，可为空):\n{context}\n\n"
                    f"当前用户({user_name})输入:\n{content}\n\n"
                    "请严格输出如下JSON，不要添加任何前缀/后缀/注释：\n"
                    "{\n"
                    '  \"visibility\": \"private|family|public\",\n'
                    '  \"important_events\": [{\"content\": \"事件摘要\", \"date\": \"YYYY-MM-DD或YYYY-MM-DDThh:mm(若有)\"}],\n'
                    '  \"private_notes\": [\"用户明确不希望他人知道的隐私要点\"],\n'
                    '  \"public_notes\": [\"用户明确同意可对第三方开放的内容\"]\n'
                    "}\n"
                    "规则：\n"
                    "1) 当用户要求保密时，涉及家庭关系敏感等，visibility 为 private，此时仅限自己和助手可见，不要记录到公开家庭记忆"
                    "当在用户表示可外部共享给第三方服务为 public ；否则一般为 family。\n"
                    "2) important_events 只记录真正重要的事件/纪念日/考试/手术/旅行/重要会议/账单截止等，必须能定位日期或时间段；"
                    "日常闲聊、无日期的琐事、心情、通用提醒全部忽略。最多2-3条；拿不准就留空数组。"
                    "date 字段必须使用 ISO 8601 格式（YYYY-MM-DD 或带时间），没有日期就不要写入该列表。\n"
                    "3) private_notes 仅在有私密信息时填写，最多3条；不要把私密内容放入其他字段。\n"
                    "4) public_notes 仅在用户明确允许对第三方开放时填写，最多3条；不确定时留空数组。\n"
                    "5) 所有条目用简短要点表达，语言遵循家庭设定语言。"
                ),
            },
        ]

    def _parse_response(self, raw: str) -> MemoryClassification:
        cleaned = raw.strip().replace("```json", "").replace("```", "")
        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning("memory classification JSON parse failed, raw=%s", raw)
            return MemoryClassification()

        visibility = str(payload.get("visibility", "family")).lower()
        if visibility not in {"family", "private", "public"}:
            visibility = "family"

        def _clean_list(key: str) -> List[str]:
            items = payload.get(key, []) or []
            if not isinstance(items, list):
                return []
            return [str(item).strip() for item in items if str(item).strip()]

        def _clean_events() -> List[EventNote]:
            items = payload.get("important_events", []) or []
            if not isinstance(items, list):
                return []
            cleaned_events: List[EventNote] = []
            for item in items:
                if isinstance(item, dict):
                    content = str(item.get("content") or item.get("text") or "").strip()
                    date = str(item.get("date") or "").strip() or None
                else:
                    content = str(item or "").strip()
                    date = None
                if content and date:
                    cleaned_events.append(EventNote(content=content, date=date))
                if len(cleaned_events) >= 3:
                    break
            return cleaned_events

        return MemoryClassification(
            visibility=visibility,
            important_events=_clean_events(),
            private_notes=_clean_list("private_notes"),
            public_notes=_clean_list("public_notes"),
        )
