
import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Users, Package, Calendar, TrendingUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { BackupReminder } from '../components/BackupReminder';
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
    .slice(0, 4); // Ridotto a 4 per evitare scroll

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente sconosciuto';

  // Calcolo se ci sono debitori (Clienti con deficit > 0)
  // Deficit Cliente = (Buono) - (Sped + Misto + Reso) > 0?
  // Logica: Il cliente ha preso (Buono) più di quanto ha dato (Sped + Misto + Reso).
  const hasDebtors = useMemo(() => {
    const clientBalances: Record<string, number> = {};
    movements.forEach(m => {
      // Debito: Ciò che il cliente ha PRESO (Buono)
      const debtGenerated = (m.palletsGood || 0);

      // Credito: Ciò che il cliente ha DATO/Ritornato (Sped + Misto + Reso)
      const creditGenerated = (m.palletsShipping || 0) + (m.palletsExchange || 0) + (m.palletsReturned || 0);

      clientBalances[m.clientId] = (clientBalances[m.clientId] || 0) + (debtGenerated - creditGenerated);
    });
    // Mostra solo se il cliente è in debito a noi
    return Object.values(clientBalances).some(balance => balance > 0);
  }, [movements]);


  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    if (clientId) {
      navigate(`/clients/${clientId}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Backup Reminder Banner (Last Day of Month) */}
      <BackupReminder />

      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <StatCard
          title="Bancali in Positivo"
          value={stats.positive}
          icon={ArrowUpRight}
          color="green"
          description="Guadagno"
        />
        <StatCard
          title="Bancali in Negativo"
          value={stats.negative}
          icon={ArrowDownLeft}
          color={stats.negative > 0 ? "red" : "blue"}
          description={stats.negative > 0 ? "Deficit: Buono - (Sped + Misto + Reso)" : "Nessun passivo rilevato"}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-full">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
            <h3 className="font-bold text-slate-800 flex items-center gap-2.5 text-lg">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              Ultimi Movimenti
            </h3>

            {/* Pulsante Warning Debitori (Visibile solo se necessario) */}
            {hasDebtors && (
              <button
                onClick={() => navigate('/client-movements')}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors group h-10 shadow-sm"
              >
                <div className="p-1.5 bg-amber-200 text-amber-800 rounded-full group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-sm">Clienti in debito</span>
              </button>
            )}
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

                // Helper per rendering riga valore (Uniform Height)
                const renderValueRow = (label: string, val: number, colorText: string = 'text-slate-900') => (
                  <div className="flex justify-between items-center gap-2 text-slate-500 h-5">
                    <span className="text-[11px] uppercase tracking-wide opacity-70">{label}:</span>
                    <span className={`font-bold text-sm tabular-nums ${val > 0 ? colorText : 'text-slate-300'}`}>
                      {val > 0 ? val : '-'}
                    </span>
                  </div>
                );

                return (
                  <div
                    key={move.id}
                    className={`px-6 py-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 transition-all duration-200 group cursor-default ${bgClass} ${borderClass}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm text-white font-bold text-sm shrink-0 ${isShipping ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                      {getClientName(move.clientId).charAt(0).toUpperCase()}
                    </div>

                    {/* Dati Cliente */}
                    <div className="min-w-0 pr-4">
                      <p className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors truncate text-base">
                        {getClientName(move.clientId)}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5 truncate flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(move.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Valori Tabulari (SEMPRE VISIBILI per altezza uniforme) */}
                    <div className="text-right text-xs font-medium space-y-1 min-w-[100px]">
                      {renderValueRow('Sped', move.palletsShipping)}
                      {renderValueRow('Misto', move.palletsExchange)}
                      {renderValueRow('Buono', move.palletsGood, 'text-emerald-700')}
                      {renderValueRow('Reso', move.palletsReturned, 'text-rose-600')}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>


      </div>
    </div>

  );
};