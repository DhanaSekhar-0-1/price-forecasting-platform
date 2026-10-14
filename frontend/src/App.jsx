
import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowDownToLine, CalendarDays,
  ChartNoAxesCombined, Database, RefreshCw, Sprout,
  Search, FileSpreadsheet, CheckCircle2, Info
} from 'lucide-react';
import { getForecast, getHistory, getMetrics } from './api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2
  }).format(Number(value));

const month = (value) => {
  if (!value) return '—';

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit'
      });
};

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
};

// Calculate data-quality statistics from records returned by FastAPI.
function summarizeHistory(history) {
  const valid = history
    .map((row) => ({
      date: String(row.date ?? '').slice(0, 10),
      price:
        row.price === null || row.price === undefined || row.price === ''
          ? NaN
          : Number(row.price)
    }))
    .filter(
      (row) =>
        /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
        !Number.isNaN(Date.parse(`${row.date}T00:00:00`)) &&
        Number.isFinite(row.price)
    );

  const sortedPrices = valid
    .map((row) => row.price)
    .sort((a, b) => a - b);

  const sortedDates = [...valid].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const uniqueDates = new Set(valid.map((row) => row.date));

  const mean = sortedPrices.length
    ? sortedPrices.reduce((sum, value) => sum + value, 0) /
      sortedPrices.length
    : null;

  let median = null;

  if (sortedPrices.length) {
    const middle = Math.floor(sortedPrices.length / 2);

    median =
      sortedPrices.length % 2
        ? sortedPrices[middle]
        : (sortedPrices[middle - 1] + sortedPrices[middle]) / 2;
  }

  return {
    recordCount: history.length,
    validCount: valid.length,
    invalidCount: history.length - valid.length,
    duplicateDates: valid.length - uniqueDates.size,
    min: sortedPrices.length ? sortedPrices[0] : null,
    max: sortedPrices.length
      ? sortedPrices[sortedPrices.length - 1]
      : null,
    mean,
    median,
    firstDate: sortedDates[0]?.date ?? null,
    lastDate: sortedDates.at(-1)?.date ?? null
  };
}

export default function App() {
  const [history, setHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [metrics, setMetrics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [horizon, setHorizon] = useState(12);

  // This state controls the active sidebar page.
  const [activePage, setActivePage] = useState('forecast');

  async function load(nextHorizon = horizon) {
    setLoading(true);
    setError('');

    try {
      const [historyResponse, forecastResponse, metricsResponse] =
        await Promise.all([
          getHistory(),
          getForecast(nextHorizon),
          getMetrics()
        ]);

      const items = Array.isArray(historyResponse)
        ? historyResponse	
        : historyResponse?.items;

      if (!Array.isArray(items)) {
        throw new Error(
          'Unexpected history API response. Expected an items array.'
        );
      }

      setHistory(items);
      setForecast(forecastResponse);
      setMetrics(metricsResponse);
    
		} catch (err) {
		  console.error("Dashboard data loading failed:", err);

		  setError(
			err instanceof Error
			  ? err.message
			  : String(err)
		  );
		} finally {
		  setLoading(false);
		}

  }

  useEffect(() => {
    load(12);
    // Load initial dashboard data on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(
    () => summarizeHistory(history),
    [history]
  );

  const chartData = useMemo(() => {
    const historical = history.slice(-36).map((row) => ({
      date: row.date,
      label: month(row.date),
      actual: Number(row.price)
    }));

    const predicted = (forecast?.points ?? []).map((point) => ({
      ...point,
      label: month(point.date),
      forecast: Number(point.forecast)
    }));

    return [...historical, ...predicted];
  }, [history, forecast]);

  function downloadCsv(rows, filename, headers) {
    if (!rows.length) return;

    const escapeCell = (value) => {
      if (value === null || value === undefined) return '';

      const text = String(value);

      return /[",\n]/.test(text)
        ? `"${text.replaceAll('"', '""')}"`
        : text;
    };

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((header) => escapeCell(row[header])).join(',')
      )
    ].join('\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    );

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const lastPoint = forecast?.points?.at(-1);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sprout size={24} />
          </div>

          <div>
            <strong>Way2Agri</strong>
            <small>INTELLIGENCE</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <button
          type="button"
          className={`nav-item ${
            activePage === 'forecast' ? 'active' : ''
          }`}
          onClick={() => setActivePage('forecast')}
          aria-current={
            activePage === 'forecast' ? 'page' : undefined
          }
        >
          <ChartNoAxesCombined size={18} />
          Price forecast
        </button>

        <button
          type="button"
          className={`nav-item ${
            activePage === 'overview' ? 'active' : ''
          }`}
          onClick={() => setActivePage('overview')}
          aria-current={
            activePage === 'overview' ? 'page' : undefined
          }
        >
          <Database size={18} />
          Data overview
        </button>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          Forecast service
          <b>
            {error ? 'Offline' : loading ? 'Checking…' : 'Connected'}
          </b>
        </div>
      </aside>

      <main className="main">
        {activePage === 'forecast' ? (
          <ForecastPage
            history={history}
            forecast={forecast}
            metrics={metrics}
            loading={loading}
            error={error}
            horizon={horizon}
            setHorizon={setHorizon}
            load={load}
            chartData={chartData}
            downloadCsv={downloadCsv}
          />
        ) : (
          <DataOverview
            history={history}
            summary={summary}
            loading={loading}
            error={error}
            onRefresh={() => load()}
            downloadCsv={downloadCsv}
          />
        )}
      </main>
    </div>
  );
}

function ForecastPage({
  history,
  forecast,
  metrics,
  loading,
  error,
  horizon,
  setHorizon,
  load,
  chartData,
  downloadCsv
}) {
  const lastPoint = forecast?.points?.at(-1);
  const latestPrice = forecast?.last_observation_price;

  const forecastHeaders = [
    'date',
    'forecast',
    'lower_80',
    'upper_80',
    'lower_95',
    'upper_95',
    'change_vs_last_obs_pct'
  ];

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">
            AGRIBUSINESS ANALYTICS / FORECASTING
          </div>
          <h1>Monthly price outlook</h1>
          <p>Historical context and a 12-month planning view.</p>
        </div>

        <button
          className="secondary-btn"
          onClick={() => load()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </header>

      {error && (
        <div className="alert error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {forecast?.freshness_warning && (
        <div className="alert warning">
          <AlertTriangle size={18} />
          <span>
            <strong>Historical data warning:</strong>{' '}
            {forecast.freshness_warning} The chart is not a live market
            forecast.
          </span>
        </div>
      )}

      <section className="stat-grid">
        <Stat
          icon={<Database size={19} />}
          label="Latest observed price"
          value={
            latestPrice == null ? '—' : `₹${money(latestPrice)}`
          }
          note={
            forecast
              ? `As of ${month(forecast.last_observation_date)}`
              : 'Waiting for API'
          }
        />

        <Stat
          icon={<CalendarDays size={19} />}
          label="Forecast horizon"
          value={`${forecast?.horizon ?? '—'} months`}
          note="Monthly forecast steps"
        />

        <Stat
          icon={<Activity size={19} />}
          label="Model selected"
          value={metrics?.model || '—'}
          note="Last-value naive baseline"
        />

        <Stat
          icon={<ChartNoAxesCombined size={19} />}
          label={`${forecast?.horizon ?? horizon}-month estimate`}
          value={
            lastPoint ? `₹${money(lastPoint.forecast)}` : '—'
          }
          note="Point estimate, not a guarantee"
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Price history &amp; forecast</h2>
            <p>Recent 36 observations with forecast range.</p>
          </div>

          <div className="chart-actions">
            <select
              aria-label="Forecast horizon"
              value={horizon}
              onChange={(event) => {
                const nextHorizon = Number(event.target.value);
                setHorizon(nextHorizon);
                load(nextHorizon);
              }}
            >
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </select>

            <button
              className="primary-btn"
              disabled={!forecast?.points?.length}
              onClick={() =>
                downloadCsv(
                  forecast.points,
                  'price_forecast.csv',
                  forecastHeaders
                )
              }
            >
              <ArrowDownToLine size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading forecast data…</div>
        ) : error ? (
          <div className="empty-state">
            Forecast data could not be loaded. Check the API connection.
          </div>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 12, right: 12, left: 2, bottom: 2 }}
              >
                <defs>
                  <linearGradient
                    id="forecastBand"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#8bbd8e"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor="#8bbd8e"
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e7ebe3"
                />

                <XAxis
                  dataKey="label"
                  tick={{ fill: '#798176', fontSize: 11 }}
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tickFormatter={(value) =>
                    `₹${(value / 1000).toFixed(0)}k`
                  }
                  tick={{ fill: '#798176', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />

                <Tooltip
                  formatter={(value, name) => [
                    value == null ? '—' : `₹${money(value)}`,
                    name
                  ]}
                />

                <Legend />

                <Area
                  type="monotone"
                  dataKey="upper_80"
                  name="80% upper bound"
                  stroke="none"
                  fill="url(#forecastBand)"
                  connectNulls
                />

                <Area
                  type="monotone"
                  dataKey="lower_80"
                  name="80% lower bound"
                  stroke="none"
                  fill="#fff"
                  connectNulls
                />

                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Historical price"
                  stroke="#244e35"
                  strokeWidth={2.3}
                  dot={false}
                  connectNulls
                />

                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#d49a30"
                  strokeWidth={2.6}
                  strokeDasharray="6 4"
                  dot={{ r: 2, fill: '#d49a30' }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="chart-footnote">
          Forecast intervals are derived from the supplied artifact. They
          are historical calibration bands, not guarantees.
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Forecast detail</h2>
              <p>Predictions and uncertainty bounds.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Forecast</th>
                  <th>80% interval</th>
                  <th>95% interval</th>
                </tr>
              </thead>

              <tbody>
                {(forecast?.points ?? []).map((point) => (
                  <tr key={point.date}>
                    <td>{month(point.date)}</td>
                    <td className="number">
                      ₹{money(point.forecast)}
                    </td>
                    <td className="number">
                      ₹{money(point.lower_80)} – ₹
                      {money(point.upper_80)}
                    </td>
                    <td className="number">
                      ₹{money(point.lower_95)} – ₹
                      {money(point.upper_95)}
                    </td>
                  </tr>
                ))}

                {!loading && !forecast?.points?.length && (
                  <tr>
                    <td colSpan="4">No forecast points available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Model evaluation</h2>
              <p>Recorded notebook test metrics</p>
            </div>
          </div>

          {metrics ? (
            <>
              <Metric label="MAE" value={metrics.test_metrics?.MAE} />
              <Metric label="RMSE" value={metrics.test_metrics?.RMSE} />
              <Metric
                label="MAPE"
                value={metrics.test_metrics?.['MAPE_%']}
                suffix="%"
              />
              <Metric
                label="WAPE"
                value={metrics.test_metrics?.['WAPE_%']}
                suffix="%"
              />

              <div className="metric-note">
                Metrics reflect the original held-out test period; they
                are not a live performance measurement.
              </div>
            </>
          ) : (
            <p className="muted">Metrics unavailable.</p>
          )}
        </div>
      </section>

      <footer>
        <span>Way2Agribusiness Forecasting Platform</span>
        <span>
          Source cutoff: {forecast?.source_data_cutoff || '—'} ·{' '}
          {loading
            ? 'Updating…'
            : `API status: ${error ? 'unavailable' : 'available'}`}
        </span>
      </footer>
    </>
  );
}

function DataOverview({
  history,
  summary,
  loading,
  error,
  onRefresh,
  downloadCsv
}) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const sorted = [...history].sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    );

    const search = query.trim().toLowerCase();

    return sorted.filter(
      (row) =>
        !search ||
        String(row.date ?? '').toLowerCase().includes(search) ||
        String(row.price ?? '').includes(search)
    );
  }, [history, query]);

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">
            AGRIBUSINESS ANALYTICS / DATA QUALITY
          </div>
          <h1>Data overview</h1>
          <p>
            Inspect the historical price records returned by FastAPI.
          </p>
        </div>

        <button
          className="secondary-btn"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </header>

      {error && (
        <div className="alert error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="alert info">
        <Info size={18} />
        <span>
          These statistics are calculated from the records returned by
          the API. Missing records removed by the backend cannot be
          counted by the frontend.
        </span>
      </div>

      <section className="stat-grid">
        <Stat
          icon={<Database size={19} />}
          label="Records returned"
          value={loading ? '…' : summary.recordCount}
          note="Rows returned by history API"
        />

        <Stat
          icon={<CalendarDays size={19} />}
          label="Date range"
          value={
            summary.firstDate && summary.lastDate
              ? `${month(summary.firstDate)} – ${month(summary.lastDate)}`
              : '—'
          }
          note={
            summary.firstDate
              ? `${formatDate(summary.firstDate)} to ${formatDate(summary.lastDate)}`
              : 'No valid dates'
          }
        />

        <Stat
          icon={<CheckCircle2 size={19} />}
          label="Valid rows"
          value={loading ? '…' : summary.validCount}
          note="Valid date and numeric price"
        />

        <Stat
          icon={<AlertTriangle size={19} />}
          label="Invalid rows"
          value={loading ? '…' : summary.invalidCount}
          note="Invalid or missing date/price"
        />
      </section>

      <section className="lower-grid data-summary-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Historical price records</h2>
              <p>Search and inspect the source observations.</p>
            </div>

            <button
              className="primary-btn"
              disabled={!rows.length}
              onClick={() =>
                downloadCsv(
                  rows,
                  'historical_price_data.csv',
                  ['date', 'price']
                )
              }
            >
              <FileSpreadsheet size={16} />
              Export CSV
            </button>
          </div>

          <label className="search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search date or price…"
              aria-label="Search historical data"
            />
          </label>

          {loading ? (
            <div className="empty-state">Loading historical data…</div>
          ) : (
            <div className="table-wrap data-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="number">Average monthly price</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => {
                    const valid =
                      /^\d{4}-\d{2}-\d{2}$/.test(
                        String(row.date ?? '').slice(0, 10)
                      ) &&
                      row.price !== null &&
                      row.price !== undefined &&
                      row.price !== '' &&
                      Number.isFinite(Number(row.price));

                    return (
                      <tr key={`${row.date}-${index}`}>
                        <td>{formatDate(row.date)}</td>
                        <td className="number">
                          {valid ? `₹${money(row.price)}` : '—'}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              valid ? 'valid' : 'invalid'
                            }`}
                          >
                            {valid ? 'Valid' : 'Check row'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {!rows.length && (
                    <tr>
                      <td colSpan="3">No records match this search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="chart-footnote">
            Showing {rows.length} of {history.length} returned records,
            newest first.
          </p>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Data quality summary</h2>
              <p>Calculated from returned records.</p>
            </div>
          </div>

          <Metric
            label="Duplicate dates"
            value={summary.duplicateDates}
          />
          <Metric
            label="Minimum price"
            value={
              summary.min == null ? null : `₹${money(summary.min)}`
            }
          />
          <Metric
            label="Maximum price"
            value={
              summary.max == null ? null : `₹${money(summary.max)}`
            }
          />
          <Metric
            label="Mean price"
            value={
              summary.mean == null ? null : `₹${money(summary.mean)}`
            }
          />
          <Metric
            label="Median price"
            value={
              summary.median == null
                ? null
                : `₹${money(summary.median)}`
            }
          />

          <div className="metric-note">
            Duplicate dates count extra valid rows that share a date.
            This page does not claim to detect statistical outliers or
            missing calendar months.
          </div>
        </div>
      </section>

      <footer>
        <span>Way2Agribusiness Forecasting Platform</span>
        <span>
          {loading
            ? 'Updating data…'
            : `Records loaded: ${summary.recordCount}`}
        </span>
      </footer>
    </>
  );
}

function Stat({ icon, label, value, note }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Metric({ label, value, suffix = '' }) {
  let display = '—';

  if (value !== null && value !== undefined && value !== '') {
    const numeric = Number(value);

    display = Number.isFinite(numeric)
      ? `${numeric.toLocaleString('en-IN', {
          maximumFractionDigits: 2
        })}${suffix}`
      : String(value);
  }

  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{display}</strong>
    </div>
  );
}
