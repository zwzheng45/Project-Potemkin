from typing import Dict, Optional

from pydantic import BaseModel, Field


class CreateFamilyRequest(BaseModel):
    name: str = Field(..., description="家庭名称")
    description: str = Field("", description="家庭/家庭成员的简介或陪伴偏好")
    family_id: Optional[str] = Field(None, description="可选自定义family_id，如果不填则自动生成")
    task_price: Optional[int] = Field(
        None, description="在链上创建家庭空间的stake价格(可选)"
    )
    language: str = Field(
        "zh",
        description="家庭首选语言（例如 zh/en/es/fr/ja），将用于输出与提示。",
    )


class MessageRequest(BaseModel):
    sender: str = Field(..., description="说话人，如妈妈/爸爸/孩子")
    content: str = Field(..., description="聊天内容")


class FamilyResponse(BaseModel):
    family_id: str
    name: str
    description: str
    language: str


class ChatResponse(BaseModel):
    family_id: str
    reply: str
    context_used: str
    memory: Dict[str, object]
