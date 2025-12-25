from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Dict, List, Tuple

import matplotlib
import numpy as np
import pandas as pd
from sklearn.metrics import ConfusionMatrixDisplay, auc, confusion_matrix, roc_curve
from sklearn.model_selection import train_test_split

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.ml.pipeline import build_xgb_pipeline

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402


def normalize_target(y: pd.Series) -> pd.Series:
    if pd.api.types.is_bool_dtype(y):
        return y.astype(int)
    if pd.api.types.is_numeric_dtype(y):
        return y.astype(int)
    s = y.astype(str).str.strip().str.lower()
    mapping = {
        "1": 1,
        "0": 0,
        "yes": 1,
        "no": 0,
        "true": 1,
        "false": 0,
        "churn": 1,
        "no churn": 0,
        "not churn": 0,
        "exited": 1,
        "stayed": 0,
        "stay": 0,
    }
    mapped = s.map(mapping)
    if mapped.isna().any():
        unknown = sorted(set(s[mapped.isna()].unique().tolist()))[:10]
        raise ValueError(f"Unsupported target labels found: {unknown}")
    return mapped.astype(int)


def aggregate_feature_importance(pipeline, columns: List[str]) -> List[Tuple[str, float]]:
    fallback = [(c, 0.0) for c in columns]
    model = pipeline.named_steps.get("model")
    if model is None or not hasattr(model, "feature_importances_"):
        return fallback
    importances = np.asarray(getattr(model, "feature_importances_", []), dtype=float)
    if importances.size == 0:
        return fallback
    preprocess = pipeline.named_steps.get("preprocess")
    if preprocess is None or not hasattr(preprocess, "transformers_"):
        return fallback

    totals: Dict[str, float] = {c: 0.0 for c in columns}
    idx = 0
    for name, transformer, cols in preprocess.transformers_:
        if name == "remainder" and transformer == "drop":
            continue
        if cols is None:
            continue
        cols_list = [str(c) for c in cols]
        if name == "num":
            for col in cols_list:
                if idx >= importances.size:
                    break
                totals[col] += float(importances[idx])
                idx += 1
        elif name == "cat":
            onehot = None
            if hasattr(transformer, "named_steps"):
                onehot = transformer.named_steps.get("onehot")
            if onehot is None or not hasattr(onehot, "categories_"):
                return fallback
            for col, cats in zip(cols_list, onehot.categories_):
                n = len(cats)
                if n <= 0:
                    continue
                if idx >= importances.size:
                    break
                end = min(idx + n, importances.size)
                totals[col] += float(np.sum(importances[idx:end]))
                idx = end
        else:
            return fallback
    return [(c, totals.get(c, 0.0)) for c in columns]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate churn model plots.")
    parser.add_argument("--data", required=True, help="Path to CSV dataset")
    parser.add_argument("--target", required=True, help="Target column name")
    parser.add_argument("--outdir", default="UI ScreenShots", help="Output directory for images")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    data_path = Path(args.data)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(data_path)
    if args.target not in df.columns:
        raise ValueError(f"Target column not found: {args.target}")

    y = normalize_target(df[args.target])
    X = df.drop(columns=[args.target])

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=float(args.test_size),
        random_state=int(args.seed),
        stratify=y if y.nunique() == 2 else None,
    )

    pipeline, _meta = build_xgb_pipeline(X_train, random_seed=int(args.seed))
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=[0, 1])
    fig, ax = plt.subplots(figsize=(5, 4))
    disp.plot(ax=ax, cmap="Blues", values_format="d")
    ax.set_title("Confusion Matrix")
    fig.tight_layout()
    fig.savefig(outdir / "confusion_matrix.png", dpi=200)
    plt.close(fig)

    # ROC curve + AUC
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr, tpr)
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot(fpr, tpr, label=f"AUC = {roc_auc:.3f}")
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve")
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(outdir / "roc_curve.png", dpi=200)
    plt.close(fig)

    # Feature importance (top 15)
    fi = aggregate_feature_importance(pipeline, [str(c) for c in X.columns.tolist()])
    fi_sorted = sorted(fi, key=lambda x: x[1], reverse=True)[:15]
    labels = [f for f, _ in fi_sorted]
    values = [v for _, v in fi_sorted]
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.barh(labels[::-1], values[::-1])
    ax.set_title("Feature Importance (Top 15)")
    ax.set_xlabel("Importance")
    fig.tight_layout()
    fig.savefig(outdir / "feature_importance.png", dpi=200)
    plt.close(fig)

    print(f"Saved images to: {outdir}")
    print(f"ROC AUC: {roc_auc:.4f}")


if __name__ == "__main__":
    main()
