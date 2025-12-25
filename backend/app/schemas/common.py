from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


RiskLevel = Literal["Low", "Medium", "High"]


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    environment: str
    version: str


class APIError(BaseModel):
    message: str
    code: str
    trace_id: str
    details: Optional[Dict[str, Any]] = None


class ColumnInfo(BaseModel):
    name: str
    dtype: str
    sample_values: List[Any] = Field(default_factory=list)
    null_count: int = 0
    unique_count: int = 0


class NumericMetric(BaseModel):
    value: float
    display: str


class ConfusionMatrix(BaseModel):
    labels: List[str] = Field(default_factory=lambda: ["0", "1"])
    matrix: List[List[int]] = Field(default_factory=list)


class FeatureImportance(BaseModel):
    feature: str
    importance: float
