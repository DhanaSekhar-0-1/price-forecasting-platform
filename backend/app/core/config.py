from pathlib import Path

# Resolve paths relative to the repository root, independent of the working directory.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_PATH = PROJECT_ROOT / "data" / "price_data.csv"
ARTIFACT_PATH = PROJECT_ROOT / "artifacts" / "price_model_artifact.joblib"
