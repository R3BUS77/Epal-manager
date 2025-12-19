import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetails } from './pages/ClientDetails';
import { DailyMovements } from './pages/DailyMovements';
import { Settings } from './pages/Settings';
import { CalendarPage } from './pages/CalendarPage';
import { Client, Movement, AppData } from './types';
import { getClients, getMovements, saveClients, saveMovements } from './services/storageService';
import { OperatorModal } from './components/OperatorModal';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [operatorName, setOperatorName] = useState<string>('');

  // Load initial data
  useEffect(() => {
    setClients(getClients());
    setMovements(getMovements());
    setIsLoaded(true);
  }, []);

  // Save changes
  useEffect(() => {
    if (isLoaded) {
      saveClients(clients);
    }
  }, [clients, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveMovements(movements);
    }
  }, [movements, isLoaded]);

  // Handlers
  const addClient = (data: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...data
    };
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (id: string, data: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    // Also remove associated movements to keep DB clean
    setMovements(prev => prev.filter(m => m.clientId !== id));
  };

  const addMovement = (data: Omit<Movement, 'id'>) => {
    const newMovement: Movement = {
      id: generateId(),
      operator: operatorName, // Auto-tag with current operator
      ...data
    };
    setMovements(prev => [...prev, newMovement]);
  };

  const updateMovement = (id: string, data: Partial<Movement>) => {
    setMovements(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const deleteMovement = (id: string) => {
    setMovements(prev => prev.filter(m => m.id !== id));
  };

  const handleImport = (data: AppData) => {
    setClients(data.clients);
    setMovements(data.movements);
  };

  return (
    <HashRouter>
      {!operatorName && <OperatorModal onSubmit={setOperatorName} />}

      <Layout operatorName={operatorName}>
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
  );
}

export default App;