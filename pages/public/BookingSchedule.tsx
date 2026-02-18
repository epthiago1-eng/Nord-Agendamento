
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, ChevronRight, X, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAvailableSlotsForPro, getSettings } from '../../data/agendaData';
import { EstablishmentSettings } from '../../types';

const initialProfessionals = [
  { id: '1', name: 'Diego', avatar: 'https://picsum.photos/seed/diego/200', showInPublic: true },
  { id: '2', name: 'Felipe', avatar: 'https://picsum.photos/seed/felipe/200', showInPublic: true },
  { id: '3', name: 'Ricardo', avatar: 'https://picsum.photos/seed/ricardo/200', showInPublic: false },
];

const BookingSchedule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedServices = location.state?.selectedServices || [];
  
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [proSlots, setProSlots] = useState<Record<string, string[]>>({});

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const availableProfessionals = useMemo(() => {
    return initialProfessionals.filter(p => p.showInPublic);
  }, []);

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((acc: number, s: any) => {
      const mins = s.duration ? parseInt(s.duration.split(' ')[0]) : 30;
      return acc + mins;
    }, 0) || 30;
  }, [selectedServices]);

  const dateStr = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);

  useEffect(() => {
    const fetchSlots = async () => {
      const slotsMap: Record<string, string[]> = {};
      for (const pro of availableProfessionals) {
        slotsMap[pro.id] = await getAvailableSlotsForPro(pro.id, dateStr, totalDuration);
      }
      setProSlots(slotsMap);
    };
    if (availableProfessionals.length > 0) {
      fetchSlots();
    }
  }, [availableProfessionals, dateStr, totalDuration]);

  const handleSelectSlot = (pro: typeof initialProfessionals[0], time: string) => {
    navigate('/booking/form', { 
        state: { 
            selectedServices, 
            professional: pro, 
            time, 
            date: selectedDate.toLocaleDateString('pt-BR'),
            dateIso: dateStr // Adicionado para sincronização correta com o banco
        } 
    });
  };

  const changeDay = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const renderCalendar = () => {
    if (!settings) return null;
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const isPast = date < new Date(new Date().setHours(0,0,0,0));

        days.push(
            <button
                key={d}
                disabled={isPast}
                onClick={() => { setSelectedDate(date); setShowCalendar(false); }}
                className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isSelected ? 'text-white shadow-lg scale-110' : isPast ? 'text-gray-200 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{ backgroundColor: isSelected ? settings.primaryColor : 'transparent' }}
            >
                {d}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setPickerMonth(new Date(year, month - 1, 1))} className="p-2 text-gray-400"><ChevronLeft /></button>
                    <h3 className="text-gray-900 font-black uppercase tracking-widest text-sm">
                        {pickerMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={() => setPickerMonth(new Date(year, month + 1, 1))} className="p-2 text-gray-400"><ChevronRight /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-4">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                        <div key={d} className="h-10 w-10 flex items-center justify-center text-[10px] font-black text-gray-300 uppercase">{d}</div>
                    ))}
                    {days}
                </div>
                <button 
                    onClick={() => setShowCalendar(false)} 
                    className="w-full text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs"
                    style={{ backgroundColor: settings.primaryColor }}
                >
                    Fechar
                </button>
            </div>
        </div>
    );
  };

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="h-16 w-full relative shrink-0" style={{ backgroundColor: settings.secondaryColor }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl z-10 translate-y-[-20%]">
          <img src={settings.logoUrl} alt={settings.name} className="w-full h-full object-contain p-1" />
        </div>
      </div>

      <div className="mt-20 px-4 space-y-6 pb-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-900 font-bold text-sm">
            <ChevronLeft size={20} className="text-primary" style={{ color: settings.primaryColor }} />
            Escolha o profissional e horário
        </button>

        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-2 shadow-sm flex items-center justify-between sticky top-4 z-20 backdrop-blur-sm bg-white/80">
            <button 
                onClick={() => changeDay(-1)} 
                disabled={selectedDate <= new Date(new Date().setHours(0,0,0,0))}
                className="p-3 text-black disabled:opacity-20 active:scale-90"
            >
                <ChevronLeft size={24} />
            </button>
            
            <button 
                onClick={() => setShowCalendar(true)}
                className="flex flex-col items-center gap-0.5 active:opacity-60"
            >
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: settings.primaryColor }}>
                    {selectedDate.toLocaleString('pt-BR', { weekday: 'long' })}
                </span>
                <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900 text-sm">
                        {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </span>
                    <CalendarIcon size={16} style={{ color: settings.primaryColor }} />
                </div>
            </button>

            <button 
                onClick={() => changeDay(1)}
                className="p-3 text-black active:scale-90"
            >
                <ChevronRight size={24} />
            </button>
        </div>

        <div className="space-y-6">
            {availableProfessionals.map(pro => {
                const availableSlots = proSlots[pro.id] || [];
                return (
                    <div key={pro.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col items-center">
                        <div className="pt-8 pb-4 flex flex-col items-center gap-3">
                            <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 shadow-inner" style={{ borderColor: `${settings.primaryColor}20` }}>
                                <img src={pro.avatar} alt={pro.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="text-center">
                                <span className="font-black text-gray-900 uppercase tracking-widest text-sm">{pro.name}</span>
                                <div className="flex items-center justify-center gap-1 mt-1" style={{ color: settings.primaryColor }}>
                                    <Clock size={12} />
                                    <span className="text-[10px] font-black uppercase">Agenda Disponível</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full p-6 bg-gray-50/30 border-t border-gray-50">
                            {availableSlots.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-4 text-red-400 gap-2">
                                    <X size={24} className="opacity-50" />
                                    <p className="font-bold text-center italic text-[10px] uppercase tracking-widest">Sem horários hoje</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    {availableSlots.map(time => (
                                        <button 
                                            key={time}
                                            onClick={() => handleSelectSlot(pro, time)}
                                            className="text-white font-black py-3 rounded-xl text-[10px] tracking-tight active:scale-95 transition-all shadow-md hover:opacity-90"
                                            style={{ backgroundColor: settings.primaryColor }}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {showCalendar && renderCalendar()}
    </div>
  );
};

export default BookingSchedule;
