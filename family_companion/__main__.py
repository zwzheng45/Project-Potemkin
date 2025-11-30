"""Entry point for `python -m family_companion`."""

import uvicorn


def main() -> None:
    uvicorn.run(
        "family_companion.server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )


if __name__ == "__main__":
    main()
