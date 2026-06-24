import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'waymaker-25-initiative-metrics';
const PASSWORD_KEY = 'waymaker-25-initiative-admin-password';

const DEFAULT_PASSWORD = 'waymaker';

const DEFAULT_METRICS = [
  { key: 'gospel_responses', name: 'Gospel Responses', value: 0 },
  { key: 'baptisms', name: 'Baptisms', value: 0 },
  { key: 'church_plants', name: 'Church Plants', value: 0 },
  { key: 'goers_sent', name: 'Goers Sent', value: 0 },
  {
    key: 'goers_unreached',
    name: 'Goers Sent to Unreached People Groups',
    value: 0,
  },
];

function getStoredMetrics() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_METRICS;

    const parsed = JSON.parse(stored);

    return DEFAULT_METRICS.map((metric) => {
      const saved = parsed.find((item) => item.key === metric.key);
      return {
        ...metric,
        value: Number.isFinite(Number(saved?.value)) ? Number(saved.value) : 0,
      };
    });
  } catch {
    return DEFAULT_METRICS;
  }
}

function saveMetrics(metrics) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  window.dispatchEvent(new Event('metrics-updated'));
}

function getAdminPassword() {
  return window.localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function App() {
  const path = window.location.pathname;

  if (path.startsWith('/admin')) {
    return <AdminPage />;
  }

  return <DashboardPage />;
}

function DashboardPage() {
  const [metrics, setMetrics] = useState(getStoredMetrics);

  useEffect(() => {
    const refresh = () => setMetrics(getStoredMetrics());
    const interval = window.setInterval(refresh, 2000);

    window.addEventListener('storage', refresh);
    window.addEventListener('metrics-updated', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('metrics-updated', refresh);
    };
  }, []);

  const featured = metrics.slice(0, 2);
  const supporting = metrics.slice(2);

  return (
    <main className="dashboard-shell">
      <div className="background-grid" />
      <div className="angle angle-one" />
      <div className="angle angle-two" />
      <div className="angle angle-three" />

      <section className="dashboard-canvas">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Waymaker.Church</p>
            <h1>The 25 Initiative</h1>
          </div>
          <div className="header-mark" aria-hidden="true">
            25
          </div>
        </header>

        <section className="metrics-grid featured-grid">
          {featured.map((metric) => (
            <MetricCard key={metric.key} metric={metric} size="large" />
          ))}
        </section>

        <section className="metrics-grid supporting-grid">
          {supporting.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </section>
      </section>
    </main>
  );
}

function MetricCard({ metric, size = 'standard' }) {
  return (
    <article className={`metric-card metric-card-${size}`}>
      <div className="metric-accent" />
      <h2>{metric.name}</h2>
      <p>{formatNumber(metric.value)}</p>
    </article>
  );
}

function AdminPage() {
  const [isAuthed, setIsAuthed] = useState(() => window.sessionStorage.getItem('waymaker-admin-authed') === 'true');
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [metrics, setMetrics] = useState(getStoredMetrics);
  const [status, setStatus] = useState('');

  const dashboardUrl = useMemo(() => `${window.location.origin}/dashboard`, []);

  function handleLogin(event) {
    event.preventDefault();

    if (passwordAttempt === getAdminPassword()) {
      window.sessionStorage.setItem('waymaker-admin-authed', 'true');
      setIsAuthed(true);
      setPasswordAttempt('');
      setStatus('');
    } else {
      setStatus('Wrong password.');
    }
  }

  function updateMetric(key, value) {
    setMetrics((current) =>
      current.map((metric) =>
        metric.key === key
          ? { ...metric, value: value === '' ? '' : Math.max(0, Number(value)) }
          : metric,
      ),
    );
  }

  function handleSave(event) {
    event.preventDefault();

    const cleaned = metrics.map((metric) => ({
      ...metric,
      value: Number.isFinite(Number(metric.value)) ? Number(metric.value) : 0,
    }));

    setMetrics(cleaned);
    saveMetrics(cleaned);
    setStatus('Saved. The dashboard will update automatically.');
  }

  if (!isAuthed) {
    return (
      <main className="admin-shell">
        <form className="login-card" onSubmit={handleLogin}>
          <p className="eyebrow">The 25 Initiative</p>
          <h1>Admin Login</h1>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={passwordAttempt}
            onChange={(event) => setPasswordAttempt(event.target.value)}
            autoFocus
          />
          <button type="submit">Log In</button>
          {status && <p className="admin-status error">{status}</p>}
          <p className="admin-note">Default password: waymaker</p>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Waymaker.Church</p>
            <h1>The 25 Initiative Admin</h1>
          </div>
          <a href={dashboardUrl} target="_blank" rel="noreferrer">
            Open Dashboard
          </a>
        </header>

        <form onSubmit={handleSave} className="metric-form">
          {metrics.map((metric) => (
            <label className="metric-row" key={metric.key}>
              <span>{metric.name}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={metric.value}
                onChange={(event) => updateMetric(metric.key, event.target.value)}
              />
            </label>
          ))}

          <div className="admin-actions">
            <button type="submit">Save Changes</button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                window.sessionStorage.removeItem('waymaker-admin-authed');
                setIsAuthed(false);
              }}
            >
              Log Out
            </button>
          </div>
        </form>

        {status && <p className="admin-status">{status}</p>}

        <footer className="admin-footer">
          <p>Use this admin page from another device on the same network.</p>
          <code>{window.location.origin}/admin</code>
        </footer>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
