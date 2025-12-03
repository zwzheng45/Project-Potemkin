import logging
from typing import Optional

from family_companion.config import settings

logger = logging.getLogger(__name__)


class FamilyChainAdapter:
    """
    Thin wrapper around membase_chain so that the rest of the app does not crash
    when chain credentials are missing. All methods become no-ops when disabled.
    """

    def __init__(self) -> None:
        self.enabled = False
        self._chain = None
        self._agent_uuid = None

        try:
            from membase.chain.chain import membase_chain, membase_id

            self._chain = membase_chain
            self._agent_uuid = membase_id
            self.enabled = True
            logger.info("Membase on-chain client loaded with agent %s", membase_id)
        except SystemExit:
            logger.warning(
                "Membase chain credentials missing; on-chain auth is disabled for now."
            )
        except Exception as exc:  # pragma: no cover - defensive path
            logger.warning("Unable to load membase_chain: %s", exc)

    @property
    def agent_uuid(self) -> Optional[str]:
        return self._agent_uuid

    def ensure_family_space(self, family_id: str, price: Optional[int] = None) -> None:
        """
        Create the on-chain memory space (task) for a family if it does not exist.
        """
        if not self.enabled:
            return

        task_price = price or settings.default_task_price
        try:
            self._chain.createTask(family_id, task_price)
            logger.info("Ensured on-chain family space %s with price %s", family_id, task_price)
        except Exception as exc:
            logger.warning("createTask failed for %s: %s", family_id, exc)

    def grant_agent_access(self, family_id: str, agent_uuid: Optional[str] = None) -> None:
        """
        Make sure the service agent has permission to operate on the family space.
        """
        if not self.enabled:
            return

        target_agent = agent_uuid or self._agent_uuid
        if not target_agent:
            logger.warning("No agent uuid available to grant access for %s", family_id)
            return

        try:
            if not self._chain.has_auth(family_id, target_agent):
                self._chain.buy(family_id, target_agent)
                logger.info("Granted agent %s access to family %s", target_agent, family_id)
        except Exception as exc:
            logger.warning("grant_agent_access failed for %s: %s", family_id, exc)

    def summarize_status(self) -> str:
        if not self.enabled:
            return "disabled"
        return f"enabled (agent {self._agent_uuid})"
