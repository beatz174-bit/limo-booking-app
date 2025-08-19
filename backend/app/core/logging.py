import logging
from logging.config import dictConfig
from typing import Callable

from app.core.config import get_settings
from time import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


def setup_logging() -> None:
    """Configure application-wide logging."""
    settings = get_settings()
    log_level = settings.log_level.upper()
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            }
        },
        "handlers": {
            "default": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "stream": "ext://sys.stdout",
            }
        },
        "root": {"level": log_level, "handlers": ["default"]},
    }
    dictConfig(logging_config)

    # ensure uvicorn uses our configuration
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(logger_name).handlers = []
        logging.getLogger(logger_name).propagate = True


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log basic request information for each HTTP request."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:  # type: ignore[override]
        logger = logging.getLogger("app.request")
        start = time()
        response = await call_next(request)
        process_time = (time() - start) * 1000
        logger.info(
            "%s %s status=%s duration=%.2fms",
            request.method,
            request.url.path,
            response.status_code,
            process_time,
        )
        return response
