from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger


settings = get_settings()
configure_logging(settings)

logger = get_logger(__name__)


def _ensure_runtime_dirs() -> None:
    """
    Create runtime directories if missing.
    These are used for uploads, processed datasets, model artifacts, and metadata.
    """
    for p in (
        Path(settings.uploads_dir),
        Path(settings.processed_dir),
        Path(settings.models_dir),
        Path(settings.metadata_dir),
    ):
        p.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_runtime_dirs()
    logger.info(
        "backend_startup",
        extra={
            "env": settings.environment,
            "uploads_dir": str(settings.uploads_dir),
            "processed_dir": str(settings.processed_dir),
            "models_dir": str(settings.models_dir),
            "metadata_dir": str(settings.metadata_dir),
        },
    )
    yield
    logger.info("backend_shutdown")


def _add_middlewares(app: FastAPI) -> None:
    # CORS (config-driven; no hardcoding)
    allow_origins = list(settings.cors_allow_origins or [])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins if allow_origins else [],
        allow_credentials=bool(settings.cors_allow_credentials),
        allow_methods=list(settings.cors_allow_methods or ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]),
        allow_headers=list(settings.cors_allow_headers or ["*"]),
        expose_headers=list(settings.cors_expose_headers or []),
        max_age=int(settings.cors_max_age),
    )

    # Request ID + basic timing logs (lightweight, no extra deps)
    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next: Callable[[Request], Response]) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            # Exception handlers will format response; we still log here for tracing.
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            logger.exception(
                "request_failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "elapsed_ms": elapsed_ms,
                },
            )
            raise

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        response.headers["x-request-id"] = request_id

        logger.info(
            "request_completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "elapsed_ms": elapsed_ms,
            },
        )
        return response


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=bool(settings.debug),
        lifespan=lifespan,
    )

    _add_middlewares(app)

    # Register consistent exception handlers (validation, app errors, unexpected errors)
    register_exception_handlers(app)

    # API routes
    app.include_router(api_router)

    return app


app = create_app()
