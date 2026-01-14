
import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Users, Package, Calendar, TrendingUp, ChevronDown, AlertTriangle, RotateCcw } from 'lucide-react';
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
    // Calcoliamo il saldo PER CLIENTE, non globale.
    // In questo modo se un cliente è in positivo e uno in negativo, NON si annullano.
    const clientBalances: Record<string, number> = {};

    movements.forEach(m => {
      // Uscite (Sped + Misto + RESO)
      const outVal = (m.palletsShipping || 0) + (m.palletsExchange || 0) + (m.palletsReturned || 0);
      // Entrate (Buono)
      const inVal = (m.palletsGood || 0);

      // Saldo netto parziale per questo movimento
      // Positive = Abbiamo dato più di quanto ricevuto (Credito)
      const net = outVal - inVal;

      clientBalances[m.clientId] = (clientBalances[m.clientId] || 0) + net;
    });

    let positive = 0;
    let negative = 0;

    Object.values(clientBalances).forEach(balance => {
      if (balance > 0) {
        // Cliente "in positivo" (noi siamo in credito)
        positive += balance;
      } else if (balance < 0) {
        // Cliente "in negativo" (noi siamo in debito)
        negative += Math.abs(balance);
      }
    });

    return {
      positive,
      negative
    };
  }, [movements]);

  const recentMovements = [...movements]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8); // Aumentato a 8 per nuova visualizzazione compatta

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente sconosciuto';

  // Calcolo se ci sono debitori (Clienti con deficit > 0)
  // Deficit Cliente = (Buono) - (Sped + Misto + Reso) > 0?
  // Logica: Il cliente ha preso (Buono) più di quanto ha dato (Sped + Misto + Reso).
  // Calcolo se ci sono debitori (Clienti con deficit NEGATIVO: Hanno ricevuto più di quanto dato)
  // Deficit Cliente = (SPED + MISTO + RESO) - (BUONO)
  // Se il saldo è < 0, significa che abbiamo dato MENO di quanto ricevuto (Debito nostro??)
  // ASPETTA: "Clienti in debito" significa che IL CLIENTE ha un debito verso di noi.
  // Nel contesto Epal Manager:
  // Saldo > 0 (Verde, Positivo) = Client owes us (Debito del cliente) ???
  // Saldo < 0 (Rosso, Negativo) = We owe client (Credito del cliente) ???
  //
  // Controllo DebtorClients.tsx:
  // getClientBalance = (gave - received).
  // filter(client => getClientBalance < 0).
  // Quindi "Debtor" = Balance < 0.
  //
  // In Dashboard.tsx stats logic:
  // clientBalances[m.clientId] += (outVal - inVal). (Gave - Received).
  // Quindi balance < 0 significa Gave < Received. Significa che il cliente ci ha dato più palette di quante ne ha prese.
  // Quindi NOI siamo in debito verso il cliente.
  // Però l'utente chiama la pagina "Clienti in debito". Probabilmente intende "Clienti che mandano in debito l'azienda" o "Clienti a cui dobbiamo palette".
  // Comunque, la logica richiesta è "balance < 0".

  const hasDebtors = useMemo(() => {
    // Usiamo la stessa logica di balance calcolata in stats, o ricalcoliamo.
    // Ricalcoliamo per sicurezza.
    const clientBalances: Record<string, number> = {};
    movements.forEach(m => {
      const outVal = (m.palletsShipping || 0) + (m.palletsExchange || 0) + (m.palletsReturned || 0);
      const inVal = (m.palletsGood || 0);
      const net = outVal - inVal;
      clientBalances[m.clientId] = (clientBalances[m.clientId] || 0) + net;
    });

    // Check if ANY client has balance < 0
    return Object.values(clientBalances).some(balance => balance < 0);
  }, [movements]);

  const hasReturns = useMemo(() => {
    // Check if ANY client has movements with returned > 0 total
    const clientReturns: Record<string, number> = {};
    movements.forEach(m => {
      if (m.palletsReturned > 0) {
        clientReturns[m.clientId] = (clientReturns[m.clientId] || 0) + m.palletsReturned;
      }
    });
    return Object.values(clientReturns).some(val => val > 0);
  }, [movements]);


  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    if (clientId) {
      navigate(`/clients/${clientId}`, { state: { from: '/' } });
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
          color="red"
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

            {/* Action Buttons Container */}
            <div className="flex items-center gap-2">
              {/* Pulsante Warning Debitori */}
              {hasDebtors && (
                <button
                  onClick={() => navigate('/debtors')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors group h-10 shadow-sm"
                >
                  <div className="p-1.5 bg-amber-200 text-amber-800 rounded-full group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-sm">Clienti in debito</span>
                </button>
              )}

              {/* Pulsante Resi (Viola) */}
              {hasReturns && (
                <button
                  onClick={() => navigate('/returns')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors group h-10 shadow-sm"
                >
                  <div className="p-1.5 bg-purple-200 text-purple-800 rounded-full group-hover:scale-110 transition-transform">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-sm">Clienti con Reso</span>
                </button>
              )}
            </div>
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

                // Helper per rendering riga valore (Horizontal Layout)
                const renderValue = (label: string, val: number, colorText: string = 'text-slate-900') => (
                  <div className="flex flex-col items-center justify-center min-w-[3.5rem]">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">{label}</span>
                    <span className={`font-bold text-sm tabular-nums leading-none ${val > 0 ? colorText : 'text-slate-300'}`}>
                      {val > 0 ? val : '-'}
                    </span>
                  </div>
                );

                return (
                  <div
                    key={move.id}
                    className={`px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-4 transition-all duration-200 group cursor-default ${bgClass} ${borderClass}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm text-white font-bold text-xs shrink-0 ${isShipping ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                      {getClientName(move.clientId).charAt(0).toUpperCase()}
                    </div>

                    {/* Dati Cliente */}
                    <div className="min-w-0 pr-4">
                      <p className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors truncate text-sm">
                        {getClientName(move.clientId)}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(move.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>

                    {/* Valori Tabulari (ORIZZONTALE) */}
                    <div className="flex items-center gap-2 sm:gap-4">
                      {renderValue('Buono', move.palletsGood, 'text-emerald-700')}
                      {renderValue('Sped', move.palletsShipping)}
                      {renderValue('Misto', move.palletsExchange)}
                      {renderValue('Reso', move.palletsReturned, 'text-rose-600')}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>


      </div>
    </div >

  );
};