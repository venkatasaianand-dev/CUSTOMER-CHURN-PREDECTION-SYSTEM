from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ConfusionMatrix, FeatureImportance, NumericMetric


class FeatureSelectionRequest(BaseModel):
    """
    Kept for compatibility with the older flow where the user might select features.
    Current frontend uses excluded_columns + target_column; we compute final features server-side.
    """
    upload_id: str
    excluded_columns: List[str] = Field(default_factory=list)
    target_column: str


class TrainRequest(BaseModel):
    upload_id: str
    target_column: str
    excluded_columns: List[str] = Field(default_factory=list)
    model_name: Optional[str] = Field(default="xgboost", description="Currently supports xgboost only")


class TrainingMetrics(BaseModel):
    accuracy: NumericMetric
    precision: NumericMetric
    recall: NumericMetric
    f1: NumericMetric
    roc_auc: Optional[NumericMetric] = None
    pr_auc: Optional[NumericMetric] = None
    support: Optional[int] = None


class TrainResponse(BaseModel):
    status: str = "success"
    model_id: str
    model_name: str
    target_column: str
    feature_columns: List[str]
    metrics: TrainingMetrics
    confusion_matrix: ConfusionMatrix
    feature_importance: List[FeatureImportance] = Field(default_factory=list)
    notes: Optional[List[str]] = None
