
import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, Loader2, CalendarX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../supabase';

const ClientHistory: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 1. Buscar nome do cliente
            const { data: client } = await db.clients().select('name').eq('id', id).single();
            if (client) setClientName(client.name);

            // 2. Buscar agendamentos deste cliente ("clientId")
            // Ordenando por data decrescente (mais recente primeiro)
            const { data: appointments } = await db.appointments()
                .select('*')
                .eq('clientId', id)
                .order('date', { ascending: false })
                .order('time', { ascending: false });
            
            if (appointments) setHistory(appointments);
        } catch (err) {
            console.error('Erro ao buscar histórico:', err);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [id]);

  const handleViewDetails = (item: any) => {
    navigate(`/appointment-checkout/${item.id}`); // Redireciona para o checkout existente para ver detalhes
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <div>
            <h1 className="text-lg font-medium leading-none">Histórico</h1>
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mt-1">{clientName || 'Carregando...'}</p>
        </div>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" size={32} /></div>
        ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-gray-400 gap-2">
                <CalendarX size={48} className="text-gray-300" />
                <p className="text-xs font-bold uppercase">Nenhum agendamento encontrado.</p>
            </div>
        ) : (
            history.map((h) => (
            <div key={h.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Card Header */}
                <div className="px-5 py-4 flex justify-between items-start border-b border-gray-50 bg-white">
                    <div>
                        <span className="text-[11px] font-bold text-gray-800 block mb-0.5">Profissional:</span>
                        <span className="text-[13px] font-bold text-gray-900 uppercase">{h.professionalName}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                </div>

                {/* Timeline Body */}
                <div className="px-5 py-6 flex gap-6">
                    <div className="flex flex-col items-center">
                        {/* Top Circle */}
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white z-10 shrink-0" />
                        
                        {/* Connecting Line */}
                        <div className="w-[3px] flex-1 bg-green-500 relative">
                            {/* Service Bullets */}
                            <div className="absolute top-[25px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-300 border border-white" />
                        </div>

                        {/* Checkmark Circle */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                            h.status === 'Atendimento Realizado' ? 'bg-green-500' : 
                            h.status === 'Confirmado' ? 'bg-blue-500' : 'bg-gray-300'
                        }`}>
                            <CheckCircle2 className="text-white" size={14} strokeWidth={3} />
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h4 className="text-gray-900 font-medium text-lg tracking-tight flex items-center gap-2">
                                {h.time} 
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-black ${
                                    h.status === 'Atendimento Realizado' ? 'bg-green-100 text-green-700' : 
                                    h.status === 'Cancelaram' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                                }`}>{h.status}</span>
                            </h4>
                        </div>
                        
                        <div className="space-y-1">
                            {h.services && h.services.map((s: string, idx: number) => (
                                <span key={idx} className="block text-gray-500 text-sm font-medium leading-none">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 bg-gray-50/50 flex justify-between items-center border-t border-gray-100">
                    <button 
                    onClick={() => handleViewDetails(h)}
                    className="bg-[#6ad18a] hover:bg-[#5bc079] text-white px-9 py-2 rounded-full font-bold text-[13px] shadow-sm transition-colors active:scale-95"
                    >
                        Ver Detalhes
                    </button>
                    {h.totalValue > 0 && (
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-medium mb-0.5 italic">Valor Total:</p>
                            <p className="text-[14px] font-black text-blue-900">R$ {h.totalValue.toFixed(2).replace('.', ',')}</p>
                        </div>
                    )}
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ClientHistory;
