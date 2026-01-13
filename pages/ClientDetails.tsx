import React, { useState, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit2, Plus, Filter, PackageCheck, Truck, ArrowRightLeft, RotateCcw, StickyNote, X, AlertTriangle, List, BarChart3, XCircle, Trash2 } from 'lucide-react';
import { Client, Movement } from '../types';

interface ClientDetailsProps {
  clients: Client[];
  movements: Movement[];
  onAddMovement: (m: Omit<Movement, 'id'>) => void;
  onUpdateMovement: (id: string, m: Partial<Movement>) => void;
  onDeleteMovement: (id: string) => void;
}

export const ClientDetails: React.FC<ClientDetailsProps> = ({ clients, movements, onAddMovement, onUpdateMovement, onDeleteMovement }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const backPath = (location.state as any)?.from || '/client-movements'; // Default per fallback

  const client = clients.find(c => c.id === id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  // State per il popup nota
  const [noteToView, setNoteToView] = useState<string | null>(null);

  // State per conferma cancellazione
  const [movementToDelete, setMovementToDelete] = useState<Movement | null>(null);

  // View Mode: 'LIST' or 'MONTHLY'
  const [viewMode, setViewMode] = useState<'LIST' | 'MONTHLY'>('LIST');

  // Form State
  const [formData, setFormData] = useState({
    palletsGood: 0,
    palletsShipping: 0,
    palletsExchange: 0,
    palletsReturned: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Date Filter State
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    // Format manually to avoid timezone shifts (toISOString uses UTC)
    const year = firstDay.getFullYear();
    const month = String(firstDay.getMonth() + 1).padStart(2, '0');
    const day = String(firstDay.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    const year = lastDay.getFullYear();
    const month = String(lastDay.getMonth() + 1).padStart(2, '0');
    const day = String(lastDay.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Calculate stats based on ALL movements (Global Balance)
  const clientAllMovements = useMemo(() => {
    return movements
      .filter(m => m.clientId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, id]);

  const existingStats = useMemo(() => {
    let totShipping = 0;
    let totExchange = 0;
    let totGood = 0;
    let totReturned = 0;

    clientAllMovements.forEach(m => {
      totShipping += (m.palletsShipping || 0);
      totExchange += (m.palletsExchange || 0);
      totGood += (m.palletsGood || 0);
      totReturned += (m.palletsReturned || 0);
    });

    const gave = totShipping + totExchange + totReturned;
    const received = totGood;
    const balance = gave - received;

    return { totShipping, totExchange, totGood, totReturned, balance };
  }, [clientAllMovements]);

  // Filter movements for Table List
  const filteredMovements = useMemo(() => {
    return clientAllMovements.filter(m => {
      if (!startDate && !endDate) return true;
      const mDate = m.date;
      return (!startDate || mDate >= startDate) && (!endDate || mDate <= endDate);
    });
  }, [clientAllMovements, startDate, endDate]);

  // Calculate stats based on FILTERED movements (Period Stats)
  const periodStats = useMemo(() => {
    let totShipping = 0;
    let totExchange = 0;
    let totGood = 0;
    let totReturned = 0;

    filteredMovements.forEach(m => {
      totShipping += (m.palletsShipping || 0);
      totExchange += (m.palletsExchange || 0);
      totGood += (m.palletsGood || 0);
      totReturned += (m.palletsReturned || 0);
    });

    const gave = totShipping + totExchange + totReturned;
    const received = totGood;
    const balance = gave - received;

    return { totShipping, totExchange, totGood, totReturned, balance };
  }, [filteredMovements]);


  // Calculate Monthly Stats
  const monthlyStats = useMemo(() => {
    const stats: Record<string, {
      monthLabel: string;
      rawDate: string; // for sorting
      good: number;
      shipping: number;
      exchange: number;
      returned: number;
      balance: number;
      count: number;
    }> = {};

    filteredMovements.forEach(m => {
      const d = new Date(m.date);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-11
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!stats[key]) {
        const dateObj = new Date(year, month, 1);
        const monthName = dateObj.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        stats[key] = {
          monthLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          rawDate: key,
          good: 0,
          shipping: 0,
          exchange: 0,
          returned: 0,
          balance: 0,
          count: 0
        };
      }

      stats[key].good += (m.palletsGood || 0);
      stats[key].shipping += (m.palletsShipping || 0);
      stats[key].exchange += (m.palletsExchange || 0);
      stats[key].returned += (m.palletsReturned || 0);
      stats[key].count += 1;
    });

    // Calculate balance per month
    return Object.values(stats).map(s => {
      const gave = s.shipping + s.exchange + s.returned;
      const received = s.good;
      s.balance = gave - received;
      return s;
    }).sort((a, b) => b.rawDate.localeCompare(a.rawDate)); // Descending by date
  }, [filteredMovements]);


  if (!client) {
    return <div className="p-8 text-center">Cliente non trovato. <Link to="/clients" className="text-blue-600 hover:underline">Torna alla lista</Link></div>;
  }

  const handleOpenAdd = () => {
    setEditingMovement(null);
    setFormData({
      palletsGood: 0,
      palletsShipping: 0,
      palletsExchange: 0,
      palletsReturned: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Movement) => {
    setEditingMovement(m);
    setFormData({
      palletsGood: m.palletsGood || 0,
      palletsShipping: m.palletsShipping || 0,
      palletsExchange: m.palletsExchange || 0,
      palletsReturned: m.palletsReturned || 0,
      date: m.date,
      notes: m.notes
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMovement) {
      onUpdateMovement(editingMovement.id, { ...formData });
    } else {
      onAddMovement({
        clientId: client.id,
        ...formData
      });
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (movementToDelete) {
      onDeleteMovement(movementToDelete.id);
      setMovementToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to={backPath} className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl text-slate-800 flex items-center gap-3">
            {client.code && (
              <span className="font-normal opacity-70">
                {client.code}
              </span>
            )}
            <span className="font-bold">{client.name}</span>
          </h1>
          <div className="text-slate-500 mt-1 space-y-0.5">
            <p className="flex items-center gap-2 text-sm md:text-base">
              {client.address}
            </p>
            <p className="text-sm">
              <span className="font-medium">P.Iva</span> {client.vatNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Mini-bar (PERIOD + GLOBAL) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Period Counters */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><PackageCheck className="w-3 h-3" /> Buono (Periodo)</p>
          <p className="text-xl font-bold text-slate-800">{periodStats.totGood}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Truck className="w-3 h-3" /> Spedizioni (Periodo)</p>
          <p className="text-xl font-bold text-slate-800">{periodStats.totShipping}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Misto (Periodo)</p>
          <p className="text-xl font-bold text-slate-800">{periodStats.totExchange}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl" title="Influisce sul saldo">
          <p className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reso (Periodo)</p>
          <p className="text-xl font-bold text-slate-800">{periodStats.totReturned}</p>
        </div>

        {/* Period Balance */}
        <div className={`border p-4 rounded-xl flex items-center justify-between ${periodStats.balance >= 0 ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
          <div>
            <p className="text-xs uppercase font-bold text-slate-500">Saldo Periodo</p>
            <p className={`text-xl font-bold ${periodStats.balance >= 0 ? 'text-slate-700' : 'text-red-700'}`}>
              {periodStats.balance > 0 ? '+' : ''}{periodStats.balance}
            </p>
          </div>
        </div>

        {/* Global Balance (HIGHLIGHTED) */}
        <div className={`border p-4 rounded-xl flex items-center justify-between shadow-sm ${existingStats.balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <div>
            <p className={`text-xs uppercase font-bold ${existingStats.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Saldo Totale</p>
            <p className={`text-2xl font-bold ${existingStats.balance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              {existingStats.balance > 0 ? '+' : ''}{existingStats.balance}
            </p>
          </div>
          <Filter className={`w-8 h-8 ${existingStats.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header con Filtri e Azioni */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className='flex items-center gap-4'>
            <h3 className="font-semibold text-slate-800 whitespace-nowrap">
              {viewMode === 'LIST' ? 'Storico Movimenti' : 'Andamento Mensile'}
            </h3>
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                title="Vista Elenco"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('MONTHLY')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'MONTHLY' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                title="Vista Mensile"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>


          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Filtro Date */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1 px-2 text-slate-500 text-sm">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Dal</span>
              </div>
              <input
                type="date"
                className="border-none bg-transparent text-sm focus:ring-0 text-slate-700 w-32"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1 px-2 text-slate-500 text-sm">
                <span className="hidden sm:inline">Al</span>
              </div>
              <input
                type="date"
                className="border-none bg-transparent text-sm focus:ring-0 text-slate-700 w-32"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {viewMode === 'LIST' && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Nuovo
              </button>
            )}

          </div>
        </div>

        <div className="overflow-x-auto">
          {viewMode === 'LIST' ? (
            // --- VISTA LISTA (ORIGINALE) ---
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-6 py-3 font-medium text-slate-500 text-sm w-32">Data</th>
                  <th className="px-6 py-3 font-medium text-slate-500 text-sm text-center">Buono</th>
                  <th className="px-6 py-3 font-medium text-slate-500 text-sm text-center">Spedizioni</th>
                  <th className="px-6 py-3 font-medium text-slate-500 text-sm text-center">Misto</th>
                  <th className="px-6 py-3 font-medium text-slate-500 text-sm text-center">Reso</th>
                  <th className="px-6 py-3 font-medium text-slate-500 text-sm">Note</th>
                  <th className="px-6 py-3 font-medium text-slate-500 text-sm text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Nessun movimento trovato nel periodo selezionato.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    // Calcoli per colorazione righe
                    const sumOut = (m.palletsShipping || 0) + (m.palletsExchange || 0) + (m.palletsReturned || 0);
                    const sumIn = (m.palletsGood || 0);
                    const netBalance = sumOut - sumIn;

                    // Verifica se mostrare pulsante popup (Reso > 0 AND Note presenti)
                    const hasReturnWithNotes = (m.palletsReturned || 0) > 0 && m.notes;

                    // Determinazione Classe Riga
                    // NetBalance > 0: Positivo (Verde)
                    // NetBalance < 0: Negativo (Rosso Scuro)
                    // NetBalance = 0: Pari (Grigio)
                    let rowClass = 'transition-colors ';

                    if (netBalance === 0) {
                      rowClass += 'bg-slate-100 hover:bg-slate-200'; // Grigio
                    } else if (netBalance > 0) {
                      rowClass += 'bg-emerald-100 hover:bg-emerald-200'; // Verde
                    } else {
                      rowClass += 'bg-red-100 hover:bg-red-200'; // Rosso Scuro
                    }

                    return (
                      <tr key={m.id} className={rowClass}>
                        <td className="px-6 py-3 text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(m.date).toLocaleDateString('it-IT')}
                          </div>
                        </td>

                        {/* Buono */}
                        <td className="px-6 py-3 text-center font-medium text-slate-700">
                          {m.palletsGood ? <span className="bg-slate-100 px-2 py-1 rounded">{m.palletsGood}</span> : '-'}
                        </td>

                        {/* Spedizioni */}
                        <td className="px-6 py-3 text-center font-medium text-slate-700">
                          {m.palletsShipping ? <span className="bg-slate-100 px-2 py-1 rounded">{m.palletsShipping}</span> : '-'}
                        </td>

                        {/* Misto */}
                        <td className="px-6 py-3 text-center font-medium text-slate-700">
                          {m.palletsExchange ? <span className="bg-slate-100 px-2 py-1 rounded">{m.palletsExchange}</span> : '-'}
                        </td>

                        {/* Reso */}
                        <td className="px-6 py-3 text-center font-medium text-slate-700">
                          {m.palletsReturned ? (
                            <span className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded font-bold shadow-sm border border-yellow-300">
                              {m.palletsReturned}
                            </span>
                          ) : '-'}
                        </td>

                        <td className="px-6 py-3 text-slate-500 text-sm max-w-xs truncate">
                          {hasReturnWithNotes ? (
                            <button
                              onClick={() => setNoteToView(m.notes)}
                              className="flex items-center gap-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-rose-200 shadow-sm animate-pulse hover:animate-none"
                            >
                              <StickyNote className="w-3.5 h-3.5" />
                              LEGGI NOTA
                            </button>
                          ) : (
                            m.notes ? (
                              <span className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded font-medium shadow-sm border border-yellow-300 inline-block max-w-full truncate">
                                {m.notes}
                              </span>
                            ) : '-'
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleOpenEdit(m)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setMovementToDelete(m)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
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
          ) : (
            // --- VISTA MENSILE (NUOVA) ---
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-6 py-4 font-bold text-slate-700 text-sm bg-slate-50 w-48">Mese di Riferimento</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm text-center bg-slate-50">Tot. Buono</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm text-center bg-slate-50">Tot. Spedizioni</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm text-center bg-slate-50">Tot. Misto</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm text-center bg-slate-50">Tot. Reso</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-sm text-center bg-slate-50">Saldo Mese</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Nessun movimento nel periodo selezionato.
                    </td>
                  </tr>
                ) : (
                  monthlyStats.map((stat) => (
                    <tr key={stat.rawDate} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-slate-800 font-semibold capitalize border-r border-slate-100 bg-slate-50/30">
                        {stat.monthLabel}
                        <p className='text-xs text-slate-400 font-normal mt-0.5'>{stat.count} movimenti</p>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600">{stat.good > 0 ? stat.good : '-'}</td>
                      <td className="px-6 py-4 text-center text-slate-600">{stat.shipping > 0 ? stat.shipping : '-'}</td>
                      <td className="px-6 py-4 text-center text-slate-600">{stat.exchange > 0 ? stat.exchange : '-'}</td>
                      <td className="px-6 py-4 text-center text-slate-600">{stat.returned > 0 ? stat.returned : '-'}</td>
                      <td className="px-6 py-4 text-center align-middle">
                        <span className={`inline-flex items-center justify-center min-w-[3rem] px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${stat.balance > 0
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : stat.balance < 0
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                          {stat.balance > 0 ? '+' : ''}{stat.balance}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Movement Modal (Create/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-lg text-slate-800">
                {editingMovement ? 'Modifica Movimento' : 'Nuovo Movimento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <style>{`
              /* Nasconde le freccine input number (Chrome, Safari, Edge, Opera) */
              input::-webkit-outer-spin-button,
              input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              /* Firefox */
              input[type=number] {
                -moz-appearance: textfield;
              }
            `}</style>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">

              <div className="grid grid-cols-2 gap-4">
                {/* 1. Buono */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Buono</label>
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg font-semibold"
                    value={formData.palletsGood}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, palletsGood: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* 2. Spedizioni */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Spedizioni</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg font-semibold"
                    value={formData.palletsShipping}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, palletsShipping: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* 3. Misto */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Misto / Scambio</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg font-semibold"
                    value={formData.palletsExchange}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, palletsExchange: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* 4. Reso */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Reso</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg font-semibold"
                    value={formData.palletsReturned}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, palletsReturned: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-400 mt-1">Influisce sul saldo</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Movimento</label>
                <input
                  required
                  type="date"
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note / Riferimento DDT</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formData.notes}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      // Troviamo il prossimo bottone (Annulla) e facciamo focus
                      const form = e.currentTarget.closest('form');
                      const buttons = form?.querySelectorAll('button');
                      if (buttons && buttons.length > 0) {
                        (buttons[0] as HTMLElement).focus();
                      }
                    }
                  }}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Salva Movimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note View Modal */}
      {noteToView && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-rose-800 flex items-center gap-2">
                <StickyNote className="w-5 h-5" />
                Nota Reso
              </h3>
              <button onClick={() => setNoteToView(null)} className="text-rose-400 hover:text-rose-700 bg-white rounded-full p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8">
              <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                {noteToView}
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setNoteToView(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conferma Eliminazione Movimento */}
      {movementToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Eliminare movimento?</h3>
              <p className="text-slate-500 mb-6">
                Stai per eliminare il movimento del <span className="font-semibold text-slate-800">{new Date(movementToDelete.date).toLocaleDateString('it-IT')}</span>.<br />
                Questa azione non può essere annullata.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setMovementToDelete(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};