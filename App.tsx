import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetails } from './pages/ClientDetails';
import { DailyMovements } from './pages/DailyMovements';
import { Settings } from './pages/Settings';
import { ClientSelection } from './pages/ClientSelection';
import { DebtorClients } from './pages/DebtorClients';
import { CalendarPage } from './pages/CalendarPage';
import { Client, Movement, AppData } from './types';
import { getClientsAsync, getMovementsAsync, saveClientsAsync, saveMovementsAsync, getDbPath } from './services/storageService';
import { acquireLockAsync, releaseLockAsync, LockInfo } from './services/lockService';
import { OperatorModal } from './components/OperatorModal';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { LockScreen } from './components/LockScreen';
import { RefreshCw, Database } from 'lucide-react'; // Icone aggiunte per schermata di errore

// Generatore ID semplice
const generateId = () => Math.random().toString(36).substr(2, 9);

// ipcRenderer per selezione directory
const { ipcRenderer } = window.require('electron');

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  // Persistent User Session (SessionStorage dies on app close, persists on reload/db-switch)
  const [operatorName, setOperatorName] = useState<string>(() => {
    return sessionStorage.getItem('epal_operator_name') || '';
  });

  // Persist name changes
  useEffect(() => {
    if (operatorName) {
      sessionStorage.setItem('epal_operator_name', operatorName);
    } else {
      sessionStorage.removeItem('epal_operator_name');
    }
  }, [operatorName]);

  // Stato di caricamento per operazioni asincrone
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false); // Nuovo stato di errore

  // Nuovo stato per configurazione DB
  const [isDbConfigured, setIsDbConfigured] = useState<boolean>(!!getDbPath());
  const [isDbSkipped, setIsDbSkipped] = useState(false);

  // Stato Lock
  const [isLocked, setIsLocked] = useState(false); // Abbiamo il lock?
  const [lockConflict, setLockConflict] = useState<LockInfo | null>(null); // Chi ce l'ha se non noi?

  // Versione Path DB per triggerare ricaricamento
  const [dbPathVersion, setDbPathVersion] = useState(0);

  // Caricamento dati iniziale (Asincrono)
  useEffect(() => {
    const loadData = async () => {
      // Carica solo se DB configurato. Se saltato, rimani vuoto.
      if (isDbConfigured) {
        setIsLoading(true);
        setLoadError(false);

        // Promise Timeout
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );

        try {
          const [c, m] = await Promise.race([
            Promise.all([getClientsAsync(), getMovementsAsync()]),
            timeout
          ]) as [Client[], Movement[]];

          setClients(c);
          setMovements(m);
          setIsLoaded(true);
          setIsLoading(false);
        } catch (e) {
          console.error("Caricamento dati fallito o timeout", e);
          setLoadError(true);
          setIsLoading(false);
        }
      } else {
        // Se saltato/non configurato, controlla se saltato per fermare caricamento
        if (isDbSkipped) setIsLoaded(true);
      }
    };
    loadData();
  }, [isDbConfigured, isDbSkipped, dbPathVersion]); // Aggiunto dbPathVersion

  // Tenta di acquisire lock quando operatore è impostato (Asincrono)
  useEffect(() => {
    // ... existing lock logic
    const tryLock = async () => {
      if (isDbConfigured && operatorName && !isLocked) {
        // Only show loading if we are NOT already loaded to avoid stutter
        // actually acquiring lock is fast usually
        const result = await acquireLockAsync(operatorName);

        if (result.success) {
          setIsLocked(true);
          setLockConflict(null);
        } else {
          setLockConflict(result.info || null);
        }
      }
    };
    tryLock();
  }, [isDbConfigured, operatorName, isLocked]);

  // Rilascia lock su chiusura
  useEffect(() => {
    const handleUnload = () => {
      if (isLocked) releaseLockAsync();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      if (isLocked) releaseLockAsync();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [isLocked]);

  // Salva modfiche (Asincrono - fire and forget, o potremmo mostrare stato salvataggio)
  useEffect(() => {
    if (isLoaded && isDbConfigured && isLocked) {
      saveClientsAsync(clients);
    }
  }, [clients, isLoaded, isDbConfigured, isLocked]);

  useEffect(() => {
    if (isLoaded && isDbConfigured && isLocked) {
      saveMovementsAsync(movements);
    }
  }, [movements, isLoaded, isDbConfigured, isLocked]);

  useEffect(() => {
    if (isLoaded && isDbConfigured) {
      // Force aggressive focus when app becomes ready (startup or reload)
      // This fixes the issue where inputs are not clickable after DB load
      try {
        ipcRenderer.send('app-focus');
        window.focus();
        // Force a click or focus on body to wake up renderer event loop if stuck
        document.body.focus();
      } catch (e) {
        console.error("Focus fix failed", e);
      }
    }
  }, [isLoaded, isDbConfigured]);

  const handleDbConfigured = () => {
    setIsDbConfigured(true);
    // Il caricamento dati partirà tramite useEffect esistente
  };

  const handleDbSkip = () => {
    setIsDbSkipped(true);
    // Permette di procedere senza DB. isDbConfigured rimane false.
  };

  const handleNewDbSelection = async () => {
    try {
      const path = await ipcRenderer.invoke('select-directory');
      // Force focus back to window after native dialog closes
      window.focus();

      if (path) {
        // 1. Release Lock on OLD path if we have it
        if (isLocked) {
          await releaseLockAsync();
        }

        // 2. Set NEW path
        const { setDbPath } = await import('./services/storageService');
        await setDbPath(path);

        // 3. Reset Data State
        setLoadError(false);
        setClients([]);
        setMovements([]);
        setIsLoaded(false);

        // 4. Reset Lock State (triggers re-acquisition on new path via useEffect)
        setIsLocked(false);
        setLockConflict(null);

        // 5. Trigger Reload of Data
        setDbPathVersion(v => v + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLockSuccess = () => {
    setIsLocked(true);
    setLockConflict(null);
  }

  // --- Handlers CRUD (Passati alla UI) ---
  const addClient = (client: Omit<Client, 'id'>) => {
    if (!isDbConfigured) return;
    setClients([...clients, { ...client, id: generateId() }]);
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    if (!isDbConfigured) return;
    setClients(clients.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const deleteClient = (id: string) => {
    if (!isDbConfigured) return;
    const pending = movements.filter(m => m.clientId === id).length;
    if (pending > 0) {
      // Alert gestito dalla UI generalmente, ma qui blocchiamo se necessario.
      // Per ora, eliminiamo. La UI di solito conferma.
    }
    setClients(clients.filter(c => c.id !== id));
  };

  const addMovement = (movement: Omit<Movement, 'id'>) => {
    if (!isDbConfigured) return;
    setMovements([...movements, { ...movement, id: generateId() }]);
  };

  const updateMovement = (id: string, updated: Partial<Movement>) => {
    if (!isDbConfigured) return;
    setMovements(movements.map(m => m.id === id ? { ...m, ...updated } : m));
  };

  const deleteMovement = (id: string) => {
    if (!isDbConfigured) return;
    setMovements(movements.filter(m => m.id !== id));
  };

  const handleImport = (data: Partial<AppData>) => {
    if (data.clients) setClients(data.clients);
    if (data.movements) setMovements(data.movements);
    // Auto-salvataggio via useEffect
  };

  // Logout fluido
  const handleLogout = async () => {
    // Release lock
    if (isLocked) {
      await releaseLockAsync();
      setIsLocked(false);
    }
    // Reset Operator Name -> This triggers OperatorModal instantly
    setOperatorName('');
  };


  // Determina cosa renderizzare

  // 1. Setup DB (Modale) - Mostra se NON configurato E NON saltato
  if (!isDbConfigured && !isDbSkipped) {
    return <DatabaseSetupModal onConfigured={handleDbConfigured} onSkip={handleDbSkip} />;
  }

  // 2. Setup Operatore
  if (!operatorName) {
    // Nota: usando React, quando name viene settato 'App' re-renderizza e mostra Layout.
    // Transizione fluida gestita da React/CSS animate-in del modal.
    return <OperatorModal onSubmit={setOperatorName} />;
  }

  // 0. Overlay Caricamento (Moved after Setup)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 animate-in fade-in duration-300">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-slate-700">Caricamento in corso...</h2>
        <p className="text-slate-500">Accesso al database aziendale</p>
      </div>
    );
  }

  // 0.5. Schermata Errore Caricamento / Recupero
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Database className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Database non trovato</h2>
          <p className="text-slate-600 mb-8">
            Impossibile trovare i file di archivio nel percorso specificato.
            <br /><span className="text-sm opacity-75">Potrebbero essere stati spostati o non ancora creati.</span>
          </p>

          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Cosa vuoi fare?</p>

            <button
              onClick={handleNewDbSelection}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
            >
              <Database className="w-5 h-5" />
              Seleziona / Crea Nuovo Database
            </button>
            <p className="text-xs text-slate-400 px-4">
              Seleziona una cartella vuota per creare un nuovo archivio, oppure una cartella esistente per collegarti.
            </p>

            <div className="h-4"></div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Riprova Connessione
            </button>
          </div>
        </div>
      </div>
    );
  }


  // 3. Controllo Lock (Bloccante)
  if (lockConflict) {
    return <LockScreen
      currentLockInfo={lockConflict}
      operatorName={operatorName}
      onSuccess={handleLockSuccess}
    />;
  }

  return (
    <div className="relative h-screen flex flex-col">
      {/* Banner Avviso Globale per DB Saltato */}
      {!isDbConfigured && isDbSkipped && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-between z-50 animate-slideIn">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-200 rounded-lg text-amber-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Nessun Database Configurato</p>
              <p className="text-xs text-amber-600">I dati non verranno salvati in modo permanente.</p>
            </div>
          </div>
          <button
            onClick={handleNewDbSelection}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            Configura Ora
          </button>
        </div>
      )}

      <HashRouter>
        <Layout operatorName={operatorName} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard clients={clients} movements={movements} operatorName={operatorName} />} />
            <Route path="/daily" element={
              <DailyMovements
                clients={clients}
                onAddMovement={addMovement}
              />
            } />
            <Route path="/clients" element={
              <Clients
                clients={clients}
                movements={movements}
                onAddClient={addClient}
                onUpdateClient={updateClient}
                onDeleteClient={deleteClient}
              />
            } />
            <Route path="/client-movements" element={
              <ClientSelection
                clients={clients}
                movements={movements}
              />
            } />
            <Route path="/debtors" element={
              <DebtorClients
                clients={clients}
                movements={movements}
              />
            } />
            <Route path="/clients/:id" element={
              <ClientDetails
                clients={clients}
                movements={movements}
                onAddMovement={addMovement}
                onUpdateMovement={updateMovement}
                onDeleteMovement={deleteMovement}
              />
            } />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<Settings onImport={handleImport} />} />
          </Routes>
        </Layout>
      </HashRouter>
    </div>
  );
}

export default App;