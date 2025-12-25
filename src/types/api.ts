// Types aligned to the improved backend responses.
// Backend routes:
//   POST /datasets/upload
//   POST /datasets/preprocess
//   POST /models/train
//   GET  /models/schema/{model_id}
//   POST /models/predict
//   POST /admin/reset
//
// Additional (optional) for refresh fallback:
//   GET /models/details/{model_id}  (or /models/{model_id}, /models/metadata/{model_id})
//   -> returns TrainResponse

export type MessageResponse = {
  message: string;
};

export type HealthResponse = {
  status: "ok";
  environment: string;
  version: string;
};

export type APIError = {
  message: string;
  code: string;
  trace_id: string;
  details?: Record<string, any> | null;
};

export type ColumnInfo = {
  name: string;
  dtype: string;
  sample_values: any[];
  null_count: number;
  unique_count: number;
};

export type DatasetInfo = {
  upload_id: string;
  filename: string;
  shape: [number, number];
  columns: ColumnInfo[];
};

export type PreprocessRequest = {
  upload_id: string;
  excluded_columns: string[];
  target_column: string;
};

export type PreprocessResponse = {
  status: "success";
  upload_id: string;
  target_column: string;
  feature_columns: string[];
  shape: [number, number];
  preview: Record<string, any>[];
  notes?: string[] | null;
};

export type TrainRequest = {
  upload_id: string;
  target_column: string;
  excluded_columns: string[];
  model_name?: string;
};

export type NumericMetric = {
  value: number;
  display: string;
};

export type TrainingMetrics = {
  accuracy: NumericMetric;
  precision: NumericMetric;
  recall: NumericMetric;
  f1: NumericMetric;
  roc_auc?: NumericMetric | null;
  pr_auc?: NumericMetric | null;
  support?: number | null;
};

export type ConfusionMatrix = {
  labels: string[];
  matrix: number[][];
};

export type FeatureImportance = {
  feature: string;
  importance: number;
};

export type TrainResponse = {
  status: string; // "success"
  model_id: string;
  model_name: string;
  target_column: string;
  feature_columns: string[];
  metrics: TrainingMetrics;
  confusion_matrix: ConfusionMatrix;
  feature_importance: FeatureImportance[];
  notes?: string[] | null;
};

export type SchemaField = {
  name: string;
  dtype: "number" | "string" | "boolean";
  required: boolean;
  allowed_values?: string[] | null;
  example?: any;
  description?: string | null;
};

export type SchemaResponse = {
  model_id: string;
  target_column: string;
  feature_columns: string[];
  fields: SchemaField[];
};

export type PredictRequest = {
  model_id: string;
  input_data: Record<string, any>;
};

export type RiskLevel = "Low" | "Medium" | "High";

export type PredictionFactor = {
  feature: string;
  direction?: string | null;
  contribution?: number | null;
  reasoning?: string | null;
};

export type PredictionExplanation = {
  summary: string;
  key_factors: PredictionFactor[];
  confidence_note?: string | null;
  llm_used?: boolean;
  llm_model?: string | null;
};

export type RecommendedAction = {
  action: string;
  reason: string;
  priority: number; // 1..5
  expected_impact?: string | null;
};

export type PredictResponse = {
  status: string; // "success"
  model_id: string;
  prediction: number; // 0/1
  probability: number; // 0..1
  risk_level: RiskLevel;
  explanation: PredictionExplanation;
  recommended_actions: RecommendedAction[];
};

export type ClassBalance = {
  label: string;
  count: number;
  pct: number;
};

export type ColumnMissing = {
  column: string;
  null_count: number;
  null_pct: number;
};

export type DatasetSummaryStats = {
  rows: number;
  cols: number;
  target_column: string;
  missing_cells: number;
  missing_pct: number;
  class_balance: ClassBalance[];
  top_missing: ColumnMissing[];
};

export type DatasetSummaryResponse = {
  status: string;
  upload_id: string;
  summary: string;
  explanation: string;
  patterns: string[];
  risks: string[];
  stats: DatasetSummaryStats;
  llm_used?: boolean;
  llm_model?: string | null;
};

export type TrainingSummaryResponse = {
  status: string;
  model_id: string;
  summary: string;
  metrics_summary: string;
  top_features: FeatureImportance[];
  risks: string[];
  llm_used?: boolean;
  llm_model?: string | null;
};
