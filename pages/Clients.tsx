import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, ChevronRight, User, Hash, Building2, ArrowRightLeft, MousePointerClick, ChevronDown, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { Client, Movement } from '../types';

interface ClientsProps {
  clients: Client[];
  movements: Movement[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onDeleteClient: (id: string) => void;
  onUpdateClient: (id: string, data: Partial<Client>) => void;
}

export const Clients: React.FC<ClientsProps> = ({ clients, movements, onAddClient, onDeleteClient, onUpdateClient }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // State per Modale Creazione/Modifica
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // State per Modale Cancellazione
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // State per Conflitti (Duplicati)
  const [conflictState, setConflictState] = useState<{ type: 'BLOCK' | 'WARN', message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    vatNumber: '',
    address: '',
    contact: '',
    email: '',
  });

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({ code: '', name: '', vatNumber: '', address: '', contact: '', email: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      code: client.code || '',
      name: client.name,
      vatNumber: client.vatNumber,
      address: client.address,
      contact: client.contact,
      email: client.email,
    });
    setIsModalOpen(true);
  };

  // Funzione che esegue effettivamente il salvataggio
  const proceedWithSave = () => {
    if (editingClient) {
      onUpdateClient(editingClient.id, formData);
    } else {
      onAddClient(formData);
    }
    setIsModalOpen(false);
    setConflictState(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCode = formData.code.trim().toLowerCase();
    const normalizedName = formData.name.trim().toLowerCase();

    // Escludiamo il cliente che stiamo modificando (se esiste) dalla ricerca dei duplicati
    const otherClients = clients.filter(c => !editingClient || c.id !== editingClient.id);

    // 1. Controllo Codice Duplicato (Se il codice è stato inserito)
    if (normalizedCode) {
      const codeMatch = otherClients.find(c => (c.code || '').trim().toLowerCase() === normalizedCode);
      if (codeMatch) {
        setConflictState({
          type: 'BLOCK',
          message: `Esiste già un cliente con il codice "${formData.code}" (${codeMatch.name}). Impossibile proseguire.`
        });
        return;
      }
    }

    // 2. Controllo Nome Duplicato
    const nameMatch = otherClients.find(c => c.name.trim().toLowerCase() === normalizedName);

    if (nameMatch) {
      const matchCode = (nameMatch.code || '').trim().toLowerCase();

      // Se il nome è uguale E (il codice è uguale OPPURE entrambi non hanno codice)
      // -> BLOCCO (è lo stesso cliente)
      if (normalizedCode === matchCode) {
        setConflictState({
          type: 'BLOCK',
          message: `Esiste già un cliente nominato "${formData.name}" con lo stesso codice. Impossibile creare un duplicato.`
        });
        return;
      }
      // Se il nome è uguale MA il codice è diverso
      // -> AVVISO (Omonimia o filiale diversa)
      else {
        setConflictState({
          type: 'WARN',
          message: `Esiste già un cliente con il nome "${formData.name}" ma con codice diverso ("${nameMatch.code || 'Nessun Codice'}").`
        });
        return;
      }
    }

    // Se nessun controllo scatta, salva direttamente
    proceedWithSave();
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      onDeleteClient(clientToDelete.id);
      setClientToDelete(null);
    }
  };

  const handleQuickSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    if (clientId) {
      navigate(`/clients/${clientId}`);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vatNumber.includes(searchTerm) ||
    (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedClientsForDropdown = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  const getClientBalance = (clientId: string) => {
    let balance = 0;
    movements.forEach(m => {
      if (m.clientId === clientId) {
        // Logica Saldo Clienti:
        // POSITIVO = (Spedizioni + Misto + Reso)
        // NEGATIVO = (Buono)
        const gave = (m.palletsShipping || 0) + (m.palletsExchange || 0) + (m.palletsReturned || 0);
        const received = (m.palletsGood || 0);
        balance += (gave - received);
      }
    });
    return balance;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Cerca */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca nella lista..."
              className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm focus:shadow-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Menu a tendina Selezione Rapida */}
          <div className="relative w-full sm:w-80">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <MousePointerClick className="w-5 h-5 text-blue-500" />
            </div>
            <select
              onChange={handleQuickSelect}
              defaultValue=""
              className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:border-blue-400 transition-all shadow-sm appearance-none font-medium"
            >
              <option value="" disabled>Vai al cliente...</option>
              {sortedClientsForDropdown.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full xl:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-medium active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Nuovo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-40">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" />
                    <span>Cod. Cliente</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>Cliente</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                    <span>Saldo Pallet</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <User className="w-12 h-12 text-slate-200" />
                      <p>Nessun cliente trovato.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const balance = getClientBalance(client.id);
                  return (
                    <tr key={client.id} className="hover:bg-blue-50/50 group transition-colors duration-200">
                      {/* Colonna Cod. Cliente */}
                      <td className="px-6 py-4 align-top">
                        <span className="font-mono font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-sm">
                          {client.code || '-'}
                        </span>
                      </td>

                      {/* Colonna Cliente */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <span className="font-bold text-lg">{client.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-base">{client.name}</p>
                            <div className="text-sm text-slate-500 space-y-0.5 mt-1">
                              <p className="flex items-center gap-1"><span className="text-xs uppercase font-semibold text-slate-400">P.IVA</span> {client.vatNumber}</p>
                              {client.address && <p className="text-slate-400 text-xs">{client.address}</p>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Colonna Saldo Pallet */}
                      <td className="px-6 py-4 text-center align-middle">
                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${balance > 0
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : balance < 0
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                          {balance > 0 ? '+' : ''}{balance}
                        </span>
                      </td>

                      {/* Colonna Azioni */}
                      <td className="px-6 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/clients/${client.id}`}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm rounded-lg transition-all"
                            title="Vedi Movimenti"
                          >
                            <Search className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm rounded-lg transition-all"
                            title="Modifica"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setClientToDelete(client)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm rounded-lg transition-all"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Creazione / Modifica */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 relative">

            {/* Overlay Conflitto (Blocco o Avviso) */}
            {conflictState && (
              <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex items-center justify-center p-8 text-center">
                <div className="max-w-xs w-full">
                  {conflictState.type === 'BLOCK' ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Cliente Duplicato</h4>
                      <p className="text-slate-600 mb-6 font-medium">{conflictState.message}</p>
                      <button
                        onClick={() => setConflictState(null)}
                        className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold w-full"
                      >
                        Chiudi e Modifica
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Possibile Omonimia</h4>
                      <p className="text-slate-600 mb-6 font-medium">{conflictState.message}</p>
                      <p className="text-slate-500 text-sm mb-6">Vuoi creare comunque questo cliente?</p>
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => setConflictState(null)}
                          className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={proceedWithSave}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                        >
                          Crea Nuovo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800">
                {editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <div className="bg-white p-2 rounded-full hover:bg-slate-200">&times;</div>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Codice Cliente</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                    value={formData.code}
                    placeholder="Es. C001"
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Ragione Sociale *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all shadow-sm font-medium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">P.IVA / C.F.</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Referente</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Indirizzo Sede</label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="pt-6 flex justify-end gap-4 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Salva Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Conferma Eliminazione */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sei sicuro?</h3>
              <p className="text-slate-500 mb-6">
                Stai per eliminare il cliente <span className="font-semibold text-slate-800">{clientToDelete.name}</span>.<br />
                Tutti i movimenti associati verranno <span className="font-bold text-red-600">persi definitivamente</span>.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setClientToDelete(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Elimina Cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};