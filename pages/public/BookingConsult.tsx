
import React, { useState } from 'react';
import { ChevronLeft, Phone, Search, Calendar, Clock, Scissors, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAppointmentsByPhone, Appointment } from '../../data/agendaData';

const BookingConsult: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<Appointment[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Fix: handleSearch must be async to await the getAppointmentsByPhone promise
  const handleSearch = async () => {
    if (!phone) return;
    try {
        const found = await getAppointmentsByPhone(phone);
        setResults(found);
        setHasSearched(true);
    } catch (err) {
        console.error("Error searching appointments:", err);
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
                    className="w-full bg-black text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                    <Search size={16} />
                    Buscar Agendamentos
                </button>
            </div>
        </div>

        {hasSearched && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Resultados encontrados</h3>
                
                {results && results.length > 0 ? (
                    results.map((apt) => (
                        <div key={apt.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
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
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 px-8 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-gray-400 text-sm font-medium">Nenhum agendamento futuro encontrado para este número.</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default BookingConsult;
