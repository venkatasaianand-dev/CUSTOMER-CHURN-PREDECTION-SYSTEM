import React, { useEffect, useMemo, useState } from "react";

import FileUpload from "./components/FileUpload";
import DataPreprocessing from "./components/DataPreprocessing";
import ModelTraining from "./components/ModelTraining";
import PredictionForm from "./components/PredictionForm";
import PredictionResults from "./components/PredictionResults";

import Alert from "./components/common/Alert";
import Spinner from "./components/common/Spinner";
import Stepper from "./components/common/Stepper";
import ThemeToggle from "./components/common/ThemeToggle";
import { useToaster } from "./components/common/Toaster";
import useTrainingProgress from "./hooks/useTrainingProgress";

import api from "./services/api";
import type {
  DatasetInfo,
  PreprocessResponse,
  TrainResponse,
  SchemaResponse,
  PredictResponse,
} from "./types/api";

type Step = "upload" | "preprocess" | "train" | "predict" | "results";
type AsyncState = "idle" | "running" | "success" | "error";

export default function App() {
  const [step, setStep] = useState<Step>("upload");

  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [preprocessInfo, setPreprocessInfo] = useState<PreprocessResponse | null>(null);
  const [trainInfo, setTrainInfo] = useState<TrainResponse | null>(null);
  const [schemaInfo, setSchemaInfo] = useState<SchemaResponse | null>(null);
  const [predictInfo, setPredictInfo] = useState<PredictResponse | null>(null);

  const [loadingSchema, setLoadingSchema] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [trainingState, setTrainingState] = useState<AsyncState>("idle");
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingProgressMessage, setTrainingProgressMessage] = useState<string | null>(null);

  const [predictionState, setPredictionState] = useState<AsyncState>("idle");
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const toaster = useToaster();

  const uploadId = datasetInfo?.upload_id ?? null;
  const modelId = trainInfo?.model_id ?? null;

  const steps = useMemo(
    () => [
      { key: "upload" as const, label: "Upload" },
      { key: "preprocess" as const, label: "Preprocess" },
      { key: "train" as const, label: "Train" },
      { key: "predict" as const, label: "Predict" },
      { key: "results" as const, label: "Results" },
    ],
    []
  );

  const stepIndex = useMemo(() => steps.findIndex((s) => s.key === step), [step, steps]);

  const trainingProgress = useTrainingProgress();

  const canGoToPreprocess = !!datasetInfo;
  const canGoToTrain = !!datasetInfo && !!preprocessInfo;
  const canGoToPredict = !!trainInfo;
  const canGoToResults = !!predictInfo;

  const goTo = (next: Step) => {
    setFatalError(null);
    setPredictionError(null);
    setTrainingError(null);

    if (next === "preprocess" && !canGoToPreprocess) return;
    if (next === "train" && !canGoToTrain) return;
    if (next === "predict" && !canGoToPredict) return;
    if (next === "results" && !canGoToResults) return;

    setStep(next);
  };

  const resetAll = async () => {
    setFatalError(null);
    setTrainingError(null);
    setPredictionError(null);
    setTrainingState("idle");
    setPredictionState("idle");
    trainingProgress.reset();
    setTrainingProgressMessage(null);

    try {
      await api.resetRuntimeState(true);
      toaster?.success?.("Reset completed");
    } catch (e: any) {
      toaster?.error?.(e?.message || "Reset failed");
    } finally {
      setDatasetInfo(null);
      setPreprocessInfo(null);
      setTrainInfo(null);
      setSchemaInfo(null);
      setPredictInfo(null);
      setStep("upload");
    }
  };

  // ---------- Training orchestration ----------
  const startTraining = async () => {
    setFatalError(null);
    setTrainingError(null);
    setPredictionError(null);
    setPredictInfo(null);
    setPredictionState("idle");

    if (!uploadId || !preprocessInfo?.target_column) {
      setTrainingError("Missing preprocessing info. Please preprocess again.");
      setTrainingState("error");
      return;
    }

    setTrainingState("running");
    trainingProgress.reset();
    setTrainingProgressMessage(null);

    try {
      const res = await api.trainModelStream(
        {
          upload_id: uploadId,
          target_column: preprocessInfo.target_column,
          excluded_columns: [],
          model_name: "xgboost",
        },
        (pct, message) => {
          if (message) console.debug("[train] progress message", message);
          if (pct >= 100) {
            setTrainingProgressMessage(null);
          } else if (message) {
            setTrainingProgressMessage(message);
          }
          trainingProgress.setProgressExternal(pct);
          if (pct >= 100) trainingProgress.complete();
        }
      );
 
      setTrainInfo(res);
      setTrainingState("success");
      toaster?.success?.("Training complete!");
      setStep("train");
    } catch (e: any) {
      console.error("[train] failed", e);
      trainingProgress.fail();
      setTrainingState("error");
      setTrainingError(e?.message || "Training failed.");
      toaster?.error?.(e?.message || "Training failed.");
      setTrainingProgressMessage(null);
    }
  };

  // ---------- Schema loading when model is ready ----------
  useEffect(() => {
    let cancelled = false;

    async function loadSchema(mid: string) {
      setLoadingSchema(true);
      setFatalError(null);
      try {
        const schema = await api.getModelSchema(mid);
        if (!cancelled) setSchemaInfo(schema);
      } catch (e: any) {
        if (!cancelled) {
          setSchemaInfo(null);
          setFatalError(e?.message || "Failed to load model schema.");
          toaster?.error?.(e?.message || "Failed to load model schema.");
        }
      } finally {
        if (!cancelled) setLoadingSchema(false);
      }
    }

    if (modelId) loadSchema(modelId);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  // ---------- Handlers (children call these) ----------
  const handleUploaded = (info: DatasetInfo) => {
    setDatasetInfo(info);
    setPreprocessInfo(null);
    setTrainInfo(null);
    setSchemaInfo(null);
    setPredictInfo(null);

    setTrainingState("idle");
    setTrainingError(null);
    trainingProgress.reset();
    setTrainingProgressMessage(null);

    setPredictionState("idle");
    setPredictionError(null);

    toaster?.success?.("Dataset uploaded");
    setStep("preprocess");
  };

  const handlePreprocessed = (info: PreprocessResponse) => {
    setPreprocessInfo(info);
    setTrainInfo(null);
    setSchemaInfo(null);
    setPredictInfo(null);

    setTrainingState("idle");
    setTrainingError(null);
    trainingProgress.reset();
    setTrainingProgressMessage(null);

    setPredictionState("idle");
    setPredictionError(null);

    toaster?.success?.("Preprocess completed");
    setStep("train");
  };

  const handlePredicted = (info: PredictResponse) => {
    setPredictInfo(info);
    setPredictionState("success");
    setPredictionError(null);

    toaster?.success?.("Prediction completed");
    setStep("results");
  };

  const handlePredictionStart = () => {
    setPredictionState("running");
    setPredictionError(null);
    setFatalError(null);
  };

  const handlePredictionError = (msg: string) => {
    setPredictionState("error");
    setPredictionError(msg);
  };

  // Guard: if user refreshes mid-flow, force to earliest available step
  useEffect(() => {
    if (!datasetInfo && step !== "upload") setStep("upload");
    else if (datasetInfo && !preprocessInfo && step !== "upload" && step !== "preprocess") setStep("preprocess");
    else if (preprocessInfo && !trainInfo && (step === "predict" || step === "results")) setStep("train");
    else if (trainInfo && !predictInfo && step === "results") setStep("predict");
  }, [datasetInfo, preprocessInfo, trainInfo, predictInfo, step]);

  const decoratedSteps = steps.map((s, idx) => {
    const status = idx < stepIndex ? "complete" : idx === stepIndex ? "current" : "upcoming";
    const disabled =
      (s.key === "preprocess" && !canGoToPreprocess) ||
      (s.key === "train" && !canGoToTrain) ||
      (s.key === "predict" && !canGoToPredict) ||
      (s.key === "results" && !canGoToResults) ||
      trainingState === "running" ||
      predictionState === "running";

    return {
      ...s,
      status,
      disabled,
      onClick: () => goTo(s.key),
    };
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [step]);

  return (
    <div className="app-shell min-h-screen">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.16),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.18),transparent_30%)]" />
        <header
          className="relative z-10 border-b backdrop-blur-md"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-pink-500 text-white shadow-glow flex items-center justify-center font-black">
                  CP
                </div>
                <div>
                  <h1 className="text-xl font-black uppercase tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-pink-500 to-primary-400">
                    CUSTOMER CHURN PREDICTION SYSTEM
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={resetAll}
                  className="btn btn-secondary px-3 py-2 shadow-sm"
                >
                  Reset
                </button>
              </div>
            </div>
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-md backdrop-blur"
              style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary-800 dark:text-primary-200">
                <span className="h-2 w-2 rounded-full bg-primary-500 shadow-[0_0_0_6px_rgba(99,102,241,0.18)]" />
                Guided Workflow
              </div>
              <Stepper steps={decoratedSteps} />
            </div>
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {fatalError && (
          <div className="mb-4">
            <Alert variant="error" title="Something went wrong" message={fatalError} />
          </div>
        )}

        <div className="grid gap-6">
          {step === "upload" && <FileUpload onUploaded={handleUploaded} />}

          {step === "preprocess" && uploadId && (
            <DataPreprocessing
              uploadId={uploadId}
              datasetInfo={datasetInfo}
              onBack={() => goTo("upload")}
              onPreprocessed={handlePreprocessed}
            />
          )}

          {step === "train" && uploadId && preprocessInfo && (
            <ModelTraining
              uploadId={uploadId}
              preprocessInfo={preprocessInfo}
              onBack={() => goTo("preprocess")}
              onStartTraining={startTraining}
              trainingState={trainingState}
              trainingError={trainingError}
              trainingProgress={trainingProgress.progress}
              trainingProgressMessage={trainingProgressMessage}
              trainInfo={trainInfo}
              onNext={() => goTo("predict")}
            />
          )}

          {step === "predict" && modelId && (
            <>
              {loadingSchema && (
                <div className="mb-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <Spinner size="sm" />
                  Loading prediction form...
                </div>
              )}

              {predictionError && (
                <div className="mb-4">
                  <Alert variant="error" title="Prediction error" message={predictionError} />
                </div>
              )}

              <PredictionForm
                modelId={modelId}
                schemaInfo={schemaInfo}
                onBack={() => goTo("train")}
                onPredicted={handlePredicted}
                trainingInfo={trainInfo}
                onPredictStart={handlePredictionStart}
                onPredictError={handlePredictionError}
                predicting={predictionState === "running"}
              />
            </>
          )}

          {step === "results" && predictInfo && (
            <PredictionResults
              result={predictInfo}
              trainingInfo={trainInfo}
              uploadId={datasetInfo?.upload_id ?? null}
              onBack={() => goTo("predict")}
              onNewPrediction={() => goTo("predict")}
            />
          )}
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-4 text-center text-xs text-zinc-500">
      </footer>
    </div>
  );
}
