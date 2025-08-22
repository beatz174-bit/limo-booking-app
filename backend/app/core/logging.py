import logging
import os
from contextvars import ContextVar
from logging.config import dictConfig
from time import time
from typing import Callable, Dict, Optional
from uuid import uuid4

import graypy
from fastapi import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings

# context variable for per-request correlation IDs
request_id_ctx_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class RequestIdFilter(logging.Filter):
    """Inject the correlation ID into log records."""

    def filter(self, record: logging.LogRecord) -> bool:  # pragma: no cover - trivial
        record.request_id = request_id_ctx_var.get()
        return True


class FacilityFilter(logging.Filter):
    """Set the facility on log records to the logger's name."""

    def filter(self, record: logging.LogRecord) -> bool:  # pragma: no cover - trivial
        record.facility = record.name
        return True


def _graylog_handler(
    host: str, port: int, static_fields: Optional[Dict[str, str]] = None
) -> logging.Handler:
    settings = get_settings()
    transport = os.getenv("GRAYLOG_TRANSPORT", "udp").lower()
    if transport == "tcp":
        handler: logging.Handler = graypy.GELFTCPHandler(host, port)
    else:
        handler = graypy.GELFUDPHandler(host, port)
    fields = {
        "env": settings.env,
        "source": settings.app_name,
        "node": "backend",
    }
    if static_fields:
        fields.update(static_fields)
    handler.static_fields = fields
    return handler


def setup_logging() -> None:
    """Configure application-wide logging."""
    settings = get_settings()
    log_level = settings.log_level.upper()
    handlers = {
        "default": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "filters": ["request_id", "facility"],
            "stream": "ext://sys.stdout",
        }
    }
    root_handlers = ["default"]
    if settings.graylog_host:
        handlers["graylog"] = {
            "()": "app.core.logging._graylog_handler",
            "formatter": "default",
            "filters": ["request_id", "facility"],
            "host": settings.graylog_host,
            "port": settings.graylog_port,
        }
        root_handlers.append("graylog")

    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "fmt": "%(asctime)s %(levelname)s %(name)s %(request_id)s %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            }
        },
        "filters": {
            "request_id": {"()": "app.core.logging.RequestIdFilter"},
            "facility": {"()": "app.core.logging.FacilityFilter"},
        },
        "handlers": handlers,
        "root": {"level": log_level, "handlers": root_handlers},
    }
    dictConfig(logging_config)
    # `dictConfig` may reset the root logger to WARNING which hides debug logs.
    # Explicitly set the root level so our configured `LOG_LEVEL` always wins.
    logging.getLogger().setLevel(log_level)

    # ensure uvicorn uses our configuration
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(logger_name).handlers = []
        logging.getLogger(logger_name).propagate = True


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log basic request information for each HTTP request."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:  # type: ignore[override]
        logger = logging.getLogger("app.request")
        request_id = str(uuid4())
        request.state.request_id = request_id
        token = request_id_ctx_var.set(request_id)
        start = time()
        try:
            response = await call_next(request)
        except HTTPException as exc:
            logger.warning(
                "%s %s status=%s detail=%s",
                request.method,
                request.url.path,
                exc.status_code,
                exc.detail,
            )
            raise
        except Exception:
            logger.exception("%s %s unhandled error", request.method, request.url.path)
            raise
        finally:
            request_id_ctx_var.reset(token)
        process_time = (time() - start) * 1000
        logger.info(
            "%s %s status=%s duration=%.2fms",
            request.method,
            request.url.path,
            response.status_code,
            process_time,
        )
        return response
