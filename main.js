const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { execSync } = require('child_process');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getPackageDetails(name) {
  try {
    const output = execSync(`apt-cache show ${name}`).toString();
    const lines = output.split('\n');
    
    const details = { name };
    lines.forEach(line => {
      if (line.startsWith('Version: ')) details.version = line.replace('Version: ', '');
      if (line.startsWith('Description-en: ')) details.description = line.replace('Description-en: ', '');
      else if (line.startsWith('Description: ')) details.description = line.replace('Description: ', '');
      if (line.startsWith('Size: ')) details.size = formatBytes(parseInt(line.replace('Size: ', '')));
      if (line.startsWith('Section: ')) details.section = line.replace('Section: ', '');
    });

    try {
      execSync(`dpkg -s ${name} 2>/dev/null`);
      details.installed = true;
    } catch {
      details.installed = false;
    }

    return details;
  } catch {
    return null;
  }
}

ipcMain.handle('search-packages', async (event, query) => {
  try {
    const output = execSync(`apt-cache search "${query}" | head -n 50`).toString();
    const lines = output.split('\n').filter(line => line.trim() !== '');
    
    return lines.map(line => {
      const [name] = line.split(' - ');
      return getPackageDetails(name.trim());
    }).filter(pkg => pkg !== null);
  } catch (error) {
    console.error('Error searching apt packages:', error);
    return [];
  }
});

ipcMain.handle('install-package', async (event, name) => {
  try {
    execSync(`sudo apt-get install -y ${name}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('uninstall-package', async (event, name) => {
  try {
    execSync(`sudo apt-get remove -y ${name}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Abrar Apt Store",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hiddenInset',
  });

  // Load the Next.js dev server if in development, or the build output in production
  const url = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../out/index.html')}`;
  win.loadURL(url);

  if (isDev) {
    // win.webContents.openDevTools();
  }
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
