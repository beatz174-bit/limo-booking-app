"""Run the FastAPI application with uvicorn."""

import uvicorn
from app.core.config import get_settings
from app.main import app


def main() -> None:
    """Entrypoint for ``python -m app``."""
    settings = get_settings()
    # Pass ``log_config=None`` so uvicorn doesn't override our logging setup.
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level=settings.log_level.lower(),
        log_config=None,
    )


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()
