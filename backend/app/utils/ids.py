from __future__ import annotations

import uuid


def new_id(prefix: str) -> str:
    """
    Create a short, URL-safe-ish identifier.
    Example: mdl_9f3a1c2d0e5b4d7a
    """
    return f"{prefix}_{uuid.uuid4().hex[:16]}"
