from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from backend.app.schemas import ForecastRequest
from backend.app.services import ForecastService

app = FastAPI(title="Way2Agribusiness Price Forecast API", version="1.0.0", description="12-month monthly-price forecasting API")
# Permit the local Vite development server; restrict origins to your domain in production.
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://price-forecasting-platform-l50nsnn8b-dhana-0-1-projects.vercel.app", ], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
service = ForecastService()

@app.get("/health")
def health():
    # Lightweight liveness endpoint for local development and deployment probes.
    return {"status": "ok", "model": service.artifact.get("model_name"), "data_cutoff": service.history.index[-1].strftime("%Y-%m-%d")}

@app.get("/api/v1/history")
def history():
    return {"count": len(service.history), "items": service.history_payload()}

@app.get("/api/v1/forecast")
def get_forecast(horizon: int = 12):
    try:
        return service.forecast(horizon)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

@app.post("/api/v1/forecast/generate")
def generate_forecast(request: ForecastRequest):
    try:
        return service.forecast(request.horizon)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

@app.get("/api/v1/metrics")
def metrics():
    return service.metrics()

@app.post("/api/v1/data/validate")
async def validate_csv(file: UploadFile = File(...)):
    # Validate upload contents only; do not silently replace the production dataset.
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Upload a .csv file")
    try:
        df = pd.read_csv(file.file)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}") from exc
    required = {"date", "avg_monthly_price"}
    missing = sorted(required - set(df.columns))
    if missing:
        raise HTTPException(status_code=422, detail={"missing_columns": missing, "required_columns": sorted(required)})
    dates = pd.to_datetime(df["date"], errors="coerce")
    prices = pd.to_numeric(df["avg_monthly_price"], errors="coerce")
    return {"rows": len(df), "valid_dates": int(dates.notna().sum()), "valid_positive_prices": int((prices > 0).sum()), "valid": bool(len(df) >= 24 and dates.notna().sum() >= 24 and (prices > 0).sum() >= 24), "note": "Validation only; uploaded data has not been applied to forecasts."}
