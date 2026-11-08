// The desktop app is a window onto the web app: same UI on macOS and Windows, data and sign-in on the server.
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

// The Vite dev server in development; set APP_URL to the server that serves the built web app otherwise.
const url = process.env.APP_URL || 'http://localhost:5173';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true },
  });
  win.webContents.on('did-fail-load', (_e, _code, desc, failedUrl) => {
    if (failedUrl !== url && failedUrl !== `${url}/`) return;
    const msg = `<body style="font:14px system-ui;padding:48px"><h2>Cannot reach ${url}</h2><p>${desc}. Start it (pnpm dev), then reopen the app.</p></body>`;
    win.loadURL(`data:text/html,${encodeURIComponent(msg)}`);
  });
  win.loadURL(url);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
