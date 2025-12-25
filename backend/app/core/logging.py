from __future__ import annotations

import logging
import sys
from typing import Optional

from pythonjsonlogger import jsonlogger

from app.core.config import Settings


class _ContextFilter(logging.Filter):
    """
    Ensures 'extra' fields don't break formatting and keeps base fields available.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Provide defaults for commonly-used fields
        if not hasattr(record, "request_id"):
            record.request_id = None
        if not hasattr(record, "trace_id"):
            record.trace_id = None
        if not hasattr(record, "event"):
            record.event = record.getMessage()
        return True


def configure_logging(settings: Settings) -> None:
    """
    Configure root logger. Idempotent-ish: if handlers exist, we replace them to ensure consistency.
    """
    level = getattr(logging, settings.log_level, logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)

    # Remove any existing handlers to avoid duplicate logs (common with reloaders)
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.addFilter(_ContextFilter())

    if settings.log_json:
        formatter = jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s %(event)s %(request_id)s %(trace_id)s",
        )
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    handler.setFormatter(formatter)
    root.addHandler(handler)

    # Quiet noisy loggers a bit
    logging.getLogger("uvicorn.error").setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(level)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    return logging.getLogger(name or __name__)
