import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Database, PackageOpen, ClipboardPen, CalendarDays, Power, ScrollText, Search, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  operatorName?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, operatorName }) => {
  const location = useLocation();

  const navItems = [
    { label: 'Panoramica', path: '/', icon: LayoutDashboard },
    { label: 'Registra Movimenti', path: '/daily', icon: ClipboardPen },
    { label: 'Movimenti Clienti', path: '/client-movements', icon: ScrollText },
    { label: 'Anagrafica Clienti', path: '/clients', icon: Users },
    { label: 'Calendario', path: '/calendar', icon: CalendarDays },
    { label: 'Impostazioni', path: '/settings', icon: Database },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* Sidebar Premium */}
      <aside className="w-72 relative z-20 flex flex-col transition-all duration-300">
        {/* Sidebar Background with Gradient & Blur */}
        <div className="absolute inset-0 bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>

        {/* Brand Area */}
        <div className="relative p-8 flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50 text-white transform rotate-3">
            <PackageOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Epal Manager</h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">PRO Logistics v2.0</p>
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
                className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${isActive
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
        <div className="relative p-4 border-t border-white/5 z-10 mx-4 mb-4">
          <button
            onClick={() => window.close()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-500/20 hover:border-red-500 hover:shadow-lg hover:shadow-red-900/20 group"
          >
            <Power className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span className="font-bold">Disconnetti</span>
          </button>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-600 font-medium">v2.0.0 • Build 2025 • Nicolini Loris</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-[#f8fafc]">

        {/* Top Header Floating */}
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
            {/* Search Micro-interaction (Visual only for now) */}
            <div className="hidden md:flex items-center bg-white px-4 py-2.5 rounded-full shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all w-64">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input type="text" placeholder="Cerca veloce..." className="bg-transparent border-none text-sm w-full focus:outline-none text-slate-600 placeholder:text-slate-400" />
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-700">{operatorName || 'Ospite'}</p>
                <p className="text-xs text-blue-600 font-medium">Operatore Attivo</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-200 ring-2 ring-white">
                {operatorName ? operatorName.charAt(0).toUpperCase() : '?'}
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