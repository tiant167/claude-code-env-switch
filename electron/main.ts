import { app, BrowserWindow, Tray, nativeImage, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { getClaudeSettings, setClaudeEnv } from './claudeConfig';
import { store, ProviderEnv } from './appStore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;
let tray: Tray | null;

function createWindow() {
  win = new BrowserWindow({
    width: 340,
    height: 500,
    frame: false,
    show: true, // Auto-show for easier debugging
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  win.on('blur', () => {
    if (!win?.webContents.isDevToolsOpened()) {
      win?.hide();
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    // win.webContents.openDevTools({ mode: 'detach' }); // Uncomment to debug React
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC!, 'iconTemplate@2x.png');
  const icon = process.platform === 'darwin' 
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createFromPath(iconPath).resize({width: 22, height: 22});
  
  tray = new Tray(icon);
  tray.setToolTip('Claude Code Settings Manager');

  tray.on('click', (event, bounds) => {
    if (!win) return;
    const { x, y } = bounds;
    const { height, width } = win.getBounds();
    
    const yPosition = process.platform === 'darwin' ? y : y - height;
    
    win.setBounds({
      x: Math.round(x - width / 2),
      y: yPosition,
      height,
      width,
    });

    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
}

// Inter-Process Communication
ipcMain.handle('get-providers', () => {
  return store.get('providers');
});

ipcMain.handle('get-active-provider', () => {
  return store.get('activeProviderId');
});

ipcMain.handle('set-active-provider', (event, providerId: string) => {
  const providers = store.get('providers');
  const provider = providers.find(p => p.id === providerId);
  
  if (provider) {
    // 1. Only back up current state if we are switching TO a regular configuration
    if (providerId !== 'backup') {
      const currentSettings = getClaudeSettings() || {};
      const backupIndex = providers.findIndex(p => p.id === 'backup');
      const timestamp = new Date().toLocaleString();
      
      if (backupIndex !== -1) {
        providers[backupIndex].env = currentSettings.env || {};
        providers[backupIndex].updatedAt = timestamp;
      } else {
        providers.push({ id: 'backup', name: 'Backup Settings', env: currentSettings.env || {}, readonly: true, updatedAt: timestamp });
      }
      store.set('providers', providers);
    }

    // 2. Perform Switch
    store.set('activeProviderId', providerId);
    setClaudeEnv(provider.env || {});
    return true;
  }
  return false;
});

ipcMain.handle('update-provider', (event, updatedProvider: ProviderEnv) => {
  const providers = store.get('providers');
  const index = providers.findIndex(p => p.id === updatedProvider.id);
  if (index !== -1) {
    providers[index] = updatedProvider;
    store.set('providers', providers);
    
    if (store.get('activeProviderId') === updatedProvider.id) {
      setClaudeEnv(updatedProvider.env || {});
    }
    return true;
  }
  return false;
});

ipcMain.handle('add-provider', (event, newProvider: ProviderEnv) => {
  const providers = store.get('providers');
  providers.push(newProvider);
  store.set('providers', providers);
  return true;
});

ipcMain.handle('delete-provider', (event, providerId: string) => {
  const providers = store.get('providers');
  const filtered = providers.filter(p => p.id !== providerId);
  store.set('providers', filtered);
  if (store.get('activeProviderId') === providerId) {
    store.set('activeProviderId', null);
  }
  return true;
});

ipcMain.handle('fetch-balance', async (event, providerId: string) => {
  const providers = store.get('providers');
  const provider = providers.find(p => p.id === providerId);
  // Defaulting to try reading from env
  const apiKey = provider?.env?.['ANTHROPIC_AUTH_TOKEN'] || provider?.apiKey;
  if (!provider || !apiKey) return null;

  try {
    if (provider.id.includes('kimi') || (provider.env?.['ANTHROPIC_BASE_URL'] || '').includes('moonshot')) {
      const resp = await fetch('https://api.moonshot.cn/v1/users/me/balance', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return await resp.json();
    } else if (provider.id.includes('zhipu') || (provider.env?.['ANTHROPIC_BASE_URL'] || '').includes('bigmodel')) {
      // Zhipu specific balance API (To be verified or configured by user later)
      return { msg: 'Querying Zhipu balance...', error: 'No documented standard billing API available yet.' };
    }
  } catch (err: any) {
    return { error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
