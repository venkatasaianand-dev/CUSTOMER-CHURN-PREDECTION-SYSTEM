"""
Compatibility module.

Your original backend used `app.models` to define Pydantic request/response models.
In the improved backend, schemas are organized under `app.schemas.*`.

To avoid breaking existing imports (and to keep changes minimal),
this module re-exports the public schemas from their new locations.

Prefer importing from `app.schemas` directly in new/updated code.
"""

from __future__ import annotations

# Common
from app.schemas.common import APIError, HealthResponse, MessageResponse

# Dataset / Upload / Preprocess
from app.schemas.datasets import (
    DatasetCreateResponse,
    DatasetInfo,
    DatasetUploadResponse,
    PreprocessRequest,
    PreprocessResponse,
    SchemaResponse,
)
from app.schemas.insights import DatasetSummaryResponse, TrainingSummaryResponse

# Training
from app.schemas.training import (
    FeatureSelectionRequest,
    TrainRequest,
    TrainResponse,
    TrainingMetrics,
)

# Prediction
from app.schemas.prediction import (
    PredictRequest,
    PredictResponse,
    PredictionExplanation,
    PredictionFactor,
    RecommendedAction,
)

__all__ = [
    # common
    "APIError",
    "HealthResponse",
    "MessageResponse",
    # datasets
    "DatasetCreateResponse",
    "DatasetInfo",
    "DatasetUploadResponse",
    "PreprocessRequest",
    "PreprocessResponse",
    "SchemaResponse",
    "DatasetSummaryResponse",
    "TrainingSummaryResponse",
    # training
    "FeatureSelectionRequest",
    "TrainRequest",
    "TrainResponse",
    "TrainingMetrics",
    # prediction
    "PredictRequest",
    "PredictResponse",
    "PredictionExplanation",
    "PredictionFactor",
    "RecommendedAction",
]
