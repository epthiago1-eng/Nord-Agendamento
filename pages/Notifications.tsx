
import React, { useState, useEffect } from 'react';
import { Bell, Trash2, UserX, Info } from 'lucide-react';

const initialNotifications = [
  { type: 'Agendamento', client: 'Ignacio', date: '08/07/2025 15:30:00' },
  { type: 'Agendamento', client: 'Matheus', date: '08/07/2025 14:30:00' },
  { type: 'Agendamento', client: 'Robson', date: '05/07/2025 17:00:00' },
  { type: 'Agendamento', client: 'Filipe - Tainara', date: '05/07/2025 12:00:00' },
  { type: 'Desmarcou Agendamento', client: 'Fernando', date: '05/07/2025 09:00:00', canceled: true },
];

const Notifications: React.FC = () => {
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('nord_barber_notifications') || '[]');
    setNotifs([...stored, ...initialNotifications]);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      <header className="bg-[#1e3a8a] text-white flex items-center">
        <button className="flex-1 py-3 border-b-4 border-transparent opacity-60 flex flex-col items-center">
          <div className="relative">
             <Bell size={20} />
             <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] px-1 rounded-full">1</span>
          </div>
          <span className="text-xs font-medium">Novidades</span>
        </button>
        <button className="flex-1 py-3 border-b-4 border-blue-400 flex flex-col items-center">
           <div className="relative">
             <Bell size={20} />
             <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] px-1 rounded-full">{notifs.length}</span>
          </div>
          <span className="text-xs font-medium">Lembretes</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-white">
        {notifs.map((n, idx) => (
          <div key={idx} className={`flex items-start gap-4 p-5 border-b border-gray-50 active:bg-gray-50 ${n.adminAlert ? 'bg-red-50/50' : ''}`}>
            <div className={`mt-1 p-1.5 rounded-full ${n.adminAlert ? 'bg-red-100 text-red-600' : n.canceled ? 'text-red-500' : 'text-blue-500'}`}>
              {n.adminAlert ? <UserX size={18} /> : <Bell size={18} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-gray-900 font-bold text-sm tracking-tight">{n.type}</h4>
                {n.adminAlert && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">ALERTA ADM</span>}
              </div>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                <span className="font-bold">{n.client}</span> . {n.date}
                {n.professional && <span className="block italic text-[10px] text-gray-400">Profissional: {n.professional}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
