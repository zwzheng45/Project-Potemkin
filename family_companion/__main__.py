"""Entry point for `python -m family_companion`."""

import uvicorn

from family_companion.config import settings


def main() -> None:
    uvicorn.run(
        "family_companion.server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level=settings.log_level.lower(),
        log_config=None,
    )


if __name__ == "__main__":
    main()
