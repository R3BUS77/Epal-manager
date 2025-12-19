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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="BANCALI IN POSITIVO"
          value={stats.positive}
          icon={ArrowUpRight}
          color="green"
          description="Eccedenza: (Sped + Misto + Reso) - Buono"
        />
        <StatCard
          title="BANCALI IN NEGATIVO"
          value={stats.negative}
          icon={ArrowDownLeft}
          color={stats.negative > 0 ? "red" : "blue"}
          description={stats.negative > 0 ? "Deficit: Buono - (Sped + Misto + Reso)" : "Nessun passivo rilevato"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ultimi Movimenti
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentMovements.length === 0 ? (
              <div className="p-6 text-center text-slate-400">Nessun movimento recente</div>
            ) : (
              recentMovements.map((move) => {
                // Visualizzazione righe
                const isShipping = (move.palletsShipping || 0) > 0 || (move.palletsExchange || 0) > 0 || (move.palletsReturned || 0) > 0;

                // Calcolo Bilancio
                const sumOut = (move.palletsShipping || 0) + (move.palletsExchange || 0) + (move.palletsReturned || 0);
                const sumIn = (move.palletsGood || 0);
                const netBalance = sumOut - sumIn;

                // Definizione Colori
                let bgClass = '';
                if (netBalance === 0) {
                  bgClass = 'bg-slate-100 hover:bg-slate-200'; // Grigio (Pari)
                } else if (netBalance > 0) {
                  bgClass = 'bg-emerald-100 hover:bg-emerald-200'; // Verde (Positivo)
                } else {
                  bgClass = 'bg-red-100 hover:bg-red-200'; // Rosso Scuro (Negativo)
                }

                return (
                  <div key={move.id} className={`px-6 py-4 flex items-center justify-between transition-colors ${bgClass}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${isShipping ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                      <div>
                        <p className="font-medium text-slate-800">{getClientName(move.clientId)}</p>
                        <p className="text-xs text-slate-500">{new Date(move.date).toLocaleDateString('it-IT')}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500 space-y-0.5">
                      {move.palletsShipping > 0 && <span className="block text-slate-700">Sped: <b>{move.palletsShipping}</b> </span>}
                      {move.palletsExchange > 0 && <span className="block text-slate-700">Misto: <b>{move.palletsExchange}</b> </span>}
                      {move.palletsGood > 0 && <span className="block text-slate-700">Buono: <b>{move.palletsGood}</b> </span>}
                      {move.palletsReturned > 0 && <span className="block text-slate-700">Reso: <b>{move.palletsReturned}</b></span>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Client Selector (Replaces Quick Links) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-start">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Vai al Cliente</h3>
              <p className="text-xs text-slate-500">Seleziona per visualizzare lo storico</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="relative w-full">
              <select
                onChange={handleClientSelect}
                defaultValue=""
                className="w-full pl-4 pr-10 py-4 bg-slate-50 text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-blue-400 transition-all shadow-sm appearance-none font-medium text-lg"
              >
                <option value="" disabled>-- Seleziona un cliente --</option>
                {sortedClients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-slate-400">
              Verrai reindirizzato automaticamente alla pagina di dettaglio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};