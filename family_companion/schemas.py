from typing import Dict, List, Optional

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
    content: str = Field(..., description="聊天内容")


class FamilyResponse(BaseModel):
    family_id: str
    name: str
    description: str
    language: str
    owner_id: Optional[str] = None


class MemberResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str = "member"


class FamilyDetailResponse(FamilyResponse):
    members: List[MemberResponse] = Field(default_factory=list)


class ChatResponse(BaseModel):
    family_id: str
    user_id: str
    user_name: str
    reply: str
    context_used: str
    memory: Dict[str, object]


class SignupRequest(BaseModel):
    family_name: str = Field(..., description="家庭名称")
    description: str = Field("", description="家庭简介")
    language: str = Field("zh", description="家庭首选语言")
    family_id: Optional[str] = Field(
        None, description="可选自定义family_id，如果不填则自动生成"
    )
    task_price: Optional[int] = Field(None, description="链上空间stake(可选)")
    user_name: str = Field(..., description="家庭创建者姓名")
    email: str = Field(..., description="登录邮箱")
    password: str = Field(..., description="登录密码")


class LoginRequest(BaseModel):
    email: str = Field(..., description="登录邮箱")
    password: str = Field(..., description="登录密码")


class AuthResponse(BaseModel):
    token: str
    user: MemberResponse
    family: FamilyDetailResponse


class InviteMemberRequest(BaseModel):
    name: str = Field(..., description="家庭成员姓名")
    email: str = Field(..., description="成员邮箱")
    role: str = Field("member", description="角色，默认成员，可选 owner/member")


class InviteLinkResponse(BaseModel):
    invite_token: str
    invite_url: str
    family_id: str
    family_name: str
    email: str
    name: str
    role: str = "member"
    expires_at: Optional[float] = None


class InviteInfoResponse(BaseModel):
    invite_token: str
    family_id: str
    family_name: str
    email: str
    name: str
    role: str = "member"
    expires_at: Optional[float] = None
    used: bool = False
    expired: bool = False


class AcceptInviteRequest(BaseModel):
    token: str = Field(..., description="邀请链接中的token")
    name: str = Field(..., description="成员姓名")
    email: str = Field(..., description="成员邮箱")
    password: str = Field(..., description="成员密码")


class ProfileResponse(BaseModel):
    user: MemberResponse
    family: FamilyDetailResponse
