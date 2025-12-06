import os
from dataclasses import dataclass
from typing import Optional


def _as_bool(value: str, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass
class Settings:
    """Lightweight configuration loader for the family companion agent."""

    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    openai_model_name: str = os.getenv("OPENAI_MODEL_NAME", "gpt-4.1-mini")
    frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "https://pjkt-potemkin.zzw.moe")
    default_task_price: int = int(os.getenv("MEMBASE_TASK_PRICE", "100000"))
    auto_upload_to_hub: bool = _as_bool(os.getenv("MEMBASE_AUTO_UPLOAD", "true"), default=True)
    hub_base_url: str = os.getenv("MEMBASE_HUB", "https://testnet.hub.membase.io")
    membase_account: Optional[str] = os.getenv("MEMBASE_ACCOUNT")
    membase_secret_key: Optional[str] = os.getenv("MEMBASE_SECRET_KEY")
    membase_id: Optional[str] = os.getenv("MEMBASE_ID")
    media_dir: str = os.getenv(
        "MEDIA_DIR", os.path.expanduser("~/.membase/family_agents/uploads")
    )
    media_base_url: Optional[str] = os.getenv("MEDIA_BASE_URL")
    max_avatar_bytes: int = int(os.getenv("AVATAR_MAX_BYTES", str(200 * 1024)))

    def require_openai(self) -> None:
        if not self.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for long-term memory and replies.")

    def require_onchain(self) -> None:
        if not self.membase_account or not self.membase_secret_key or not self.membase_id:
            raise RuntimeError("MEMBASE_ACCOUNT, MEMBASE_SECRET_KEY, and MEMBASE_ID are required for on-chain flows.")


settings = Settings()
