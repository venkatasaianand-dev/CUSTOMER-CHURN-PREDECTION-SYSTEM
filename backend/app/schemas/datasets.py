from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ColumnInfo


class DatasetInfo(BaseModel):
    """
    Returned after upload, used by frontend to show dataset overview.
    """
    upload_id: str
    filename: str
    shape: List[int] = Field(..., description="[rows, cols]")
    columns: List[ColumnInfo]


class DatasetUploadResponse(BaseModel):
    # Kept for future expansion; DatasetInfo is the main response used.
    dataset: DatasetInfo


class DatasetCreateResponse(BaseModel):
    upload_id: str
    message: str


class PreprocessRequest(BaseModel):
    upload_id: str
    excluded_columns: List[str] = Field(default_factory=list)
    target_column: str


class PreprocessResponse(BaseModel):
    status: Literal["success"] = "success"
    upload_id: str
    target_column: str
    feature_columns: List[str]
    shape: List[int] = Field(..., description="[rows, cols]")
    preview: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[List[str]] = None


class SchemaField(BaseModel):
    name: str
    dtype: Literal["number", "string", "boolean"] = "string"
    required: bool = True
    allowed_values: Optional[List[str]] = None
    example: Optional[Any] = None
    description: Optional[str] = None


class SchemaResponse(BaseModel):
    model_id: str
    target_column: str
    feature_columns: List[str]
    fields: List[SchemaField]
