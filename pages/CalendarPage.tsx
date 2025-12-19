import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, Gift, CalendarRange } from 'lucide-react';

// Funzione per calcolare la Pasqua (Metodo Meeus/Jones/Butcher)
const getEasterDate = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month: month - 1, day }; // Mese 0-indexed
};

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<{ day: number; month: number; name: string }[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Genera un range di anni esteso dal 2000 al 3000
  const startYear = 2000;
  const endYear = 3000;
  const yearsRange = Array.from(
    { length: endYear - startYear + 1 }, 
    (_, i) => startYear + i
  );

  // Calcolo Festività Italiane per l'anno corrente
  useEffect(() => {
    const easter = getEasterDate(year);
    // Pasquetta è il giorno dopo Pasqua
    const easterMondayDate = new Date(year, easter.month, easter.day + 1);
    
    const fixedHolidays = [
      { day: 1, month: 0, name: 'Capodanno' },
      { day: 6, month: 0, name: 'Epifania' },
      { day: 25, month: 3, name: 'Liberazione' },
      { day: 1, month: 4, name: 'Festa Lavoro' },
      { day: 2, month: 5, name: 'Repubblica' },
      { day: 15, month: 7, name: 'Ferragosto' },
      { day: 1, month: 10, name: 'Ognissanti' },
      { day: 8, month: 11, name: 'Immacolata' },
      { day: 25, month: 11, name: 'Natale' },
      { day: 26, month: 11, name: 'S. Stefano' },
    ];

    const dynamicHolidays = [
      { day: easter.day, month: easter.month, name: 'Pasqua' },
      { day: easterMondayDate.getDate(), month: easterMondayDate.getMonth(), name: 'Pasquetta' },
    ];

    setHolidays([...fixedHolidays, ...dynamicHolidays]);
  }, [year]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Domenica
  
  // Aggiustamento per far partire la settimana da Lunedì (Standard Italiano)
  // Se firstDayOfMonth è 0 (Domenica), diventa 6. Altrimenti firstDayOfMonth - 1.
  const startingSlot = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    // Impostiamo il giorno a 1 per evitare problemi di overflow mesi (es. da un anno bisestile a uno no)
    setCurrentDate(new Date(newYear, month, 1));
  };

  const today = new Date();
  const isToday = (d: number) => 
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const getHoliday = (d: number) => {
    return holidays.find(h => h.day === d && h.month === month);
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header Calendario */}
        <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-900/50">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold capitalize tracking-tight">
                  {currentDate.toLocaleDateString('it-IT', { month: 'long' })}
                </h2>
                
                {/* Selettore Anno */}
                <div className="relative group">
                    <select 
                        value={year}
                        onChange={handleYearChange}
                        className="appearance-none bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xl font-bold py-1 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                        {yearsRange.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <CalendarRange className="w-4 h-4" />
                    </div>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-1 font-medium">Pianificazione e Festività</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1.5 border border-slate-700">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-md transition-colors text-slate-300 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="px-4 py-1.5 text-sm font-bold hover:bg-slate-700 rounded-md transition-colors border-x border-slate-700 mx-1 text-blue-300 hover:text-blue-200 uppercase tracking-wider">
              Oggi
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-md transition-colors text-slate-300 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Griglia */}
        <div className="p-6">
          {/* Giorni della settimana */}
          <div className="grid grid-cols-7 mb-4">
            {weekDays.map((day, idx) => (
              <div key={day} className={`text-center font-bold text-sm py-3 uppercase tracking-widest border-b-2 border-transparent ${idx >= 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Giorni */}
          <div className="grid grid-cols-7 gap-2 md:gap-4 auto-rows-fr">
            {/* Slot vuoti iniziali */}
            {Array.from({ length: startingSlot }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[110px] bg-slate-50/30 rounded-lg border border-transparent"></div>
            ))}

            {/* Giorni del mese */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(year, month, day);
              const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sab
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const holiday = getHoliday(day);
              const isTodayDate = isToday(day);

              return (
                <div 
                  key={day} 
                  className={`
                    relative min-h-[110px] p-3 rounded-2xl border transition-all duration-200 group
                    ${isTodayDate 
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 shadow-lg z-10 scale-[1.02]' 
                        : isWeekend 
                            ? 'bg-slate-50/80 border-slate-200 hover:border-rose-200 hover:bg-rose-50/30' 
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`
                        text-lg font-bold w-9 h-9 flex items-center justify-center rounded-xl transition-colors
                        ${isTodayDate 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : isWeekend 
                                ? 'text-rose-500 bg-rose-50' 
                                : 'text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700'}
                    `}>
                      {day}
                    </span>
                    {holiday && (
                       <span title={holiday.name} className="cursor-help animate-pulse hover:animate-none">
                           <Gift className="w-6 h-6 text-amber-500 drop-shadow-sm" />
                       </span>
                    )}
                  </div>

                  {/* Etichette Festività */}
                  {holiday && (
                    <div className="mt-3">
                        <span className="block w-full bg-amber-100 text-amber-800 text-[10px] uppercase leading-tight px-2 py-1.5 rounded-lg font-bold border border-amber-200 shadow-sm text-center truncate">
                            {holiday.name}
                        </span>
                    </div>
                  )}

                  {/* Etichette Weekend Generiche */}
                  {!holiday && isWeekend && (
                      <div className="mt-3 opacity-20 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-black text-rose-300 uppercase block text-center tracking-widest">
                              {dayOfWeek === 6 ? 'Sabato' : 'Domenica'}
                          </span>
                      </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};