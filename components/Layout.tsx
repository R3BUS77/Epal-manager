import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Database, Boxes, ClipboardPen, CalendarDays, Power, ScrollText, Search, Bell, Clock, User, CircleUser, LogOut, Settings } from 'lucide-react';

// Helper per il genere
const getGender = (name: string): 'M' | 'F' => {
  const n = (name || '').trim().toLowerCase();
  if (!n) return 'M'; // Default

  // Eccezioni comuni maschili che finiscono per 'a'
  const maleExceptions = ['andrea', 'luca', 'nicola', 'mattia', 'elia', 'tobia', 'giona', 'cosma', 'enea'];

  // Eccezioni comuni femminili che NON finiscono per 'a'
  const femaleExceptions = [
    'sharon', 'giusy', 'noemi', 'ester', 'miriam', 'carmen', 'alice', 'beatrice',
    'irene', 'adele', 'matilde', 'nicole', 'michelle', 'chloe', 'zoe', 'ines', 'iris',
    'raquel', 'ruth', 'karen', 'susan', 'sarah', 'jennifer', 'rachele', 'vittoria' // wait vittoria ends in a
  ];

  if (maleExceptions.includes(n)) return 'M';
  if (femaleExceptions.includes(n)) return 'F';

  // Molti nomi femminili "stranieri" o diminutivi finiscono per 'y' (Giusy, Mary, Terry, Patty)
  // Attenzione ai maschili (Tommy, Tony, Harry, Jerry) -> aggiungiamoli a maleExceptions se necessario, 
  // ma in Italia "Y" finale è spesso femminile (Giusy, Stefy, Rosy).
  // Rischio accettabile per "user request".
  if (n.endsWith('y')) return 'F';

  // Regola base Italiano
  if (n.endsWith('a')) return 'F';

  return 'M';
};

interface LayoutProps {
  children: React.ReactNode;
  operatorName?: string;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, operatorName, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showColon, setShowColon] = useState(true);

  const gender = getGender(operatorName || '');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setShowColon(prev => !prev);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fix: Force focus on window change to prevent inputs from becoming inaccessible
  useEffect(() => {
    const handleFocus = () => {
      window.focus();
      // Optional: Click on body to reset internal focus state if needed, but window.focus is usually key for Electron
      // document.body.click(); 
    };

    // Small timeout to ensure transition is done
    const t = setTimeout(handleFocus, 100);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback if no prop provided (shouldn't happen in new App structure)
      window.location.reload();
    }
  };

  const handleQuit = () => {
    // IPC call to close the app via main process
    // window.require is available in Electron renderer
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('app-close');
    } catch (error) {
      console.error("Electron IPC not available", error);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Registra Movimenti', path: '/daily', icon: ClipboardPen },
    { label: 'Movimenti Clienti', path: '/client-movements', icon: ScrollText },
    { label: 'Anagrafica Clienti', path: '/clients', icon: Users },
    { label: 'Calendario', path: '/calendar', icon: CalendarDays },
    { label: 'Impostazioni', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* Sidebar Premium */}
      <aside className="w-72 relative z-20 flex flex-col transition-all duration-300 shadow-2xl">
        {/* Sidebar Background with Gradient & Blur */}
        <div className="absolute inset-0 bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>

        {/* Brand Area */}
        <div className="relative p-8 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50 text-white transform rotate-3">
            <Boxes className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Epal Manager</h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Professional Logistics</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 px-4 py-4 space-y-1.5 overflow-y-auto z-10">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-2">Menu Principale</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center justify-start gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${isActive
                  ? 'text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-100 rounded-xl"></div>
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium relative z-10">{item.label}</span>

                {isActive && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-sm glow"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="relative p-4 border-t border-white/5 z-10 mx-4 mb-4 space-y-2">

          {/* Change User Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all duration-300 border border-slate-700 hover:border-slate-500 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-medium">Cambia Utente</span>
          </button>

          {/* QUIT Button */}
          <button
            onClick={handleQuit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-500/20 hover:border-red-500 hover:shadow-lg hover:shadow-red-900/20 group"
          >
            <Power className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            <span className="font-bold">Chiudi Programma</span>
          </button>

          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-600 font-medium">v4.0.0 • Build 2025 • Nicolini Loris</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#f8fafc]">

        {/* Header */}
        <header className="px-8 py-5 flex justify-between items-center z-10 bg-transparent">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 animate-fadeIn">
              {location.pathname === '/' && 'Dashboard'}
              {location.pathname === '/daily' && 'Movimenti Giornalieri'}
              {location.pathname.startsWith('/clients') && 'Gestione Clienti'}
              {location.pathname.startsWith('/client-movements') && 'Movimenti Clienti'}
              {location.pathname === '/calendar' && 'Calendario'}
              {location.pathname === '/settings' && 'Impostazioni'}
            </h2>
            <p className="text-sm text-slate-500 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Clock Simple */}
            <div className="hidden md:flex items-center gap-3 mr-4">
              <Clock className="w-4 h-4 text-slate-400" />
              <div className="font-mono font-bold text-lg text-slate-600 tracking-wide">
                {currentTime.getHours().toString().padStart(2, '0')}
                <span className={`${showColon ? 'opacity-100' : 'opacity-0'} text-slate-400 mx-[1px] transition-opacity duration-200`}>:</span>
                {currentTime.getMinutes().toString().padStart(2, '0')}
                <span className={`${showColon ? 'opacity-100' : 'opacity-0'} text-slate-400 mx-[1px] transition-opacity duration-200`}>:</span>
                <span className="text-slate-400 font-normal text-base">
                  {currentTime.getSeconds().toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-700">{operatorName || 'Ospite'}</p>
                <p className="text-xs text-blue-600 font-medium">Operatore Attivo</p>
              </div>

              {/* Gender Avatar Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ring-2 ring-white
                ${gender === 'M' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200' : 'bg-gradient-to-br from-pink-500 to-rose-600 shadow-rose-200'}`}>
                {gender === 'M' ? (
                  <User className="w-6 h-6 text-white" />
                ) : (
                  <CircleUser className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="animate-slideIn max-w-7xl mx-auto">
            {children}
          </div>
        </div>

      </main>
    </div>
  );
};