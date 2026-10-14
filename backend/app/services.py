from __future__ import annotations
import joblib
import numpy as np
import pandas as pd
from backend.app.core.config import DATA_PATH, ARTIFACT_PATH

# Load the supplied artifact and CSV at service startup; the artifact is lightweight metadata.
class ForecastService:
    def __init__(self, data_path=DATA_PATH, artifact_path=ARTIFACT_PATH):
        self.data_path = data_path
        self.artifact_path = artifact_path
        self.artifact = joblib.load(artifact_path)
        self.history = self._load_history(data_path)

    @staticmethod
    def _load_history(path):
        # Parse only the expected source columns and reject unusable observations.
        df = pd.read_csv(path)
        required = {"date", "avg_monthly_price"}
        if not required.issubset(df.columns):
            raise ValueError(f"CSV must contain columns: {sorted(required)}")
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["avg_monthly_price"] = pd.to_numeric(df["avg_monthly_price"], errors="coerce")
        df = df.dropna(subset=["date", "avg_monthly_price"])
        df = df[df["avg_monthly_price"] > 0].copy()
        df["date"] = df["date"].dt.to_period("M").dt.to_timestamp()
        series = df.groupby("date")["avg_monthly_price"].mean().sort_index()
        if len(series) < 24:
            raise ValueError("At least 24 valid monthly observations are required")
        if series.index.has_duplicates or not np.isfinite(series.to_numpy()).all():
            raise ValueError("History contains duplicate dates or non-finite values after aggregation")
        return series

    def history_payload(self):
        # Return a frontend-friendly chronological list.
        return [{"date": d.strftime("%Y-%m-%d"), "price": float(v)} for d, v in self.history.items()]

    def forecast(self, horizon=12):
        # Existing artifact explicitly selects the naive model; don't invent a fitted estimator.
        if not 1 <= int(horizon) <= 12:
            raise ValueError("horizon must be between 1 and 12")
        model = self.artifact.get("model_name", "unknown")
        if model != "naive":
            raise ValueError(f"Unsupported artifact model for this adapter: {model}")
        last_price = float(self.history.iloc[-1])
        last_date = self.history.index[-1]
        factors = self.artifact.get("interval_factors", {})
        points = []
        for i, date in enumerate(pd.date_range(last_date + pd.DateOffset(months=1), periods=horizon, freq="MS")):
            # Use stored horizon-specific multiplicative interval factors when available.
            def bound(key, default):
                values = factors.get(key, [])
                return float(values[i]) if i < len(values) else default
            pred = last_price
            points.append({
                "date": date.strftime("%Y-%m-%d"), "forecast": pred,
                "lower_80": pred * bound("lower_80", 0.9), "upper_80": pred * bound("upper_80", 1.1),
                "lower_95": pred * bound("lower_95", 0.8), "upper_95": pred * bound("upper_95", 1.2),
                "change_vs_last_obs_pct": 0.0,
            })
        # The uploaded CSV ends in Sep 2025; make this cutoff explicit to prevent stale forecasts appearing live.
        warning = None
        if last_date < pd.Timestamp.now().to_period("M").to_timestamp() - pd.DateOffset(months=2):
            warning = f"Source data ends {last_date:%B %Y}; refresh the dataset before treating this as a current market forecast."
        return {"model": model, "horizon": int(horizon), "last_observation_date": last_date.strftime("%Y-%m-%d"),
                "last_observation_price": last_price, "source_data_cutoff": last_date.strftime("%Y-%m-%d"),
                "freshness_warning": warning, "points": points}

    def metrics(self):
        # Report the artifact's stored holdout metrics, not metrics recomputed on future data.
        return {"model": self.artifact.get("model_name"),
                "validation_metrics": self.artifact.get("validation_metrics", {}),
                "test_metrics": self.artifact.get("test_metrics", {}),
                "metrics_note": "Metrics are from the supplied notebook artifact; not recalculated by the web service."}
