import { useCallback, useMemo, useState } from "react";
import type {
  DatasetInfo,
  PreprocessResponse,
  TrainResponse,
  SchemaResponse,
  PredictResponse,
} from "../types/api";

export type Step = "upload" | "preprocess" | "train" | "predict" | "results";
export type AsyncState = "idle" | "running" | "success" | "error";

export type WizardState = {
  step: Step;

  datasetInfo: DatasetInfo | null;
  preprocessInfo: PreprocessResponse | null;
  trainInfo: TrainResponse | null;
  schemaInfo: SchemaResponse | null;
  predictInfo: PredictResponse | null;

  trainingState: AsyncState;
  trainingProgress: number; // 0..100
  trainingError: string | null;

  predictionState: AsyncState;
  predictionError: string | null;

  loadingSchema: boolean;
  fatalError: string | null;
};

export type WizardActions = {
  // step
  goTo: (step: Step) => void;

  // resets
  resetLocal: () => void;

  // dataset flow
  setDatasetInfo: (info: DatasetInfo | null) => void;
  onUploaded: (info: DatasetInfo) => void;
  onPreprocessed: (info: PreprocessResponse) => void;

  // training flow
  onTrainingStart: () => void;
  onTrainingProgress: (pct: number) => void;
  onTrainingSuccess: (info: TrainResponse) => void;
  onTrainingError: (message: string) => void;

  // schema
  setLoadingSchema: (v: boolean) => void;
  setSchemaInfo: (info: SchemaResponse | null) => void;

  // prediction flow
  onPredictionStart: () => void;
  onPredictionSuccess: (info: PredictResponse) => void;
  onPredictionError: (message: string) => void;

  // fatal
  setFatalError: (message: string | null) => void;
};

export function clampPct(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Centralized wizard state manager.
 * - Keeps step + data objects together
 * - Provides consistent transitions and flags
 * - Can replace the App.tsx inline state when you want
 */
export default function useWizard(): {
  state: WizardState;
  actions: WizardActions;
  derived: {
    uploadId: string | null;
    modelId: string | null;
    canGoPreprocess: boolean;
    canGoTrain: boolean;
    canGoPredict: boolean;
    canGoResults: boolean;
  };
} {
  const [step, setStep] = useState<Step>("upload");

  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [preprocessInfo, setPreprocessInfo] = useState<PreprocessResponse | null>(null);
  const [trainInfo, setTrainInfo] = useState<TrainResponse | null>(null);
  const [schemaInfo, setSchemaInfo] = useState<SchemaResponse | null>(null);
  const [predictInfo, setPredictInfo] = useState<PredictResponse | null>(null);

  const [trainingState, setTrainingState] = useState<AsyncState>("idle");
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  const [predictionState, setPredictionState] = useState<AsyncState>("idle");
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const [loadingSchema, setLoadingSchema] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const uploadId = datasetInfo?.upload_id ?? null;
  const modelId = trainInfo?.model_id ?? null;

  const canGoPreprocess = !!datasetInfo;
  const canGoTrain = !!datasetInfo && !!preprocessInfo;
  const canGoPredict = !!trainInfo;
  const canGoResults = !!predictInfo;

  const goTo = useCallback(
    (next: Step) => {
      // Prevent invalid jumps
      if (next === "preprocess" && !canGoPreprocess) return;
      if (next === "train" && !canGoTrain) return;
      if (next === "predict" && !canGoPredict) return;
      if (next === "results" && !canGoResults) return;

      // Avoid navigation while async operations are running
      if (trainingState === "running" || predictionState === "running") return;

      setFatalError(null);
      setStep(next);
    },
    [canGoPreprocess, canGoTrain, canGoPredict, canGoResults, trainingState, predictionState]
  );

  const resetLocal = useCallback(() => {
    setStep("upload");

    setDatasetInfo(null);
    setPreprocessInfo(null);
    setTrainInfo(null);
    setSchemaInfo(null);
    setPredictInfo(null);

    setTrainingState("idle");
    setTrainingProgress(0);
    setTrainingError(null);

    setPredictionState("idle");
    setPredictionError(null);

    setLoadingSchema(false);
    setFatalError(null);
  }, []);

  const onUploaded = useCallback((info: DatasetInfo) => {
    setDatasetInfo(info);

    // clear downstream
    setPreprocessInfo(null);
    setTrainInfo(null);
    setSchemaInfo(null);
    setPredictInfo(null);

    setTrainingState("idle");
    setTrainingProgress(0);
    setTrainingError(null);

    setPredictionState("idle");
    setPredictionError(null);

    setFatalError(null);
    setStep("preprocess");
  }, []);

  const onPreprocessed = useCallback((info: PreprocessResponse) => {
    setPreprocessInfo(info);

    // clear downstream
    setTrainInfo(null);
    setSchemaInfo(null);
    setPredictInfo(null);

    setTrainingState("idle");
    setTrainingProgress(0);
    setTrainingError(null);

    setPredictionState("idle");
    setPredictionError(null);

    setFatalError(null);
    setStep("train");
  }, []);

  const onTrainingStart = useCallback(() => {
    setFatalError(null);
    setTrainingError(null);
    setTrainingState("running");
    setTrainingProgress(0);

    // clear downstream (new training invalidates old predict)
    setPredictInfo(null);
    setPredictionState("idle");
    setPredictionError(null);

    // stay on train step by design
    setStep("train");
  }, []);

  const onTrainingProgress = useCallback((pct: number) => {
    setTrainingProgress(clampPct(pct));
  }, []);

  const onTrainingSuccess = useCallback((info: TrainResponse) => {
    setTrainInfo(info);
    setTrainingState("success");
    setTrainingProgress(100);
    setTrainingError(null);
    setFatalError(null);

    // stay on train; user may click Next
    setStep("train");
  }, []);

  const onTrainingError = useCallback((message: string) => {
    setTrainingState("error");
    setTrainingError(message);
    setFatalError(null);
  }, []);

  const onPredictionStart = useCallback(() => {
    setFatalError(null);
    setPredictionError(null);
    setPredictionState("running");

    // keep on predict step while request runs
    setStep("predict");
  }, []);

  const onPredictionSuccess = useCallback((info: PredictResponse) => {
    setPredictInfo(info);
    setPredictionState("success");
    setPredictionError(null);
    setFatalError(null);

    // auto-navigate to results
    setStep("results");
  }, []);

  const onPredictionError = useCallback((message: string) => {
    setPredictionState("error");
    setPredictionError(message);
    setFatalError(null);
  }, []);

  const state: WizardState = useMemo(
    () => ({
      step,
      datasetInfo,
      preprocessInfo,
      trainInfo,
      schemaInfo,
      predictInfo,
      trainingState,
      trainingProgress,
      trainingError,
      predictionState,
      predictionError,
      loadingSchema,
      fatalError,
    }),
    [
      step,
      datasetInfo,
      preprocessInfo,
      trainInfo,
      schemaInfo,
      predictInfo,
      trainingState,
      trainingProgress,
      trainingError,
      predictionState,
      predictionError,
      loadingSchema,
      fatalError,
    ]
  );

  const actions: WizardActions = useMemo(
    () => ({
      goTo,
      resetLocal,
      setDatasetInfo,
      onUploaded,
      onPreprocessed,
      onTrainingStart,
      onTrainingProgress,
      onTrainingSuccess,
      onTrainingError,
      setLoadingSchema,
      setSchemaInfo,
      onPredictionStart,
      onPredictionSuccess,
      onPredictionError,
      setFatalError,
    }),
    [goTo, resetLocal, onUploaded, onPreprocessed, onTrainingStart, onTrainingProgress, onTrainingSuccess, onTrainingError, onPredictionStart, onPredictionSuccess, onPredictionError]
  );

  const derived = useMemo(
    () => ({
      uploadId,
      modelId,
      canGoPreprocess,
      canGoTrain,
      canGoPredict,
      canGoResults,
    }),
    [uploadId, modelId, canGoPreprocess, canGoTrain, canGoPredict, canGoResults]
  );

  return { state, actions, derived };
}
