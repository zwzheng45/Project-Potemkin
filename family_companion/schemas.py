from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class FamilyMember(BaseModel):
    name: str = Field(..., description="成员名称/称谓")
    identity: str = Field(..., description="家庭中的身份")


class CreateFamilyRequest(BaseModel):
    name: str = Field(..., description="家庭名称")
    description: str = Field("", description="家庭/家庭成员的简介或陪伴偏好")
    family_id: Optional[str] = Field(
        None, description="可选自定义family_id，如果不填则自动生成"
    )
    task_price: Optional[int] = Field(
        None, description="在链上创建家庭空间的stake价格(可选)", ge=0
    )
    members: List[FamilyMember] = Field(
        default_factory=list, description="家庭成员/身份列表"
    )


class UpdateFamilyRequest(BaseModel):
    description: Optional[str] = Field(
        None, description="家庭简介（覆盖更新）"
    )
    task_price: Optional[int] = Field(
        None, description="Stake 价格（覆盖更新）", ge=0
    )
    members: Optional[List[FamilyMember]] = Field(
        None, description="替换家庭成员列表"
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
