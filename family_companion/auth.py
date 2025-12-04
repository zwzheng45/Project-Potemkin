import base64
import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from family_companion.state import FamilyStateStore

PASSWORD_ITERATIONS = 120_000
SESSION_TTL_SECONDS = 7 * 24 * 3600  # 7 days
INVITE_TTL_SECONDS = 7 * 24 * 3600  # 7 days


@dataclass
class UserAccount:
    user_id: str
    family_id: str
    email: str
    name: str
    role: str = "member"
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


@dataclass
class Invite:
    token: str
    family_id: str
    email: str
    name: str
    role: str = "member"
    created_by: Optional[str] = None
    created_at: Optional[float] = None
    expires_at: Optional[float] = None
    used_at: Optional[float] = None


class SessionManager:
    """In-memory session token store with expiry."""

    def __init__(self, ttl_seconds: int = SESSION_TTL_SECONDS) -> None:
        self.ttl_seconds = ttl_seconds
        self.sessions: Dict[str, Dict[str, float]] = {}

    def issue(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        self.sessions[token] = {
            "user_id": user_id,
            "expires_at": time.time() + self.ttl_seconds,
        }
        return token

    def resolve(self, token: str) -> Optional[str]:
        session = self.sessions.get(token)
        if not session:
            return None
        if session["expires_at"] < time.time():
            self.sessions.pop(token, None)
            return None
        return session["user_id"]


class AuthService:
    """User registration, authentication, and session issuance."""

    def __init__(
        self,
        state_store: Optional[FamilyStateStore] = None,
        session_manager: Optional[SessionManager] = None,
    ) -> None:
        self.state = state_store or FamilyStateStore()
        self.sessions = session_manager or SessionManager()

    def _hash_password(self, password: str, salt: Optional[str] = None) -> Tuple[str, str]:
        salt = salt or secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            PASSWORD_ITERATIONS,
        )
        return salt, base64.b64encode(digest).decode("utf-8")

    def _verify_password(self, password: str, salt: str, password_hash: str) -> bool:
        _, computed = self._hash_password(password, salt=salt)
        return hmac.compare_digest(computed, password_hash)

    def _to_model(self, user_id: str, payload: Dict[str, str]) -> UserAccount:
        return UserAccount(
            user_id=user_id,
            family_id=payload["family_id"],
            email=payload["email"],
            name=payload.get("name", payload["email"]),
            role=payload.get("role", "member"),
            bio=payload.get("bio"),
            avatar_url=payload.get("avatar_url"),
        )

    def _invite_from_payload(self, token: str, payload: Dict[str, object]) -> Invite:
        return Invite(
            token=token,
            family_id=str(payload["family_id"]),
            email=str(payload.get("email", "")),
            name=str(payload.get("name") or payload.get("email") or ""),
            role=str(payload.get("role", "member")),
            created_by=payload.get("created_by"),
            created_at=payload.get("created_at"),
            expires_at=payload.get("expires_at"),
            used_at=payload.get("used_at"),
        )

    def register_user(
        self,
        *,
        family_id: str,
        email: str,
        password: str,
        name: str,
        role: str = "member",
    ) -> UserAccount:
        if not self.state.get_family(family_id):
            raise ValueError("family does not exist")
        existing = self.state.find_user_by_email(email)
        if existing:
            raise ValueError("email already registered")

        salt, password_hash = self._hash_password(password)
        user_id = secrets.token_hex(8)
        self.state.upsert_user(
            user_id,
            {
                "family_id": family_id,
                "email": email,
                "name": name,
                "role": role,
                "salt": salt,
                "password_hash": password_hash,
                "bio": None,
                "avatar_url": None,
            },
        )
        self.state.add_family_member(family_id, user_id)
        return self._to_model(user_id, self.state.get_user(user_id) or {})

    def create_invite(
        self,
        *,
        family_id: str,
        email: str,
        name: str,
        role: str = "member",
        created_by: Optional[str] = None,
    ) -> Invite:
        if not self.state.get_family(family_id):
            raise ValueError("family does not exist")
        if self.state.find_user_by_email(email):
            raise ValueError("email already registered")

        token = secrets.token_urlsafe(24)
        created_at = time.time()
        payload: Dict[str, object] = {
            "family_id": family_id,
            "email": email,
            "name": name or email,
            "role": role,
            "created_at": created_at,
            "expires_at": created_at + INVITE_TTL_SECONDS,
        }
        if created_by:
            payload["created_by"] = created_by
        self.state.save_invite(token, payload)
        return self._invite_from_payload(token, payload)

    def get_invite(self, token: str) -> Optional[Invite]:
        payload = self.state.get_invite(token)
        if not payload:
            return None
        return self._invite_from_payload(token, payload)

    def require_invite(self, token: str) -> Invite:
        invite = self.get_invite(token)
        if not invite:
            raise ValueError("invalid invite token")
        if invite.used_at:
            raise ValueError("invite already used")
        if invite.expires_at and invite.expires_at < time.time():
            raise ValueError("invite expired")
        if not self.state.get_family(invite.family_id):
            raise ValueError("family does not exist")
        return invite

    def accept_invite(
        self,
        token: str,
        *,
        email: str,
        password: str,
        name: Optional[str] = None,
    ) -> UserAccount:
        invite = self.require_invite(token)
        if invite.email and invite.email.lower() != email.lower():
            raise ValueError("invite email mismatch")
        user = self.register_user(
            family_id=invite.family_id,
            email=email,
            password=password,
            name=name or invite.name or email,
            role=invite.role,
        )
        self.state.mark_invite_used(token)
        return user

    def authenticate(self, email: str, password: str) -> Tuple[str, UserAccount]:
        found = self.state.find_user_by_email(email)
        if not found:
            raise ValueError("invalid credentials")
        user_id, payload = found
        if not self._verify_password(password, payload["salt"], payload["password_hash"]):
            raise ValueError("invalid credentials")
        token = self.sessions.issue(user_id)
        return token, self._to_model(user_id, payload)

    def require_user(self, token: str) -> UserAccount:
        user_id = self.sessions.resolve(token)
        if not user_id:
            raise ValueError("invalid or expired token")
        payload = self.state.get_user(user_id)
        if not payload:
            raise ValueError("user not found")
        return self._to_model(user_id, payload)

    def list_family_members(self, family_id: str) -> Dict[str, UserAccount]:
        members = self.state.list_family_members(family_id)
        return {uid: self._to_model(uid, user) for uid, user in members.items()}

    def update_user_profile(
        self,
        user_id: str,
        *,
        name: Optional[str] = None,
        bio: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> UserAccount:
        current = self.state.get_user(user_id)
        if not current:
            raise KeyError("user not found")
        updates: Dict[str, Optional[str]] = {}
        if name is not None:
            updates["name"] = name
        if bio is not None:
            updates["bio"] = bio
        if avatar_url is not None:
            updates["avatar_url"] = avatar_url
        self.state.upsert_user(user_id, {**current, **updates})
        merged = self.state.get_user(user_id) or {**current, **updates}
        return self._to_model(user_id, merged)
