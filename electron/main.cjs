const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, shell } = require('electron');
const path = require('path');
const isDev = !app.isPackaged; // Controllo semplice per modalità sviluppo

let win;
let splash;

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

// Handler per Menu Contestuale
ipcMain.handle('show-context-menu', (event, filePath) => {
  const menu = new Menu();

  menu.append(new MenuItem({
    label: 'Apri',
    click: () => {
      shell.openPath(filePath);
    }
  }));

  menu.append(new MenuItem({
    label: 'Mostra in Esplora File',
    click: () => {
      shell.showItemInFolder(filePath);
    }
  }));

  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

function createWindow() {
  // Crea Finestra Principale (Nascosta inizialmente)
  win = new BrowserWindow({
    show: false,
    kiosk: true,
    alwaysOnTop: true, // Forza la finestra in primo piano per coprire la barra delle applicazioni
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'icon.png')
  });

  // Crea Finestra Splash
  splash = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
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
