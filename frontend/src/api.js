
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://price-forecasting-platform.onrender.com'
).replace(/\/$/, '');

// Send a request to FastAPI and handle API errors.
async function request(path) {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `API request failed (${response.status})`);
  }

  return response.json();
}

// Fetch historical price observations.
export const getHistory = () => request('/api/v1/history');

// Fetch a forecast for the requested number of months.
export const getForecast = (horizon = 12) =>
  request(`/api/v1/forecast?horizon=${encodeURIComponent(horizon)}`);

// Fetch model evaluation metrics.
export const getMetrics = () => request('/api/v1/metrics');
