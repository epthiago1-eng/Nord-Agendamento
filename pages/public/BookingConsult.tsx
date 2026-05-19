
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Phone, Search, Calendar, Clock, Scissors, User, Loader2, Trash2, Edit2, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAppointmentsByPhone, updateAppointment, cancelAppointmentPublic, Appointment, getSettings } from '../../data/agendaData';
import { addNotification } from '../../data/notifications';
import { db } from '../../supabase';

const BookingConsult: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [futureAppointments, setFutureAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png");
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);

  useEffect(() => {
    getSettings().then(s => {
        if (s.logoUrl) setLogoUrl(s.logoUrl);
    });
  }, []);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').substring(0, 11);
    if (numbers.length > 10) return numbers.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    if (numbers.length > 6) return numbers.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    if (numbers.length > 2) return numbers.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    if (numbers.length > 0) return numbers.replace(/^(\d{0,2})/, '($1');
    return numbers;
  };

  const handleSearch = async () => {
    if (!phone) return;
    setLoading(true);
    try {
        const allAppointments = await getAppointmentsByPhone(phone);
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        const future = allAppointments.filter(a => a.date >= todayStr && !['Cancelaram', 'Atendimento Realizado'].includes(a.status));
        const past = allAppointments.filter(a => a.date < todayStr || ['Cancelaram', 'Atendimento Realizado'].includes(a.status));

        setFutureAppointments(future);
        setPastAppointments(past);
        setHasSearched(true);
    } catch (err) {
        console.error("Error searching appointments:", err);
        alert("Erro ao buscar. Verifique sua conexão.");
    } finally {
        setLoading(false);
    }
  };

  const handleCancel = async (apt: Appointment) => {
    setAppointmentToCancel(apt);
  };

  const confirmCancellation = async () => {
    if (!appointmentToCancel) return;
    const apt = appointmentToCancel;
    setAppointmentToCancel(null);
    
    setProcessingId(apt.id);
    try {
        // Usa a função específica de cancelamento público que valida pelo telefone
        await cancelAppointmentPublic(apt.id, phone);
        
        await addNotification({
            type: 'AGENDAMENTO',
            title: '❌ Agendamento Cancelado pelo Cliente',
            message: `O cliente ${apt.clientName} cancelou o horário de ${apt.date.split('-').reverse().join('/')} às ${apt.time}.`,
            link: '/agenda',
            recipient_pro_id: apt.professionalId
        });

        alert('Agendamento cancelado com sucesso.');
        // Pequeno delay para garantir que a transação foi commitada e replicada (se houver lag)
        setTimeout(() => {
            handleSearch(); 
        }, 500);
    } catch (err: any) {
        console.error(err);
        alert('Erro ao cancelar: ' + (err.message || 'Verifique se o telefone informado é o mesmo do agendamento.'));
    } finally {
        setProcessingId(null);
    }
  };

  const handleEdit = async (apt: Appointment) => {
    setLoading(true);
    try {
        // Recupera os objetos completos dos serviços pelo nome para preencher o schedule
        const { data: allServices } = await db.services().select('*');
        const servicesObjects = allServices?.filter(s => apt.services.includes(s.name)) || [];

        if (servicesObjects.length === 0) {
            alert('Erro ao carregar serviços do agendamento. Tente cancelar e agendar novamente.');
            return;
        }

        navigate('/booking/schedule', { 
            state: { 
                selectedServices: servicesObjects,
                editingAppointment: apt // Passa o agendamento original para edição
            } 
        });
    } catch (err) {
        console.error(err);
        alert('Erro ao carregar dados para edição.');
    } finally {
        setLoading(false);
    }
  };

  const renderAppointmentCard = (apt: Appointment, isFuture: boolean) => (
    <div key={apt.id} className={`bg-white p-5 rounded-3xl border ${isFuture ? 'border-blue-100 shadow-md' : 'border-gray-100 opacity-80'} space-y-3 relative overflow-hidden`}>
        {processingId === apt.id && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                <Loader2 className="animate-spin text-black" />
            </div>
        )}
        <div className="flex justify-between items-start">
            <div>
                <div className={`flex items-center gap-2 ${isFuture ? 'text-blue-900' : 'text-gray-600'} mb-1`}>
                    <Calendar size={14} />
                    <span className="text-sm font-black">{new Date(apt.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={14} />
                    <span className="text-xs font-bold uppercase">{apt.time}</span>
                </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                apt.status === 'Confirmado' ? 'bg-green-50 text-green-600' : 
                apt.status === 'Cancelaram' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'
            }`}>
                {apt.status}
            </span>
        </div>
        
        <div className="pt-3 border-t border-gray-50 space-y-2">
            <div className="flex items-center gap-3">
                <div className="bg-gray-50 p-2 rounded-lg text-gray-400"><Scissors size={14} /></div>
                <p className="text-xs font-bold text-gray-700">{apt.services.join(' + ')}</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="bg-gray-50 p-2 rounded-lg text-gray-400"><User size={14} /></div>
                <p className="text-xs font-medium text-gray-500 italic">Barbeiro: {apt.professionalName}</p>
            </div>
        </div>

        {/* Actions - Only for Future Appointments */}
        {isFuture && (
            <div className="pt-3 flex gap-2">
                <button 
                    onClick={() => handleEdit(apt)}
                    className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Edit2 size={14} /> Reagendar
                </button>
                <button 
                    onClick={() => handleCancel(apt)}
                    className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Trash2 size={14} /> Cancelar
                </button>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfaff] flex flex-col font-sans">
      <div className="bg-black h-16 w-full relative shrink-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl z-10 translate-y-[-20%]">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
        </div>
      </div>

      <div className="mt-20 px-4 space-y-6 flex-1 overflow-y-auto pb-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-900 font-bold text-sm">
            <ChevronLeft size={20} />
            Consultar Meus Horários
        </button>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-5">
            <p className="text-center text-gray-500 text-xs font-medium px-4 leading-relaxed">
                Digite seu telefone para localizar todos os seus agendamentos ativos em nossa barbearia.
            </p>

            <div className="space-y-4">
                <div className="relative">
                    <input 
                        type="tel" 
                        value={phone}
                        onChange={e => setPhone(formatPhone(e.target.value))}
                        placeholder="(00) 0 0000-0000" 
                        maxLength={15}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-black text-gray-800 font-bold"
                    />
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                </div>

                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full bg-black text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                    Buscar Agendamentos
                </button>
            </div>
        </div>

        {hasSearched && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Agendamentos Futuros */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Calendar size={12} /> Próximos Agendamentos
                    </h3>
                    {futureAppointments.length > 0 ? (
                        futureAppointments.map(apt => renderAppointmentCard(apt, true))
                    ) : (
                        <p className="text-center text-gray-400 text-xs italic py-4">Nenhum agendamento futuro.</p>
                    )}
                </div>

                {/* Histórico */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <History size={12} /> Histórico
                    </h3>
                    {pastAppointments.length > 0 ? (
                        pastAppointments.map(apt => renderAppointmentCard(apt, false))
                    ) : (
                        <p className="text-center text-gray-400 text-xs italic py-4">Nenhum histórico encontrado.</p>
                    )}
                </div>

            </div>
        )}
      </div>

      {appointmentToCancel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Cancelar Agendamento?</h3>
              <p className="text-gray-600 font-medium leading-relaxed">
                Tem certeza que deseja cancelar seu horário de {appointmentToCancel.date.split('-').reverse().join('/')} às {appointmentToCancel.time}?
              </p>
              <div className="flex gap-3 w-full mt-2">
                <button 
                  onClick={() => setAppointmentToCancel(null)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl active:scale-95 transition-transform"
                >
                  Não, manter
                </button>
                <button 
                  onClick={confirmCancellation}
                  className="flex-1 bg-red-600 text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform"
                >
                  Sim, cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingConsult;
