import logging

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.logging import RequestLoggingMiddleware

pytestmark = pytest.mark.asyncio


async def dummy_app(scope, receive, send) -> None:
    pass


async def test_dispatch_logs_http_exception(caplog: pytest.LogCaptureFixture) -> None:
    middleware = RequestLoggingMiddleware(dummy_app)
    request = Request({"type": "http", "method": "GET", "path": "/fail", "headers": []})

    async def call_next(_: Request):
        raise HTTPException(status_code=418, detail="teapot")

    with caplog.at_level(logging.WARNING, logger="app.request"):
        with pytest.raises(HTTPException):
            await middleware.dispatch(request, call_next)  # type: ignore[arg-type]

    records = [r for r in caplog.records if r.levelno == logging.WARNING]
    assert records
    message = records[0].getMessage()
    assert "status=418" in message
    assert "detail=teapot" in message


async def test_dispatch_logs_unexpected_exception(
    caplog: pytest.LogCaptureFixture,
) -> None:
    middleware = RequestLoggingMiddleware(dummy_app)
    request = Request({"type": "http", "method": "GET", "path": "/boom", "headers": []})

    async def call_next(_: Request):
        raise ValueError("boom")

    with caplog.at_level(logging.ERROR, logger="app.request"):
        with pytest.raises(ValueError):
            await middleware.dispatch(request, call_next)  # type: ignore[arg-type]

    records = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert records
    assert "unhandled error" in records[0].getMessage()
