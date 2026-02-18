
import React, { useState } from 'react';
import { ChevronLeft, Phone, Search, Calendar, Clock, Scissors, User, Loader2, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAppointmentsByPhone, updateAppointment, Appointment } from '../../data/agendaData';
import { addNotification } from '../../data/notifications';
import { db } from '../../supabase';

const BookingConsult: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<Appointment[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!phone) return;
    setLoading(true);
    try {
        const found = await getAppointmentsByPhone(phone);
        // Filtrar apenas agendamentos futuros e ativos
        const active = found.filter(a => 
            a.status !== 'Cancelaram' && 
            a.status !== 'Atendimento Realizado'
        );
        setResults(active);
        setHasSearched(true);
    } catch (err) {
        console.error("Error searching appointments:", err);
        alert("Erro ao buscar. Verifique sua conexão.");
    } finally {
        setLoading(false);
    }
  };

  const handleCancel = async (apt: Appointment) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    
    setProcessingId(apt.id);
    try {
        await updateAppointment(apt.id, { status: 'Cancelaram' });
        
        await addNotification({
            type: 'AGENDAMENTO',
            title: '❌ Agendamento Cancelado pelo Cliente',
            message: `O cliente ${apt.clientName} cancelou o horário de ${apt.date.split('-').reverse().join('/')} às ${apt.time}.`,
            link: '/agenda',
            recipient_pro_id: apt.professionalId
        });

        alert('Agendamento cancelado com sucesso.');
        handleSearch(); // Recarrega a lista
    } catch (err) {
        alert('Erro ao cancelar.');
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

  return (
    <div className="min-h-screen bg-[#fcfaff] flex flex-col font-sans">
      <div className="bg-black h-16 w-full relative shrink-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl z-10 translate-y-[-20%]">
          <img src="https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png" alt="Nord Barbershop" className="w-full h-full object-contain p-1" />
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
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(00) 0 0000-0000" 
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
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                    {results && results.length > 0 ? 'Seus Agendamentos' : 'Nenhum agendamento encontrado'}
                </h3>
                
                {results && results.map((apt) => (
                    <div key={apt.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 relative overflow-hidden">
                        {processingId === apt.id && (
                            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                                <Loader2 className="animate-spin text-black" />
                            </div>
                        )}
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 text-blue-900 mb-1">
                                    <Calendar size={14} />
                                    <span className="text-sm font-black">{new Date(apt.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Clock size={14} />
                                    <span className="text-xs font-bold uppercase">{apt.time}</span>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                apt.status === 'Confirmado' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
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

                        {/* Actions */}
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
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default BookingConsult;
