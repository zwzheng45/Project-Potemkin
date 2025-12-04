import io
import logging
import secrets
import time
from pathlib import Path
from typing import Dict, List

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image

from family_companion.auth import AuthService, UserAccount
from family_companion.config import settings
from family_companion.schemas import (
    AcceptInviteRequest,
    AuthResponse,
    ChatResponse,
    FamilyDetailResponse,
    FamilyResponse,
    ImportantEventsRequest,
    ImportantEventsResponse,
    InviteInfoResponse,
    InviteLinkResponse,
    InviteMemberRequest,
    LoginRequest,
    MemberResponse,
    MessageRequest,
    AvatarUploadResponse,
    ProfileResponse,
    SignupRequest,
    TimelineEventSchema,
    UpdateProfileRequest,
)
from family_companion.service import FamilyService
from family_companion.state import FamilyStateStore
from family_companion.memory import FamilyMemoryManager
from family_companion.chain import FamilyChainAdapter

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

state_store = FamilyStateStore()
service = FamilyService(
    state_store=state_store,
    memory_manager=FamilyMemoryManager(),
    chain_adapter=FamilyChainAdapter(),
)
auth = AuthService(state_store=state_store)
bearer_scheme = HTTPBearer(auto_error=False)

app = FastAPI(
    title="Unibase Family Companion",
    description="链上家庭陪伴AI：每个家庭拥有独立的长期记忆与画像。",
    version="0.2.0",
)

MEDIA_ROOT = Path(settings.media_dir).expanduser()
AVATAR_DIR = MEDIA_ROOT / "avatars"
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_ROOT)), name="media")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://pj-potemkin.zzw.moe",
    "https://pjkt-potemkin.zzw.moe",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _member_from_user(user: UserAccount) -> MemberResponse:
    return MemberResponse(
        user_id=user.user_id,
        name=user.name,
        email=user.email,
        role=user.role,
        bio=user.bio,
        avatar_url=user.avatar_url,
    )


def _invite_url(token: str) -> str:
    frontend_base = settings.frontend_base_url.rstrip("/")
    return f"{frontend_base}/?invite={token}"


def _media_base_url(request: Request) -> str:
    if settings.media_base_url:
        return settings.media_base_url.rstrip("/")
    return str(request.base_url).rstrip("/")


def _compress_avatar(content: bytes) -> bytes:
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty avatar file")
    try:
        image = Image.open(io.BytesIO(content))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from exc
    image = image.convert("RGB")
    max_side = 768
    image.thumbnail((max_side, max_side))
    target_bytes = settings.max_avatar_bytes
    attempt = image
    quality = 90
    for _ in range(12):
        buffer = io.BytesIO()
        attempt.save(buffer, format="WEBP", quality=quality, optimize=True)
        data = buffer.getvalue()
        if len(data) <= target_bytes:
            return data
        if quality > 55:
            quality -= 10
            continue
        new_width = max(256, int(attempt.size[0] * 0.85))
        new_height = max(256, int(attempt.size[1] * 0.85))
        if new_width <= 2 or new_height <= 2:
            break
        attempt = attempt.resize((new_width, new_height))
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Avatar must be under {target_bytes // 1024}KB after compression. Try a smaller image.",
    )


def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UserAccount:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing access token"
        )
    try:
        return auth.require_user(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "onchain": service.chain.summarize_status()}


@app.post("/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest) -> AuthResponse:
    try:
        agent = service.register_family(
            name=req.family_name,
            description=req.description,
            family_id=req.family_id,
            task_price=req.task_price,
            language=req.language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    try:
        user = auth.register_user(
            family_id=agent.family_id,
            email=req.email,
            password=req.password,
            name=req.user_name,
            role="owner",
        )
        # Mark ownership now that the user exists
        service.state.upsert_family(
            agent.family_id,
            {
                "name": agent.name,
                "description": agent.description,
                "language": agent.language,
                "owner_id": user.user_id,
            },
        )
        token, _ = auth.authenticate(req.email, req.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    family = service.family_detail(agent.family_id, user)
    return AuthResponse(
        token=token,
        user=_member_from_user(user),
        family=FamilyDetailResponse(**family),
    )


@app.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest) -> AuthResponse:
    try:
        token, user = auth.authenticate(req.email, req.password)
        family = service.family_detail(user.family_id, user)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return AuthResponse(
        token=token,
        user=_member_from_user(user),
        family=FamilyDetailResponse(**family),
    )


@app.get("/auth/invite/{token}", response_model=InviteInfoResponse)
def invite_info(token: str) -> InviteInfoResponse:
    invite = auth.get_invite(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    family = service.state.get_family(invite.family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Family not found for invite")
    expired = invite.expires_at is not None and invite.expires_at < time.time()
    return InviteInfoResponse(
        invite_token=invite.token,
        family_id=invite.family_id,
        family_name=family.get("name", invite.family_id),
        email=invite.email,
        name=invite.name,
        role=invite.role,
        expires_at=invite.expires_at,
        used=bool(invite.used_at),
        expired=expired,
    )


@app.post("/auth/invite/accept", response_model=AuthResponse)
def accept_invite(req: AcceptInviteRequest) -> AuthResponse:
    try:
        invited_user = auth.accept_invite(
            req.token,
            email=req.email,
            password=req.password,
            name=req.name,
        )
        token, user = auth.authenticate(req.email, req.password)
        family = service.family_detail(user.family_id, invited_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return AuthResponse(
        token=token,
        user=_member_from_user(user),
        family=FamilyDetailResponse(**family),
    )


@app.get("/me", response_model=ProfileResponse)
def me(user: UserAccount = Depends(current_user)) -> ProfileResponse:
    family = service.family_detail(user.family_id, user)
    return ProfileResponse(
        user=_member_from_user(user),
        family=FamilyDetailResponse(**family),
    )


@app.put("/me", response_model=ProfileResponse)
def update_profile(
    req: UpdateProfileRequest, user: UserAccount = Depends(current_user)
) -> ProfileResponse:
    updates: Dict[str, object] = {}
    if req.name is not None:
        name = req.name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Name cannot be empty"
            )
        updates["name"] = name
    if req.bio is not None:
        updates["bio"] = req.bio.strip() or None
    if req.avatar_url is not None:
        avatar_url = req.avatar_url.strip()
        updates["avatar_url"] = avatar_url or None
    try:
        updated_user = auth.update_user_profile(user.user_id, **updates)
        family = service.family_detail(updated_user.family_id, updated_user)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProfileResponse(
        user=_member_from_user(updated_user),
        family=FamilyDetailResponse(**family),
    )


@app.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    user: UserAccount = Depends(current_user),
) -> AvatarUploadResponse:
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed"
        )
    content = await file.read()
    compressed = _compress_avatar(content)
    filename = f"{user.user_id}_{secrets.token_hex(6)}.webp"
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    with open(AVATAR_DIR / filename, "wb") as handle:
        handle.write(compressed)
    url = f"{_media_base_url(request)}/media/avatars/{filename}"
    return AvatarUploadResponse(url=url, size=len(compressed))


@app.get("/families/me", response_model=FamilyDetailResponse)
def family_me(user: UserAccount = Depends(current_user)) -> FamilyDetailResponse:
    family = service.family_detail(user.family_id, user)
    return FamilyDetailResponse(**family)


@app.get("/families", response_model=List[FamilyDetailResponse])
def list_my_family(user: UserAccount = Depends(current_user)) -> List[FamilyDetailResponse]:
    family = service.family_detail(user.family_id, user)
    return [FamilyDetailResponse(**family)]


@app.post("/families", response_model=FamilyResponse)
def register_family_blocked() -> FamilyResponse:
    raise HTTPException(
        status_code=403, detail="Use /auth/signup to create a family with an owner account."
    )


@app.post("/families/{family_id}/members", response_model=InviteLinkResponse)
def invite_member(
    family_id: str,
    req: InviteMemberRequest,
    user: UserAccount = Depends(current_user),
) -> InviteLinkResponse:
    family = service.state.get_family(family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if family.get("owner_id") != user.user_id:
        raise HTTPException(
            status_code=403, detail="Only the family owner can invite members."
        )
    try:
        invite = auth.create_invite(
            family_id=family_id,
            email=req.email,
            name=req.name,
            role=req.role,
            created_by=user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return InviteLinkResponse(
        invite_token=invite.token,
        invite_url=_invite_url(invite.token),
        family_id=family_id,
        family_name=family.get("name", family_id),
        email=invite.email,
        name=invite.name,
        role=invite.role,
        expires_at=invite.expires_at,
    )


@app.post("/families/{family_id}/messages", response_model=ChatResponse)
def chat(
    family_id: str,
    req: MessageRequest,
    user: UserAccount = Depends(current_user),
) -> ChatResponse:
    if user.family_id != family_id:
        raise HTTPException(
            status_code=403, detail="You can only chat with your own family agent."
        )
    try:
        result = service.chat(family_id=family_id, user=user, content=req.content)
        return ChatResponse(**result)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive for demo
        logger.exception("chat failed: %s", exc)
        raise HTTPException(status_code=500, detail="chat failed") from exc


@app.get("/families/{family_id}/memory")
def memory(
    family_id: str,
    user: UserAccount = Depends(current_user),
) -> Dict[str, object]:
    if user.family_id != family_id:
        raise HTTPException(
            status_code=403, detail="You can only access your own family's memory."
        )
    try:
        return service.memory_snapshot(family_id, user=user)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


@app.put(
    "/families/{family_id}/important-events",
    response_model=ImportantEventsResponse,
)
def update_important_events(
    family_id: str,
    req: ImportantEventsRequest,
    user: UserAccount = Depends(current_user),
) -> ImportantEventsResponse:
    if user.family_id != family_id:
        raise HTTPException(
            status_code=403, detail="You can only modify your own family's events."
        )
    try:
        events = service.save_important_events(
            family_id,
            user,
            [event.dict() for event in req.events],
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return ImportantEventsResponse(
        events=[TimelineEventSchema(**event) for event in events]
    )
