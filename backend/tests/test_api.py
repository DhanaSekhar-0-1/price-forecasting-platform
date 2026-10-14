from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_forecast_returns_twelve_points():
    response = client.get("/api/v1/forecast?horizon=12")
    assert response.status_code == 200
    data = response.json()
    assert data["horizon"] == 12
    assert len(data["points"]) == 12
    assert data["points"][0]["date"] > data["last_observation_date"]

def test_invalid_horizon_rejected():
    assert client.get("/api/v1/forecast?horizon=13").status_code == 422

def test_metrics_available():
    data = client.get("/api/v1/metrics").json()
    assert data["model"] == "naive"
    assert "test_metrics" in data
