import { AppData, Client, Movement } from '../types';
import JSZip from 'jszip';

const fs = window.require('fs');
const path = window.require('path');

const DB_PATH_KEY = 'epal_db_path';

// Helper to get current DB path
export const getDbPath = (): string | null => {
  return localStorage.getItem(DB_PATH_KEY);
};

// Helper to set DB path
export const setDbPath = async (newPath: string) => {
  localStorage.setItem(DB_PATH_KEY, newPath);
  // Re-init immediately and WAIT for it to finish before returning
  await initializeDatabaseAsync();
};

// Helper: Async exists check
const existsAsync = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// HEX SIGNATURES
const SIG_CLIENTS = '434C49454E5453';   // CLIENTS
const SIG_MOVEMENTS = '4D4F56454D454E5453'; // MOVEMENTS

// Initialize on load (Async)
export const initializeDatabaseAsync = async (): Promise<boolean> => {
  const dbPath = getDbPath();
  if (!dbPath) return false;

  try {
    const clientsFile = path.join(dbPath, 'clients.json');
    const movementsFile = path.join(dbPath, 'movements.json');

    // Check directory existence
    if (!(await existsAsync(dbPath))) {
      try {
        await fs.promises.mkdir(dbPath, { recursive: true });
      } catch (e) {
        console.error("Cannot create DB directory", e);
        return false;
      }
    }

    if (!(await existsAsync(clientsFile))) {
      // Init with Signed Format
      await fs.promises.writeFile(clientsFile, JSON.stringify({ hexSignature: SIG_CLIENTS, data: [] }, null, 2));
    }
    if (!(await existsAsync(movementsFile))) {
      // Init with Signed Format
      await fs.promises.writeFile(movementsFile, JSON.stringify({ hexSignature: SIG_MOVEMENTS, data: [] }, null, 2));
    }
    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
};

// Sync version kept for legacy/compatibility if needed, but we should move away from it
export const initializeDatabase = (): boolean => {
  // Legacy sync implementation - try to avoid using
  const dbPath = getDbPath();
  if (!dbPath) return false;
  try {
    if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
    if (!fs.existsSync(path.join(dbPath, 'clients.json'))) fs.writeFileSync(path.join(dbPath, 'clients.json'), JSON.stringify([], null, 2));
    if (!fs.existsSync(path.join(dbPath, 'movements.json'))) fs.writeFileSync(path.join(dbPath, 'movements.json'), JSON.stringify([], null, 2));
    return true;
  } catch (e) { return false; }
};

export const getClientsAsync = async (): Promise<Client[]> => {
  const dbPath = getDbPath();
  if (!dbPath) return [];

  const clientsFile = path.join(dbPath, 'clients.json');
  try {
    if (!(await existsAsync(clientsFile))) {
      return [];
    }

    const content = await fs.promises.readFile(clientsFile, 'utf-8');
    const json = JSON.parse(content);

    // Support both Signed Format and Legacy Array
    if (Array.isArray(json)) return json;
    if (json.data && Array.isArray(json.data)) return json.data;

    return [];
  } catch (e) {
    console.error("Failed to load clients async", e);
    return [];
  }
};

export const getClients = (): Client[] => {
  // Sync fallback
  const dbPath = getDbPath();
  if (!dbPath) return [];
  const clientsFile = path.join(dbPath, 'clients.json');
  try {
    if (fs.existsSync(clientsFile)) {
      const content = fs.readFileSync(clientsFile, 'utf-8');
      const json = JSON.parse(content);
      if (Array.isArray(json)) return json;
      if (json.data && Array.isArray(json.data)) return json.data;
    }
  } catch (e) { }
  return [];
}


export const saveClientsAsync = async (clients: Client[]) => {
  const dbPath = getDbPath();
  if (!dbPath) return;

  const clientsFile = path.join(dbPath, 'clients.json');
  try {
    const output = { hexSignature: SIG_CLIENTS, data: clients };
    await fs.promises.writeFile(clientsFile, JSON.stringify(output, null, 2));
  } catch (e) {
    console.error("Failed to save clients async", e);
  }
};

// Alias for sync save (should be deprecated)
export const saveClients = (clients: Client[]) => {
  // Use sync for safety if implicit return needed, but we want to unblock UI
  const dbPath = getDbPath();
  if (!dbPath) return;
  try {
    const output = { hexSignature: SIG_CLIENTS, data: clients };
    fs.writeFileSync(path.join(dbPath, 'clients.json'), JSON.stringify(output, null, 2));
  } catch (e) { console.error(e) }
};

export const getMovementsAsync = async (): Promise<Movement[]> => {
  const dbPath = getDbPath();
  if (!dbPath) return [];

  const movementsFile = path.join(dbPath, 'movements.json');
  try {
    if (!(await existsAsync(movementsFile))) {
      return [];
    }
    const content = await fs.promises.readFile(movementsFile, 'utf-8');
    const json = JSON.parse(content);
    if (Array.isArray(json)) return json;
    if (json.data && Array.isArray(json.data)) return json.data;
    return [];
  } catch (e) {
    console.error("Failed to save movements async", e);
    return [];
  }
};

export const getMovements = (): Movement[] => {
  // Sync fallback
  const dbPath = getDbPath();
  if (!dbPath) return [];
  const f = path.join(dbPath, 'movements.json');
  try {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf-8');
      const json = JSON.parse(content);
      if (Array.isArray(json)) return json;
      if (json.data && Array.isArray(json.data)) return json.data;
    }
  } catch (e) { }
  return [];
}

export const saveMovementsAsync = async (movements: Movement[]) => {
  const dbPath = getDbPath();
  if (!dbPath) return;

  const movementsFile = path.join(dbPath, 'movements.json');
  try {
    const output = { hexSignature: SIG_MOVEMENTS, data: movements };
    await fs.promises.writeFile(movementsFile, JSON.stringify(output, null, 2));
  } catch (e) {
    console.error("Failed to save movements async", e);
  }
};

export const saveMovements = (movements: Movement[]) => {
  const dbPath = getDbPath();
  if (!dbPath) return;
  try {
    const output = { hexSignature: SIG_MOVEMENTS, data: movements };
    fs.writeFileSync(path.join(dbPath, 'movements.json'), JSON.stringify(output, null, 2));
  } catch (e) { console.error(e) }
};

export const exportDataAsync = async () => {
  const [clients, movements] = await Promise.all([getClientsAsync(), getMovementsAsync()]);
  const data: AppData = { clients, movements };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `epal_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Deprecated sync export
export const exportData = () => {
  exportDataAsync();
};

export const exportDataToPath = async (targetPath: string) => {
  const [clients, movements] = await Promise.all([getClientsAsync(), getMovementsAsync()]);
  const data: AppData & { fileType: string, version: string, hexSignature: string } = {
    clients,
    movements,
    fileType: 'EPAL_BACKUP',
    version: '4.0.0',
    hexSignature: '4550414C5F46554C4C' // EPAL_FULL_BACKUP
  };
  await fs.promises.writeFile(targetPath, JSON.stringify(data, null, 2));
};

export const exportZipToPath = async (targetPath: string) => {
  const [clients, movements] = await Promise.all([getClientsAsync(), getMovementsAsync()]);

  const zip = new JSZip();

  // Create clients.json content
  const clientsData = {
    hexSignature: SIG_CLIENTS,
    data: clients
  };
  zip.file("clients.json", JSON.stringify(clientsData, null, 2));

  // Create movements.json content
  const movementsData = {
    hexSignature: SIG_MOVEMENTS,
    data: movements
  };
  zip.file("movements.json", JSON.stringify(movementsData, null, 2));

  // Generate zip file
  // platform: nodejs
  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9
    }
  });

  await fs.promises.writeFile(targetPath, content);
};

// Parse imported JSON
export const validateAndParseImport = (jsonString: string): AppData | null => {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data.clients) && Array.isArray(data.movements)) {
      // Basic validation passed
      return data as AppData;
    }
    return null;
  } catch (e) {
    return null;
  }
};