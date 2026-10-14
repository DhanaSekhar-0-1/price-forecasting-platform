from pydantic import BaseModel, Field

class ForecastRequest(BaseModel):
    # Limit horizon to the 12-month scope of this assignment.
    horizon: int = Field(default=12, ge=1, le=12)

class ForecastPoint(BaseModel):
    date: str
    forecast: float
    lower_80: float
    upper_80: float
    lower_95: float
    upper_95: float
    change_vs_last_obs_pct: float

class ForecastResponse(BaseModel):
    model: str
    horizon: int
    last_observation_date: str
    last_observation_price: float
    source_data_cutoff: str
    freshness_warning: str | None = None
    points: list[ForecastPoint]
