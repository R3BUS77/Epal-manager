import { AppData, Client, Movement } from '../types';

const fs = window.require('fs');
const path = window.require('path');

// Determine storage path
// Using process.cwd() usually points to the app root in development and production
const DB_DIR = path.join(process.cwd(), 'DATABASE');
const CLIENTS_FILE = path.join(DB_DIR, 'clients.json');
const MOVEMENTS_FILE = path.join(DB_DIR, 'movements.json');

// Ensure DB directory and files exist
const ensureDbExists = () => {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(CLIENTS_FILE)) {
      fs.writeFileSync(CLIENTS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(MOVEMENTS_FILE)) {
      fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

// Initialize on load
ensureDbExists();

export const getClients = (): Client[] => {
  try {
    if (fs.existsSync(CLIENTS_FILE)) {
      const data = fs.readFileSync(CLIENTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    console.error("Failed to load clients", e);
    return [];
  }
};

export const saveClients = (clients: Client[]) => {
  try {
    ensureDbExists();
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
  } catch (e) {
    console.error("Failed to save clients", e);
  }
};

export const getMovements = (): Movement[] => {
  try {
    if (fs.existsSync(MOVEMENTS_FILE)) {
      const data = fs.readFileSync(MOVEMENTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    console.error("Failed to load movements", e);
    return [];
  }
};

export const saveMovements = (movements: Movement[]) => {
  try {
    ensureDbExists();
    fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify(movements, null, 2));
  } catch (e) {
    console.error("Failed to save movements", e);
  }
};

// Export entire DB to JSON file (Backup)
export const exportData = () => {
  const data: AppData = {
    clients: getClients(),
    movements: getMovements(),
  };
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