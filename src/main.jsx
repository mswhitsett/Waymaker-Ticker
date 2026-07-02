import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'waymaker-25-initiative-metrics';
const SESSION_AUTH_KEY = 'waymaker-admin-authed';
const DEFAULT_PASSWORD = 'waymaker';
const SLIDE_DURATION_MS = 12000;

const DEFAULT_METRICS = [
  { key: 'gospel_responses', name: 'Gospel Responses', value: 0, displayOrder: 1 },
  { key: 'baptisms', name: 'Baptisms', value: 0, displayOrder: 2 },
  { key: 'church_plants', name: 'Church Plants', value: 0, displayOrder: 3 },
  { key: 'goers_sent', name: 'Goers Sent', value: 0, displayOrder: 4 },
  {
    key: 'goers_sent_unreached',
    name: 'Goers to the Nations',
    value: 0,
    displayOrder: 5,
  },
];

function normalizeMetrics(metrics = []) {
  return DEFAULT_METRICS.map((metric) => {
    const saved = metrics.find((item) => item.key === metric.key);
    return {
      ...metric,
      value: Number.isFinite(Number(saved?.value)) ? Number(saved.value) : 0,
    };
  });
}

function getLocalData() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { title: 'The 25 Initiative', metrics: DEFAULT_METRICS };

    const parsed = JSON.parse(stored);
    const storedMetrics = Array.isArray(parsed) ? parsed : parsed.metrics;

    return {
      title: 'The 25 Initiative',
      metrics: normalizeMetrics(storedMetrics),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return { title: 'The 25 Initiative', metrics: DEFAULT_METRICS };
  }
}

function saveLocalData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('metrics-updated'));
}

async function fetchDashboardData() {
  try {
    const response = await fetch('/api/metrics', { cache: 'no-store' });
    if (!response.ok) throw new Error('API unavailable');

    const data = await response.json();
    const normalized = {
      title: data.title || 'The 25 Initiative',
      metrics: normalizeMetrics(data.metrics),
      updatedAt: data.updatedAt,
    };

    saveLocalData(normalized);
    return normalized;
  } catch {
    return getLocalData();
  }
}

async function saveDashboardData(metrics, password) {
  const cleanedData = {
    title: 'The 25 Initiative',
    metrics: normalizeMetrics(metrics),
  };

  try {
    const response = await fetch('/api/metrics', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify(cleanedData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Unable to save changes.');
    }

    const data = await response.json();
    const normalized = {
      title: data.title || 'The 25 Initiative',
      metrics: normalizeMetrics(data.metrics),
      updatedAt: data.updatedAt,
    };

    saveLocalData(normalized);
    return normalized;
  } catch (error) {
    if (password !== DEFAULT_PASSWORD) {
      throw error;
    }

    const localOnlyData = {
      ...cleanedData,
      updatedAt: new Date().toISOString(),
    };
    saveLocalData(localOnlyData);
    return localOnlyData;
  }
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
  const [data, setData] = useState(getLocalData);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      const nextData = await fetchDashboardData();
      if (isMounted) setData(nextData);
    }

    refresh();
    const interval = window.setInterval(refresh, 2000);

    window.addEventListener('storage', refresh);
    window.addEventListener('metrics-updated', refresh);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('metrics-updated', refresh);
    };
  }, []);

  const metrics = data.metrics || DEFAULT_METRICS;
  const activeMetric = metrics[activeIndex % metrics.length] || metrics[0];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % Math.max(metrics.length, 1));
    }, SLIDE_DURATION_MS);

    return () => window.clearInterval(interval);
  }, [metrics.length]);

  return (
    <main className="dashboard-shell slideshow-shell">
      <div className="background-grid" />
      <div className="angle angle-one" />
      <div className="angle angle-two" />
      <div className="angle angle-three" />

      <section className="dashboard-canvas slideshow-canvas">
        <header className="dashboard-header slideshow-header">
          <div className="title-block">
            <h1>The 25 Initiative</h1>
            <p className="header-subtitle">To our neighbors and to the nations since 2023.</p>
          </div>
          <div className="header-mark" aria-hidden="true">
            25
          </div>
        </header>

        <section className="slideshow-stage" aria-live="polite">
          <MetricSlide key={`${activeMetric.key}-${activeIndex}`} metric={activeMetric} />
        </section>
      </section>
    </main>
  );
}

function MetricSlide({ metric }) {
  return (
    <article className="metric-slide">
      <div className="metric-slide-content">
        <div className="metric-accent" />
        <h2>{metric.name}</h2>
        <p>{formatNumber(metric.value)}</p>
      </div>
    </article>
  );
}

function AdminPage() {
  const [isAuthed, setIsAuthed] = useState(() => window.sessionStorage.getItem(SESSION_AUTH_KEY) === 'true');
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [adminPassword, setAdminPassword] = useState(DEFAULT_PASSWORD);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [status, setStatus] = useState('');
  const [adminUrls, setAdminUrls] = useState([]);

  const dashboardUrl = useMemo(() => `${window.location.origin}/dashboard`, []);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const nextData = await fetchDashboardData();
      if (isMounted) setMetrics(nextData.metrics);
    }

    async function loadConfig() {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) return;
        const config = await response.json();
        if (isMounted) setAdminUrls(config.adminUrls || []);
      } catch {
        // The browser-only dev version will not have this endpoint.
      }
    }

    loadData();
    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleLogin(event) {
    event.preventDefault();

    if (!passwordAttempt.trim()) {
      setStatus('Enter the admin password.');
      return;
    }

    window.sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
    setAdminPassword(passwordAttempt);
    setIsAuthed(true);
    setPasswordAttempt('');
    setStatus('');
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

  async function handleSave(event) {
    event.preventDefault();

    try {
      const saved = await saveDashboardData(metrics, adminPassword);
      setMetrics(saved.metrics);
      setStatus('Saved. The dashboard will update automatically.');
    } catch (error) {
      setStatus(error.message || 'Unable to save changes.');
    }
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
                window.sessionStorage.removeItem(SESSION_AUTH_KEY);
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
          {adminUrls.length > 0 ? (
            adminUrls.map((url) => <code key={url}>{url}</code>)
          ) : (
            <code>{window.location.origin}/admin</code>
          )}
        </footer>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
