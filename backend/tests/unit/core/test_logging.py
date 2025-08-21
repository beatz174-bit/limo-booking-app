# tests/unit/core/test_logging.py
import logging
import os

import graypy
import pytest

from app.core.config import get_settings
from app.core.logging import setup_logging


@pytest.mark.parametrize(
    "level,expected",
    [("DEBUG", logging.DEBUG), ("INFO", logging.INFO)],
)
def test_setup_logging_respects_log_level(level: str, expected: int) -> None:
    old = os.environ.get("LOG_LEVEL")
    os.environ["LOG_LEVEL"] = level
    get_settings.cache_clear()
    try:
        setup_logging()
        assert logging.getLogger().getEffectiveLevel() == expected
    finally:
        if old is not None:
            os.environ["LOG_LEVEL"] = old
        else:
            os.environ.pop("LOG_LEVEL", None)
        logging.getLogger().handlers.clear()
        get_settings.cache_clear()


@pytest.mark.parametrize(
    "transport,handler_cls",
    [("udp", graypy.GELFUDPHandler), ("tcp", graypy.GELFTCPHandler)],
)
def test_graylog_handler_attached(
    monkeypatch: pytest.MonkeyPatch, transport: str, handler_cls: type
) -> None:
    monkeypatch.setenv("GRAYLOG_HOST", "graylog")
    monkeypatch.setenv("GRAYLOG_PORT", "12345")
    monkeypatch.setenv("GRAYLOG_TRANSPORT", transport)
    get_settings.cache_clear()
    try:
        setup_logging()
        handlers = [
            h for h in logging.getLogger().handlers if isinstance(h, handler_cls)
        ]
        assert handlers
        handler = handlers[0]
        assert handler.static_fields.get("env") == get_settings().env
    finally:
        logging.getLogger().handlers.clear()
        monkeypatch.delenv("GRAYLOG_HOST")
        monkeypatch.delenv("GRAYLOG_PORT")
        monkeypatch.delenv("GRAYLOG_TRANSPORT", raising=False)
        get_settings.cache_clear()
