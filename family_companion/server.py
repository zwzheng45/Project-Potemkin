import logging
from typing import Dict, List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware

from family_companion.auth import AuthService, UserAccount
from family_companion.schemas import (
    AuthResponse,
    ChatResponse,
    FamilyDetailResponse,
    FamilyResponse,
    InviteMemberRequest,
    LoginRequest,
    MemberResponse,
    MessageRequest,
    ProfileResponse,
    SignupRequest,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/me", response_model=ProfileResponse)
def me(user: UserAccount = Depends(current_user)) -> ProfileResponse:
    family = service.family_detail(user.family_id, user)
    return ProfileResponse(
        user=_member_from_user(user),
        family=FamilyDetailResponse(**family),
    )


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


@app.post("/families/{family_id}/members", response_model=MemberResponse)
def invite_member(
    family_id: str,
    req: InviteMemberRequest,
    user: UserAccount = Depends(current_user),
) -> MemberResponse:
    family = service.state.get_family(family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if family.get("owner_id") != user.user_id:
        raise HTTPException(
            status_code=403, detail="Only the family owner can invite members."
        )
    try:
        new_user = auth.register_user(
            family_id=family_id,
            email=req.email,
            password=req.password,
            name=req.name,
            role=req.role,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _member_from_user(new_user)


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
