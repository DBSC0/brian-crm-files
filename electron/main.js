const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const express = require('express');
const { checkAndUpdate } = require('./updater');

let mainWindow = null;
let server = null;
let port = null;

function createSplash() {
  const splash = new BrowserWindow({
    width: 380,
    height: 220,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  splash.loadURL(`data:text/html;charset=utf-8,<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0f172a;
    display: flex; align-items: center; justify-content: center;
    height: 100vh; font-family: -apple-system, sans-serif;
  }
  .container { text-align: center; color: #94a3b8; }
  .title { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 6px; }
  .title span { color: #818cf8; }
  .sub { font-size: 13px; color: #64748b; margin-bottom: 18px; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%;
         background: #818cf8; animation: bounce 1.2s infinite ease-in-out; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
    40% { transform: scale(1); opacity: 1; }
  }
  .dots { display: flex; gap: 6px; justify-content: center; }
</style>
</head>
<body>
  <div class="container">
    <div class="title">Brian <span>CRM</span></div>
    <div class="sub">Verificando actualizaciones&hellip;</div>
    <div class="dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  </div>
</body>
</html>`);

  return splash;
}

function startServer(cacheDir, baseDir) {
  return new Promise((resolve) => {
    const expressApp = express();

    expressApp.use(express.static(cacheDir));
    expressApp.use(express.static(baseDir));

    server = http.createServer(expressApp);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve(port);
    });
  });
}

function createMainWindow(appPort) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: 'Brian CRM',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${appPort}/index.html`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Quitar barra de menú
  mainWindow.setMenuBarVisibility(false);

  return mainWindow;
}

app.whenReady().then(async () => {
  const CACHE_DIR = path.join(app.getPath('userData'), 'cache');
  const BASE_DIR = path.join(__dirname, '..');

  const splash = createSplash();

  try {
    await checkAndUpdate(CACHE_DIR);
  } catch (err) {
    console.error('[main] Error en updater:', err.message);
  }

  const appPort = await startServer(CACHE_DIR, BASE_DIR);

  const win = createMainWindow(appPort);

  win.once('ready-to-show', () => {
    splash.destroy();
  });
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null && port) {
    createMainWindow(port);
  }
});
