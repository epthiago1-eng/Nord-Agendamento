
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Calendar, MapPin, 
  RotateCcw, Home, Share2, 
  ChevronRight, CalendarPlus 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSettings } from '../../data/agendaData';

const BookingConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { appointment, dateDisplay, address } = location.state || {};
  const [logoUrl, setLogoUrl] = useState("https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png");

  useEffect(() => {
    getSettings().then(s => {
        if (s.logoUrl) setLogoUrl(s.logoUrl);
    });
  }, []);

  // Se não houver dados, volta para o início
  if (!appointment) {
    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-white">
            <button onClick={() => navigate('/booking')} className="text-blue-900 font-bold">Voltar ao Início</button>
        </div>
    );
  }

  const handleAddToCalendar = () => {
    // Título e detalhes do evento
    const title = encodeURIComponent(`Nord Barbershop - ${appointment.services.join(' + ')}`);
    const details = encodeURIComponent(`Profissional: ${appointment.professionalName}\nServiços: ${appointment.services.join(', ')}`);
    const locationStr = encodeURIComponent(address || 'Nord Barbershop');
    
    // Cálculo do horário de início e fim
    // appointment.date: YYYY-MM-DD, appointment.time: HH:mm
    const startDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + appointment.duration * 60000);

    // Formatação para o Google Calendar: YYYYMMDDTHHmmSS
    const formatForGoogle = (date: Date) => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      const hh = date.getHours().toString().padStart(2, '0');
      const mm = date.getMinutes().toString().padStart(2, '0');
      const ss = '00';
      return `${y}${m}${d}T${hh}${mm}${ss}`;
    };

    const dates = `${formatForGoogle(startDateTime)}/${formatForGoogle(endDateTime)}`;
    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${locationStr}&dates=${dates}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const handleOpenMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Nord Barbershop')}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans animate-in fade-in duration-700">
      {/* Black Top Header */}
      <div className="bg-black h-16 w-full relative shrink-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl z-10 translate-y-[-20%]">
          <img src={logoUrl} alt="Nord Barbershop" className="w-full h-full object-contain p-1" />
        </div>
      </div>

      <div className="mt-20 px-6 space-y-8 flex-1 flex flex-col items-center">
        {/* Success Icon */}
        <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-green-50 p-4 rounded-full animate-in zoom-in duration-500 delay-300">
                <CheckCircle size={64} className="text-green-500" strokeWidth={2.5} />
            </div>
            <div className="text-center">
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Agendado!</h1>
                <p className="text-gray-400 text-sm font-medium">Seu horário foi reservado com sucesso.</p>
            </div>
        </div>

        {/* Info Card */}
        <div className="w-full bg-gray-50/50 border border-gray-100 rounded-[2.5rem] p-8 space-y-4 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest block mb-1">Quando</span>
                    <p className="text-gray-800 font-black text-sm">{dateDisplay} às {appointment.time}</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest block mb-1">Profissional</span>
                    <p className="text-gray-800 font-black text-sm">{appointment.professionalName}</p>
                </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest block mb-2">Serviços Selecionados</span>
                <div className="space-y-1">
                    {appointment.services.map((s: string, i: number) => (
                        <div key={i} className="text-xs font-bold text-gray-600 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
                            {s}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Buttons Ecosystem */}
        <div className="w-full space-y-4 pt-4">
            <button 
                onClick={handleAddToCalendar}
                className="w-full bg-blue-900 text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
            >
                <CalendarPlus size={20} />
                Adicionar à minha Agenda
            </button>

            <button 
                onClick={handleOpenMaps}
                className="w-full bg-white border border-gray-100 text-gray-800 font-black py-4.5 rounded-2xl shadow-sm active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
            >
                <MapPin size={20} className="text-blue-900" />
                Como Chegar (GPS)
            </button>

            <button 
                onClick={() => navigate('/booking')}
                className="w-full bg-gray-50 text-gray-500 font-bold py-4.5 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3"
            >
                <RotateCcw size={18} />
                Fazer outro agendamento
            </button>
        </div>

        <div className="pt-8 pb-12">
            <button 
                onClick={() => navigate('/booking')}
                className="flex items-center gap-2 text-gray-300 font-black uppercase tracking-widest text-[10px] active:text-blue-900 transition-colors"
            >
                <Home size={14} />
                Voltar ao Início
            </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
