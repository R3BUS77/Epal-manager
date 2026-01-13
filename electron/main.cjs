const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, shell } = require('electron');
const path = require('path');
const isDev = !app.isPackaged; // Controllo semplice per modalità sviluppo

let win;
let splash;
let splashOut; // New window for shutdown
let isQuitting = false; // Flag to track if we are truly quitting


// Handler IPC per Selezione Directory
// Handler IPC per Selezione Directory
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled) {
    return null;
  } else {
    return result.filePaths[0];
  }
});

// Handler IPC per chiusura applicazione
ipcMain.on('app-close', () => {
  app.quit();
});

// Handler IPC per forzare il focus della finestra (Fix per input non cliccabili)
ipcMain.on('app-focus', () => {
  // Se la splash screen è ancora attiva, IGNORA il focus per evitare di mostrarla prematuramente
  if (splash && !splash.isDestroyed()) {
    return;
  }

  if (win) {
    if (win.isMinimized()) win.restore();

    // "Nuclear" focus fix for Windows: force top, then release
    win.setAlwaysOnTop(true);
    win.show();
    win.focus();
    win.setAlwaysOnTop(false);
  }
});

function createWindow() {
  // Crea Finestra Principale (Nascosta inizialmente)
  win = new BrowserWindow({
    show: false,
    kiosk: false, // Disabilitato per permettere Alt+Tab
    fullscreen: true, // Aggiunto per mantenere il full screen
    alwaysOnTop: false, // Disabilitato per permettere di coprire la finestra con altre app
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'icon.png')
  });

  // Intercept Close Event for Splash Out
  win.on('close', (e) => {
    // If we are already quitting, let it proceed
    if (isQuitting) return;

    // Prevent default close (which minimizes or destroys immediately)
    e.preventDefault();

    // 1. Create Splash Out Window
    splashOut = new BrowserWindow({
      fullscreen: true,
      frame: false,
      alwaysOnTop: true, // Force on top for goodbye
      backgroundColor: '#0f172a',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      icon: path.join(__dirname, 'icon.png')
    });

    splashOut.loadFile(path.join(__dirname, 'splash-out.html'));

    // 2. Hide Main Window immediately
    win.hide();

    // 3. Wait 5 seconds then quit for real
    setTimeout(() => {
      isQuitting = true;
      if (splashOut && !splashOut.isDestroyed()) splashOut.close();
      app.quit();
    }, 5000);
  });

  // Crea Finestra Splash
  splash = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Necessario per usare require in splash.html
    },
    icon: path.join(__dirname, 'icon.png')
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Variabile per gestire il timeout di sicurezza
  let safetyTimeout;

  // Funzione per chiudere splash e mostrare main
  const closeSplash = () => {
    if (safetyTimeout) clearTimeout(safetyTimeout);

    if (splash && !splash.isDestroyed()) {
      splash.destroy();
    }
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    }
  };

  // Ascolta il segnale dalla splash screen quando ha finito l'animazione
  ipcMain.once('splash-finished', () => {
    closeSplash();
  });

  // Determina quando mostrare la finestra principale
  if (isDev) {
    win.once('ready-to-show', () => {
      closeSplash();
    });
  } else {
    // Timeout di sicurezza nel caso l'animazione, per qualche motivo, si bloccasse
    safetyTimeout = setTimeout(() => {
      closeSplash();
    }, 18000); // 18s (abbastanza tempo per l'animazione da 15s + buffer)
  }
}

// Disabilita Accelerazione Hardware per correggere schermo bianco/freeze su alcuni PC Windows
app.disableHardwareAcceleration();

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
