
const DEFAULT_API_BASE_URL = 'https://price-forecasting-platform.onrender.com';
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

function getApiBaseUrl() {
  if (!configuredApiBaseUrl) return DEFAULT_API_BASE_URL;

  try {
    const url = new URL(configuredApiBaseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL without credentials');
    }
    if (url.hostname === 'price-forecasting-django.onrender.com') {
      throw new Error('The frontend must call FastAPI directly, not the optional Django gateway');
    }
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    console.warn('Invalid VITE_API_BASE_URL; using the production FastAPI URL.', error);
    return DEFAULT_API_BASE_URL;
  }
}

const API_BASE = getApiBaseUrl();

async function request(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch (error) {
    throw new Error(
      'Network error contacting the forecast API. Check the API URL, service availability, and CORS configuration.',
      { cause: error }
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail
        ? `API request failed (${response.status}): ${detail}`
        : `API request failed (${response.status})`
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('API returned an invalid JSON response.', { cause: error });
  }
}

// Fetch historical price observations.
export const getHistory = () => request('/api/v1/history');

// Fetch a forecast for the requested number of months.
export const getForecast = (horizon = 12) =>
  request(`/api/v1/forecast?horizon=${encodeURIComponent(horizon)}`);

// Fetch model evaluation metrics.
export const getMetrics = () => request('/api/v1/metrics');
