const { app, BrowserWindow, Menu, shell } = require('electron');
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.TICKER_PORT || 4173);
const HOST = '0.0.0.0';
const ADMIN_PASSWORD = process.env.TICKER_ADMIN_PASSWORD || 'waymaker';

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

let mainWindow;
let server;

function getDataFilePath() {
  return path.join(app.getPath('userData'), 'metrics.json');
}

function getDefaultData() {
  return {
    title: 'The 25 Initiative',
    metrics: DEFAULT_METRICS,
    updatedAt: new Date().toISOString(),
  };
}

function ensureDataFile() {
  const dataFilePath = getDataFilePath();
  if (!fs.existsSync(dataFilePath)) {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
    fs.writeFileSync(dataFilePath, JSON.stringify(getDefaultData(), null, 2));
  }
}

function readData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(getDataFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultData(),
      ...parsed,
      metrics: DEFAULT_METRICS.map((defaultMetric) => {
        const saved = parsed.metrics?.find((metric) => metric.key === defaultMetric.key);
        return {
          ...defaultMetric,
          value: Number(saved?.value ?? defaultMetric.value),
        };
      }),
    };
  } catch (error) {
    console.error('Failed to read metrics data:', error);
    return getDefaultData();
  }
}

function writeData(nextData) {
  const data = {
    title: 'The 25 Initiative',
    metrics: DEFAULT_METRICS.map((defaultMetric) => {
      const incoming = nextData.metrics?.find((metric) => metric.key === defaultMetric.key);
      return {
        ...defaultMetric,
        value: Math.max(0, Number.parseInt(incoming?.value ?? 0, 10) || 0),
      };
    }),
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(getDataFilePath(), JSON.stringify(data, null, 2));
  return data;
}

function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.push(`http://${entry.address}:${PORT}/admin`);
      }
    }
  }

  return addresses;
}

function startServer() {
  const webApp = express();
  const distPath = path.join(__dirname, '..', 'dist');

  webApp.use(express.json());

  webApp.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  webApp.get('/api/config', (_req, res) => {
    res.json({
      title: 'The 25 Initiative',
      port: PORT,
      adminUrls: getNetworkAddresses(),
    });
  });

  webApp.get('/api/metrics', (_req, res) => {
    res.json(readData());
  });

  webApp.put('/api/metrics', (req, res) => {
    const password = req.headers['x-admin-password'];

    if (password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }

    const savedData = writeData(req.body || {});
    res.json(savedData);
  });

  webApp.use(express.static(distPath));

  webApp.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return new Promise((resolve, reject) => {
    const instance = webApp.listen(PORT, HOST, () => resolve(instance));
    instance.on('error', reject);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#050b12',
    title: 'The 25 Initiative',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}/dashboard`);
}

function createMenu() {
  const adminUrls = getNetworkAddresses();
  const firstAdminUrl = adminUrls[0] || `http://127.0.0.1:${PORT}/admin`;

  const template = [
    {
      label: 'The 25 Initiative',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Open Admin Panel',
          click: () => shell.openExternal(firstAdminUrl),
        },
        {
          label: 'Copy Admin URL',
          click: () => {
            const { clipboard } = require('electron');
            clipboard.writeText(firstAdminUrl);
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  ensureDataFile();
  server = await startServer();
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
