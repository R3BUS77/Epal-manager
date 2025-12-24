import React, { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Users, ChevronDown, X } from 'lucide-react';
import { Client, Movement } from '../types';
import { StatCard } from '../components/StatCard';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  clients: Client[];
  movements: Movement[];
}

export const Dashboard: React.FC<DashboardProps> = ({ clients, movements }) => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    let totalShipping = 0; // Spedizioni
    let totalExchange = 0; // Misto/Scambio
    let totalGood = 0;     // Buono
    let totalReturned = 0; // Reso

    // Iteriamo su tutti i movimenti di tutti i clienti
    movements.forEach(m => {
      totalShipping += (m.palletsShipping || 0);
      totalExchange += (m.palletsExchange || 0);
      totalGood += (m.palletsGood || 0);
      totalReturned += (m.palletsReturned || 0);
    });

    // Calcolo Totali
    // Uscite (Sped + Misto + RESO). Il reso conta come restituzione al cliente.
    const totalOut = totalShipping + totalExchange + totalReturned;
    const totalIn = totalGood;                    // Entrate (Solo Buono)

    // 1) BANCALI IN POSITIVO
    // Eccedenza: Abbiamo dato più di quanto ricevuto
    let positive = 0;
    if (totalOut > totalIn) {
      positive = totalOut - totalIn;
    }

    // 2) BANCALI IN NEGATIVO
    // Deficit: Abbiamo ricevuto più di quanto dato (Il Reso riduce questo deficit)
    let negative = 0;
    if (totalOut < totalIn) {
      negative = totalIn - totalOut;
    }

    return {
      positive,
      negative
    };
  }, [movements]);

  const recentMovements = [...movements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente sconosciuto';

  // Ordina clienti per il dropdown
  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    if (clientId) {
      navigate(`/clients/${clientId}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <StatCard
          title="Bancali in Positivo"
          value={stats.positive}
          icon={ArrowUpRight}
          color="green"
          description="Eccedenza: (Sped + Misto + Reso) - Buono"
        />
        <StatCard
          title="Bancali in Negativo"
          value={stats.negative}
          icon={ArrowDownLeft}
          color={stats.negative > 0 ? "red" : "blue"}
          description={stats.negative > 0 ? "Deficit: Buono - (Sped + Misto + Reso)" : "Nessun passivo rilevato"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-full">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2.5 text-lg">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              Ultimi Movimenti
            </h3>
          </div>
          <div className="divide-y divide-slate-50 flex-1">
            {recentMovements.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <p>Nessun movimento recente registrato.</p>
              </div>
            ) : (
              recentMovements.map((move, index) => {
                // Visualizzazione righe
                const isShipping = (move.palletsShipping || 0) > 0 || (move.palletsExchange || 0) > 0 || (move.palletsReturned || 0) > 0;

                // Calcolo Bilancio
                const sumOut = (move.palletsShipping || 0) + (move.palletsExchange || 0) + (move.palletsReturned || 0);
                const sumIn = (move.palletsGood || 0);
                const netBalance = sumOut - sumIn;

                // Definizione Colori (Soffusi)
                let bgClass = '';
                let borderClass = 'border-l-4 border-transparent';

                if (netBalance === 0) {
                  bgClass = 'hover:bg-slate-50';
                  borderClass = 'border-l-4 border-slate-300';
                } else if (netBalance > 0) {
                  bgClass = 'hover:bg-emerald-50/50';
                  borderClass = 'border-l-4 border-emerald-400';
                } else {
                  bgClass = 'hover:bg-red-50/50';
                  borderClass = 'border-l-4 border-red-400';
                }

                return (
                  <div
                    key={move.id}
                    className={`px-8 py-5 flex items-center justify-between transition-all duration-200 group cursor-default ${bgClass} ${borderClass}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm text-white font-bold text-sm ${isShipping ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                        {getClientName(move.clientId).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{getClientName(move.clientId)}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{new Date(move.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-medium space-y-1">
                      {move.palletsShipping > 0 && <span className="block text-slate-600">Sped: <span className="text-slate-900 font-bold">{move.palletsShipping}</span> </span>}
                      {move.palletsExchange > 0 && <span className="block text-slate-600">Misto: <span className="text-slate-900 font-bold">{move.palletsExchange}</span> </span>}
                      {move.palletsGood > 0 && <span className="block text-slate-600">Buono: <span className="text-slate-900 font-bold">{move.palletsGood}</span> </span>}
                      {move.palletsReturned > 0 && <span className="block text-slate-600">Reso: <span className="text-slate-900 font-bold">{move.palletsReturned}</span></span>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Client Selector (Bento Style) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl shadow-slate-900/20 text-white p-8 flex flex-col justify-start relative overflow-hidden group">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10">
            <Users className="w-64 h-64" />
          </div>

          <div className="relative z-10 w-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
                <Users className="w-8 h-8 text-blue-300" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Vai al Cliente</h3>
                <p className="text-sm text-slate-400 font-medium">Accesso rapido allo storico</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative w-full group/input">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Seleziona Nominativo</label>
                <select
                  onChange={handleClientSelect}
                  defaultValue=""
                  className="w-full pl-5 pr-12 py-5 bg-white/5 backdrop-blur-sm text-white rounded-2xl border border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white/10 cursor-pointer transition-all shadow-inner font-medium text-lg appearance-none hover:bg-white/10"
                >
                  <option value="" disabled className="text-slate-900 bg-white">-- Cerca nella lista --</option>
                  {sortedClients.map(c => (
                    <option key={c.id} value={c.id} className="text-slate-900 bg-white py-2">
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 bottom-5 pointer-events-none text-slate-400 group-hover/input:text-white transition-colors">
                  <ChevronDown className="w-6 h-6" />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <p className="text-xs text-blue-200 font-medium">
                  Selezionando un cliente verrai reindirizzato automaticamente alla sua scheda dettagliata.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};