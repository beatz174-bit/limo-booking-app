# tests/unit/core/test_logging.py
import logging
import os

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
