from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import admin, datasets, models, root

api_router = APIRouter()
api_router.include_router(root.router, tags=["root"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
