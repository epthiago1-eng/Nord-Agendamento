
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, X, 
  Clock, Lock, CalendarPlus, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBlocks, getAppointments, AgendaBlock, Appointment, deleteBlock } from '../data/agendaData';
import { supabase } from '../supabase';

const professionals = [
  { id: '1', name: 'Diego', avatar: 'https://picsum.photos/seed/diego/100' },
  { id: '2', name: 'Felipe', avatar: 'https://picsum.photos/seed/felipe/100' },
  { id: '3', name: 'Ricardo', avatar: 'https://picsum.photos/seed/ricardo/100' },
];

const Agenda: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || 'ADMIN';
  const userProId = localStorage.getItem('user_pro_id') || '1';

  const [loading, setLoading] = useState(true);
  const [selectedPro, setSelectedPro] = useState(userRole === 'COLLABORATOR' ? userProId : professionals[0].id);
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<null | 'blockDetails' | 'calendarPicker'>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apts, blks] = await Promise.all([
        getAppointments({ date: selectedDate.toISOString().split('T')[0] }),
        getBlocks()
      ]);
      setAppointments(apts);
      setBlocks(blks);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Realtime subscription (Supabase Magic)
    const channel = supabase.channel('agenda_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_blocks' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedDate]);

  const HOUR_HEIGHT = 80;
  const START_HOUR = 8;
  const hours = Array.from({ length: 14 }, (_, i) => START_HOUR + i);

  const dayStripItems = useMemo(() => {
    const items = [];
    for (let i = -15; i <= 15; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + i);
      items.push(d);
    }
    return items;
  }, [selectedDate]);

  const getPosition = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutesSinceStart = (h - START_HOUR) * 60 + m;
    return (totalMinutesSinceStart / 60) * HOUR_HEIGHT;
  };

  const getHeight = (durationMin: number) => (durationMin / 60) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-full bg-[#fcfaff] relative overflow-hidden">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between z-[60] shadow-md">
        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); }} className="p-1"><ChevronLeft size={24} /></button>
        <div className="flex flex-col items-center">
            <h1 className="text-base font-bold uppercase tracking-widest">
                {selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h1>
        </div>
        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); }} className="p-1"><ChevronRight size={24} /></button>
      </header>

      <div className="bg-white border-b border-gray-100 overflow-hidden flex py-3 px-4 gap-4 no-scrollbar overflow-x-auto">
        {dayStripItems.map((date, idx) => (
          <button key={idx} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center min-w-[45px] ${date.toDateString() === selectedDate.toDateString() ? 'text-blue-900' : 'text-gray-400'}`}>
            <span className="text-[10px] font-bold uppercase">{date.toLocaleString('pt-BR', { weekday: 'short' })}</span>
            <div className={`w-9 h-9 flex items-center justify-center rounded-full mt-1 ${date.toDateString() === selectedDate.toDateString() ? 'bg-blue-900 text-white shadow-lg' : ''}`}>
              <span className="text-sm font-black">{date.getDate()}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto relative bg-[#fcfaff]">
        {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-50">
                <Loader2 className="animate-spin text-blue-900" size={32} />
            </div>
        ) : (
          <div className="flex min-h-full">
            <div className="w-14 border-r border-gray-100 sticky left-0 bg-[#fcfaff]">
              {hours.map((hour) => (
                <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="text-[10px] text-gray-400 font-medium text-center pt-2">
                  <span>{hour.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
            <div className="flex-1 relative">
              {hours.map((_, i) => <div key={i} className="absolute left-0 right-0 border-b border-gray-50" style={{ top: `${i * HOUR_HEIGHT}px`, height: '1px' }} />)}
              
              <div className="absolute inset-0 px-2">
                {appointments.filter(a => a.professionalId === selectedPro).map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => navigate(`/appointment-checkout/${apt.id}`)}
                    className="absolute left-1 right-1 rounded-xl p-3 bg-white border-l-4 border-blue-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                    style={{ top: `${getPosition(apt.time)}px`, height: `${getHeight(apt.duration)}px`, zIndex: 20 }}
                  >
                    <h4 className="font-bold text-xs truncate text-gray-900">{apt.clientName}</h4>
                    <p className="text-[9px] font-black uppercase text-blue-600">{apt.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3">
          {isFabOpen && (
              <button onClick={() => navigate('/new-appointment')} className="bg-[#1e3a8a] text-white p-4 rounded-2xl shadow-xl animate-in slide-in-from-bottom-4">
                <CalendarPlus size={24} />
              </button>
          )}
          <button onClick={() => setIsFabOpen(!isFabOpen)} className={`bg-gray-400 text-white p-4.5 rounded-[2rem] shadow-2xl transition-all ${isFabOpen ? 'rotate-45' : ''}`}>
            <Plus size={32} />
          </button>
      </div>
    </div>
  );
};

export default Agenda;
