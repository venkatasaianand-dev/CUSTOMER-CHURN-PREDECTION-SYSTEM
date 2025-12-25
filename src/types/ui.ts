export type Step = "upload" | "preprocess" | "train" | "predict" | "results";

export type AsyncState = "idle" | "running" | "success" | "error";

export type TrainingUIState = {
  state: AsyncState;
  progress: number; // 0..100
  error: string | null;
};

export type PredictionUIState = {
  state: AsyncState;
  error: string | null;
};
