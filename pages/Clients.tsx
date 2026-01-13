import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, XCircle, AlertTriangle, CheckCircle2, Edit } from 'lucide-react';
import { Client, Movement } from '../types';

interface ClientsProps {
  clients: Client[];
  movements: Movement[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onDeleteClient: (id: string) => void;
  onUpdateClient: (id: string, data: Partial<Client>) => void;
}

type ViewMode = 'INITIAL' | 'CREATE' | 'DELETE' | 'EDIT_SEARCH' | 'EDIT_FORM';

export const Clients: React.FC<ClientsProps> = ({ clients, movements, onAddClient, onDeleteClient, onUpdateClient }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('INITIAL');
  const [searchTerm, setSearchTerm] = useState('');

  // State per Eliminazione
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // State per Modifica
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // State per Creazione (Form)
  const [conflictState, setConflictState] = useState<{ type: 'BLOCK' | 'WARN', message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    vatNumber: '',
    address: '',
    contact: '',
    email: '',
  });

  const resetForm = () => {
    setFormData({ code: '', name: '', vatNumber: '', address: '', contact: '', email: '' });
    setConflictState(null);
  };

  const handleModeSwitch = (mode: ViewMode) => {
    if (mode === 'CREATE') {
      resetForm();
      setSuccessMessage(null);
    }
    if (mode === 'DELETE' || mode === 'EDIT_SEARCH') setSearchTerm('');
    setViewMode(mode);
  };

  const startEdit = (client: Client) => {
    setClientToEdit(client);
    setFormData({
      code: client.code || '',
      name: client.name,
      vatNumber: client.vatNumber,
      address: client.address,
      contact: client.contact || '',
      email: client.email || '',
    });
    setSuccessMessage(null);
    setConflictState(null);
    setViewMode('EDIT_FORM');
  };

  // --- LOGICA CREAZIONE ---
  const proceedWithSave = () => {
    onAddClient(formData);
    resetForm();
    setSuccessMessage("Cliente creato con successo! Puoi inserirne un altro.");
    // Auto-hide success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null); // Clear previous success

    const normalizedCode = formData.code.trim().toLowerCase();
    const normalizedName = formData.name.trim().toLowerCase();

    // Validazione Duplicati
    // Escludiamo controlli complessi se non ci sono altri clienti, ma in generale controlliamo tutto

    // 1. Controllo Codice
    if (normalizedCode) {
      const codeMatch = clients.find(c => (c.code || '').trim().toLowerCase() === normalizedCode);
      if (codeMatch) {
        setConflictState({
          type: 'BLOCK',
          message: `Esiste già un cliente con il codice "${formData.code}" (${codeMatch.name}). Impossibile proseguire.`
        });
        return;
      }
    }

    // 2. Controllo Nome
    const nameMatch = clients.find(c => c.name.trim().toLowerCase() === normalizedName);
    if (nameMatch) {
      const matchCode = (nameMatch.code || '').trim().toLowerCase();
      // Se nome uguale E (codice uguale O entrambi senza codice) -> BLOCCO
      if (normalizedCode === matchCode) {
        setConflictState({
          type: 'BLOCK',
          message: `Esiste già un cliente nominato "${formData.name}" con lo stesso codice. Impossibile creare un duplicato.`
        });
        return;
      } else {
        // Nome uguale MA codice diverso -> WARN
        setConflictState({
          type: 'WARN',
          message: `Esiste già un cliente con il nome "${formData.name}" ma con codice diverso ("${nameMatch.code || 'Nessun Codice'}").`
        });
        return;
      }
    }
    proceedWithSave();
  };

  // --- LOGICA MODIFICA ---
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToEdit) return;

    setSuccessMessage(null);
    const normalizedCode = formData.code.trim().toLowerCase();
    const normalizedName = formData.name.trim().toLowerCase();

    // 1. Controllo Codice (escludendo se stesso)
    if (normalizedCode) {
      const codeMatch = clients.find(c => c.id !== clientToEdit.id && (c.code || '').trim().toLowerCase() === normalizedCode);
      if (codeMatch) {
        setConflictState({
          type: 'BLOCK',
          message: `Esiste già un altro cliente con il codice "${formData.code}" (${codeMatch.name}).`
        });
        return;
      }
    }

    // 2. Controllo Nome (escludendo se stesso)
    const nameMatch = clients.find(c => c.id !== clientToEdit.id && c.name.trim().toLowerCase() === normalizedName);
    if (nameMatch) {
      // Logica semplificata per modifica: se il nome esiste già altrove, avvisa o blocca
      // Se esiste un altro con lo stesso nome e codice diverso -> WARN
      setConflictState({
        type: 'WARN',
        message: `Attenzione: esiste già un altro cliente chiamato "${formData.name}".`
      });
      // In modifica potremmo voler essere più permissivi o richiedere conferma esplicita nel pulsante
      // Per ora blocchiamo il flusso standard e chiediamo conferma (che richiama proceedWithUpdate)
      return;
    }

    proceedWithUpdate();
  };

  const proceedWithUpdate = () => {
    if (!clientToEdit) return;
    onUpdateClient(clientToEdit.id, formData);
    setSuccessMessage("Cliente aggiornato con successo!");
    // Dopo breve delay torna alla lista o resetta
    setTimeout(() => {
      setSuccessMessage(null);
      setViewMode('EDIT_SEARCH'); // Torna alla lista per modificarne altri
    }, 1500);
  };

  // --- LOGICA ELIMINAZIONE ---
  const confirmDelete = () => {
    if (clientToDelete) {
      onDeleteClient(clientToDelete.id);
      setClientToDelete(null);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vatNumber.includes(searchTerm) ||
    (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getClientBalance = (clientId: string) => {
    let balance = 0;
    movements.forEach(m => {
      if (m.clientId === clientId) {
        const gave = (m.palletsShipping || 0) + (m.palletsExchange || 0) + (m.palletsReturned || 0);
        const received = (m.palletsGood || 0);
        balance += (gave - received);
      }
    });
    return balance;
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* HEADER PULSANTI - VISIBILE SEMPRE */}
      {/* Interpretazione: I pulsanti fungono da menu principale della pagina. */}

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch min-h-[150px] mt-6">
        {/* Pulsante NUOVO CLIENTE */}
        <button
          onClick={() => handleModeSwitch('CREATE')}
          className={`relative overflow-hidden flex-1 basis-0 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-xl group hover:-translate-y-1
            ${viewMode === 'CREATE'
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 text-white scale-105 shadow-emerald-200'
              : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200'
            }`}
        >
          {/* Background Decor */}
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 ease-out group-hover:scale-110
            ${viewMode === 'CREATE' ? 'opacity-20' : 'opacity-[0.03]'}`}
          />

          <div className={`relative z-10 p-4 rounded-full transition-all duration-300 transform group-hover:rotate-6 shadow-md
            ${viewMode === 'CREATE' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'}`}>
            <Plus className="w-8 h-8" />
          </div>
          <div className="relative z-10 text-center">
            <span className="block text-xl font-bold tracking-tight">Nuovo Cliente</span>
            <span className={`block text-xs mt-1 font-medium ${viewMode === 'CREATE' ? 'text-emerald-100' : 'text-slate-400'}`}>Aggiungi una nuova anagrafica</span>
          </div>
        </button>

        {/* Pulsante MODIFICA CLIENTE */}
        <button
          onClick={() => handleModeSwitch('EDIT_SEARCH')}
          className={`relative overflow-hidden flex-1 basis-0 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-xl group hover:-translate-y-1
            ${(viewMode === 'EDIT_SEARCH' || viewMode === 'EDIT_FORM')
              ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-400 text-white scale-105 shadow-amber-200'
              : 'bg-white border-slate-100 text-slate-600 hover:border-amber-200'
            }`}
        >
          {/* Background Decor */}
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-500 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 ease-out group-hover:scale-110
            ${(viewMode === 'EDIT_SEARCH' || viewMode === 'EDIT_FORM') ? 'opacity-20' : 'opacity-[0.03]'}`}
          />

          <div className={`relative z-10 p-4 rounded-full transition-all duration-300 transform group-hover:rotate-6 shadow-md
            ${(viewMode === 'EDIT_SEARCH' || viewMode === 'EDIT_FORM') ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600 group-hover:bg-amber-200'}`}>
            <Edit className="w-8 h-8" />
          </div>
          <div className="relative z-10 text-center">
            <span className="block text-xl font-bold tracking-tight">Modifica Cliente</span>
            <span className={`block text-xs mt-1 font-medium ${(viewMode === 'EDIT_SEARCH' || viewMode === 'EDIT_FORM') ? 'text-amber-100' : 'text-slate-400'}`}>Premi il pulsante per aggiornare i dati cliente</span>
          </div>
        </button>

        {/* Pulsante ELIMINA CLIENTE */}
        <button
          onClick={() => handleModeSwitch('DELETE')}
          className={`relative overflow-hidden flex-1 basis-0 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-xl group hover:-translate-y-1
            ${(viewMode === 'DELETE_SEARCH' || viewMode === 'DELETE_CONFIRM')
              ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-500 text-white scale-105 shadow-red-200'
              : 'bg-white border-slate-100 text-slate-600 hover:border-red-200'
            }`}
        >
          {/* Background Decor */}
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500 to-rose-600 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 ease-out group-hover:scale-110
            ${(viewMode === 'DELETE_SEARCH' || viewMode === 'DELETE_CONFIRM') ? 'opacity-20' : 'opacity-[0.03]'}`}
          />

          <div className={`relative z-10 p-4 rounded-full transition-all duration-300 transform group-hover:rotate-6 shadow-md
            ${(viewMode === 'DELETE_SEARCH' || viewMode === 'DELETE_CONFIRM') ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 group-hover:bg-red-200'}`}>
            <Trash2 className="w-8 h-8" />
          </div>

          <div className="relative z-10 text-center">
            <span className="block text-xl font-bold tracking-tight">Elimina Cliente</span>
            <span className={`block text-xs mt-1 font-medium ${(viewMode === 'DELETE_SEARCH' || viewMode === 'DELETE_CONFIRM') ? 'text-red-100' : 'text-slate-400'}`}>Premi per cancellare un cliente</span>
          </div>
        </button>
      </div>

      {/* CONTENUTO IN BASE ALLA MODALITÀ */}
      <div className="transition-all duration-500 ease-in-out">

        {/* MODALITÀ: INITIAL */}
        {viewMode === 'INITIAL' && (
          <div className="text-center py-12 text-slate-400">
            <p>Seleziona un'operazione per iniziare.</p>
          </div>
        )}

        {/* MODALITÀ: CREATE */}
        {viewMode === 'CREATE' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-4xl mx-auto animate-slideIn">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Plus className="w-6 h-6" /></div>
                Inserimento Nuovo Cliente
              </h2>
              <button onClick={() => setViewMode('INITIAL')} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-3 animate-fadeIn">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <p className="font-semibold">{successMessage}</p>
              </div>
            )}

            {/* Conflict Alert in-page */}
            {conflictState && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-4 ${conflictState.type === 'BLOCK' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                {conflictState.type === 'BLOCK' ? <XCircle className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">{conflictState.type === 'BLOCK' ? 'Errore Duplicato' : 'Attenzione: Omonimia'}</h4>
                  <p className="mb-4">{conflictState.message}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setConflictState(null)} className="px-4 py-2 bg-white/50 hover:bg-white/80 rounded-lg font-semibold border border-black/5">
                      {conflictState.type === 'BLOCK' ? 'Chiudi e Correggi' : 'Indietro'}
                    </button>
                    {conflictState.type === 'WARN' && (
                      <button onClick={viewMode === 'EDIT_FORM' ? proceedWithUpdate : proceedWithSave} className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-semibold shadow-sm">
                        Conferma {viewMode === 'EDIT_FORM' ? 'Modifica' : 'Inserimento'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Codice Cliente</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono"
                    value={formData.code}
                    placeholder="Automatico se vuoto"
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Ragione Sociale *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-bold text-lg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome Azienda / Cliente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">P.IVA / C.F.</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Referente</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Indirizzo Sede</label>
                  <textarea
                    rows={1}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Salva Nuovo Cliente
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODALITÀ: DELETE */}
        {viewMode === 'DELETE' && (
          <div className="space-y-4 animate-slideIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <div className="bg-red-100 p-2 rounded-lg text-red-600"><Trash2 className="w-6 h-6" /></div>
                Elimina Cliente
              </h2>
              <button onClick={() => setViewMode('INITIAL')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca cliente da eliminare..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-sm text-slate-500 font-medium px-2">
                {filteredClients.length} Clienti Trovati
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-red-50/50 border-b border-red-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-red-800 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-red-800 uppercase tracking-wider text-center">Saldo</th>
                    <th className="px-6 py-4 text-xs font-bold text-red-800 uppercase tracking-wider text-right">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        Nessun cliente corrisponde alla ricerca.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map(client => {
                      const balance = getClientBalance(client.id);
                      return (
                        <tr key={client.id} className="hover:bg-red-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-slate-900 text-lg">{client.code}</span>
                              <span className="font-bold text-slate-800 text-lg">{client.name}</span>
                            </div>
                            <div className="text-sm text-slate-600 mb-0.5">{client.address || 'Indirizzo non specificato'}</div>
                            <div className="text-xs text-slate-400 font-mono">P.IVA: {client.vatNumber || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${balance > 0 ? 'bg-green-100 text-green-700' : balance < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                              {balance}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setClientToDelete(client)}
                              className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-md font-medium text-sm flex items-center gap-2 ml-auto"
                            >
                              <XCircle className="w-4 h-4" /> Elimina
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODALITÀ: EDIT_FORM (Form Modifica - Simile a Create) */}
        {viewMode === 'EDIT_FORM' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-4xl mx-auto animate-slideIn">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Edit className="w-6 h-6" /></div>
                Modifica Cliente
              </h2>
              <button onClick={() => setViewMode('EDIT_SEARCH')} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-3 animate-fadeIn">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <p className="font-semibold">{successMessage}</p>
              </div>
            )}

            {conflictState && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-4 ${conflictState.type === 'BLOCK' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                {conflictState.type === 'BLOCK' ? <XCircle className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">{conflictState.type === 'BLOCK' ? 'Errore Duplicato' : 'Attenzione'}</h4>
                  <p className="mb-4">{conflictState.message}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setConflictState(null)} className="px-4 py-2 bg-white/50 hover:bg-white/80 rounded-lg font-semibold border border-black/5">
                      {conflictState.type === 'BLOCK' ? 'Chiudi e Correggi' : 'Indietro'}
                    </button>
                    {conflictState.type === 'WARN' && (
                      <button onClick={proceedWithUpdate} className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-semibold shadow-sm">
                        Conferma Modifica
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Codice Cliente</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                    value={formData.code}
                    placeholder="Automatico se vuoto"
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Ragione Sociale *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-bold text-lg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome Azienda / Cliente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">P.IVA / C.F.</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Referente</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Indirizzo Sede</label>
                  <textarea
                    rows={1}
                    className="w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                >
                  <Edit className="w-5 h-5" />
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODALITÀ: EDIT_SEARCH (Lista Clienti per selezione modifica) */}
        {viewMode === 'EDIT_SEARCH' && (
          <div className="space-y-4 animate-slideIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Edit className="w-6 h-6" /></div>
                Seleziona Cliente da Modificare
              </h2>
              <button onClick={() => setViewMode('INITIAL')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca cliente da modificare..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="text-sm text-slate-500 font-medium px-2">
                {filteredClients.length} Clienti Trovati
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-indigo-50/50 border-b border-indigo-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-indigo-800 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-indigo-800 uppercase tracking-wider text-center">Saldo</th>
                    <th className="px-6 py-4 text-xs font-bold text-indigo-800 uppercase tracking-wider text-right">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        Nessun cliente corrisponde alla ricerca.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map(client => {
                      const balance = getClientBalance(client.id);
                      return (
                        <tr key={client.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-slate-900 text-lg">{client.code}</span>
                              <span className="font-bold text-slate-800 text-lg">{client.name}</span>
                            </div>
                            <div className="text-sm text-slate-600 mb-0.5">{client.address || 'Indirizzo non specificato'}</div>
                            <div className="text-xs text-slate-400 font-mono">P.IVA: {client.vatNumber || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${balance > 0 ? 'bg-green-100 text-green-700' : balance < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                              {balance}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => startEdit(client)}
                              className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-md font-medium text-sm flex items-center gap-2 ml-auto"
                            >
                              <Edit className="w-4 h-4" /> Modifica
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* DIALOG CONFERMA ELIMINAZIONE (Globale) */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center transform transition-all scale-100">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Confermi l'eliminazione?</h3>
            <p className="text-slate-600 mb-8">
              Stai per cancellare definitivamente <span className="font-bold text-slate-900">{clientToDelete.name}</span>.
              <br /><br />
              <span className="text-sm bg-red-50 text-red-800 px-2 py-1 rounded border border-red-100">
                Questa azione non può essere annullata.
              </span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Elimina per sempre
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};