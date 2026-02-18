
import React, { useState, useEffect } from 'react';
import { Bell, Trash2, UserX, Info, ChevronLeft, Calendar, DollarSign, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead, checkOverdueBills } from '../data/notifications';
import { AppNotification } from '../types';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    // 1. Checa se existem contas vencidas e cria notificações
    await checkOverdueBills();
    // 2. Busca notificações do banco
    const data = await getNotifications();
    setNotifs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRead = async (n: AppNotification) => {
    if (!n.read) {
        await markAsRead(n.id);
        setNotifs(prev => prev.map(item => item.id === n.id ? {...item, read: true} : item));
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifs(prev => prev.map(item => ({...item, read: true})));
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/agenda')}><ChevronLeft size={24} /></button>
            <h1 className="text-lg font-medium">Notificações</h1>
        </div>
        <button onClick={handleMarkAllRead} className="text-[10px] font-bold uppercase tracking-widest bg-blue-800 px-3 py-1.5 rounded-lg active:scale-95">
            Ler Todas
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
            <div className="p-10 text-center text-gray-400 text-xs uppercase font-bold">Carregando...</div>
        ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 gap-2 text-gray-300">
                <Bell size={48} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Sem novas notificações</p>
            </div>
        ) : (
            notifs.map((n) => (
                <div 
                    key={n.id} 
                    onClick={() => handleRead(n)}
                    className={`flex items-start gap-4 p-5 border-b border-gray-50 active:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : 'bg-white'}`}
                >
                    <div className={`mt-1 p-2 rounded-xl shrink-0 ${
                        n.type === 'FINANCEIRO' ? 'bg-red-50 text-red-500' : 
                        n.type === 'AGENDAMENTO' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {n.type === 'FINANCEIRO' ? <DollarSign size={18} /> : 
                         n.type === 'AGENDAMENTO' ? <Calendar size={18} /> : <Info size={18} />}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className={`font-bold text-sm tracking-tight ${!n.read ? 'text-blue-900' : 'text-gray-700'}`}>
                                {n.title}
                            </h4>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />}
                        </div>
                        <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                            {n.message}
                        </p>
                        <p className="text-[10px] text-gray-300 font-bold uppercase mt-2">
                            {new Date(n.created_at).toLocaleString('pt-BR')}
                        </p>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
