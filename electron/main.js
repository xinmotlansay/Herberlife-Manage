const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure UserData directories for SQLite database, uploads, backups and tmp
const userDataPath = app.getPath('userData');
const appDataDir = path.join(userDataPath, 'data');
const appUploadsDir = path.join(userDataPath, 'uploads');
const appBackupsDir = path.join(userDataPath, 'backups');
const appTmpDir = path.join(userDataPath, 'tmp');

if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });
if (!fs.existsSync(appUploadsDir)) fs.mkdirSync(appUploadsDir, { recursive: true });
if (!fs.existsSync(appBackupsDir)) fs.mkdirSync(appBackupsDir, { recursive: true });
if (!fs.existsSync(appTmpDir)) fs.mkdirSync(appTmpDir, { recursive: true });

process.env.HERBALIFE_DATA_DIR = appDataDir;
process.env.HERBALIFE_UPLOADS_DIR = appUploadsDir;
process.env.HERBALIFE_BACKUPS_DIR = appBackupsDir;
process.env.HERBALIFE_TMP_DIR = appTmpDir;

// Start Express Backend Server
const backendApp = require('../backend/src/app');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'HERBALIFE MANAGER - Quản Lý Cửa Hàng',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove default menu bar for clean app experience
  Menu.setApplicationMenu(null);

  const isDev = process.env.NODE_ENV === 'development';
  const targetUrl = isDev ? 'http://localhost:5173' : 'http://localhost:3000';

  mainWindow.loadURL(targetUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
