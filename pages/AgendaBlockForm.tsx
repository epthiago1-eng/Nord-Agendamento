
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveBlock } from '../data/agendaData';
import { db } from '../supabase';

const AgendaBlockForm: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || 'ADMIN';
  const userProId = localStorage.getItem('user_pro_id') || '';

  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [conflictError, setConflictError] = useState<{clientName: string, time: string, date: string, duration: number} | null>(null);
  
  // Se for admin, pode escolher. Se colaborador, fixa no próprio ID.
  const [selectedProId, setSelectedProId] = useState(userRole === 'COLLABORATOR' ? userProId : '');

  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '10:00',
    description: ''
  });

  // Carrega profissionais se for Admin
  useEffect(() => {
    if (userRole === 'ADMIN') {
        const fetchPros = async () => {
            const { data: allPros } = await db.professionals().select('*').eq('status', 'Ativo');
            
            // Busca Perfis ADMIN para filtrar
            const { data: adminProfiles } = await db.profiles().select('professional_id').eq('role', 'ADMIN');
            const adminIds = new Set(adminProfiles?.map(p => p.professional_id).filter(Boolean));
            
            if (allPros) {
                // Filtra profissionais que são ADMIN
                const visiblePros = allPros.filter(p => !adminIds.has(p.id));
                setProfessionals(visiblePros);
                
                // Se ainda não selecionou ninguém, seleciona o primeiro
                if (visiblePros.length > 0 && !selectedProId) setSelectedProId(visiblePros[0].id);
            }
        };
        fetchPros();
    }
  }, [userRole]);

  const handleSave = async () => {
    if (!selectedProId) {
        alert('Selecione um profissional.');
        return;
    }

    try {
      const startIso = `${formData.startDate}T${formData.startTime}`;
      const endIso = `${formData.endDate}T${formData.endTime}`;

      const blockStart = new Date(startIso).getTime();
      const blockEnd = new Date(endIso).getTime();

      if (blockEnd <= blockStart) {
        alert('A data/hora final deve ser posterior à data inicial.');
        return;
      }

      setLoading(true);

      // VERIFICAÇÃO DE CONFLITO ROBUSTA
      // 1. Busca agendamentos do dia (ou intervalo) para o profissional
      const { data: appointmentsInRange, error } = await db.appointments()
        .select('date, time, duration, clientName')
        .eq('professionalId', selectedProId) 
        .gte('date', formData.startDate) // Otimização: filtra pelo dia
        .lte('date', formData.endDate);  // Otimização: filtra pelo dia

      if (error) {
          console.error("Erro ao verificar conflitos:", error);
          throw error;
      }

      // 2. Filtra Status no JS para garantir (Supabase as vezes tem quirks com arrays de string)
      const activeAppointments = appointmentsInRange?.filter(a => 
          a.status !== 'Cancelaram' && a.status !== 'Desmarcou'
      ) || [];

      // 3. Verifica colisão de horário exato
      const conflict = activeAppointments.find(apt => {
          // Constrói data do agendamento
          const aptStart = new Date(`${apt.date}T${apt.time}`).getTime();
          // Duração em ms (padrão 30 se nulo)
          const durationMs = (apt.duration || 30) * 60 * 1000;
          const aptEnd = aptStart + durationMs;

          // Lógica de Interseção: (InicioA < FimB) E (FimA > InicioB)
          const hasOverlap = (aptStart < blockEnd) && (aptEnd > blockStart);
          
          if (hasOverlap) {
              console.log("Conflito detectado com:", apt.clientName, apt.time);
          }
          return hasOverlap;
      });

      if (conflict) {
          setConflictError({
              clientName: conflict.clientName,
              time: conflict.time,
              date: conflict.date,
              duration: conflict.duration || 30
          });
          setLoading(false);
          return;
      }

      // Se passou, salva o bloqueio
      await saveBlock({
        professional_id: selectedProId,
        start_at: startIso,
        end_at: endIso,
        description: formData.description || 'Bloqueio de Agenda'
      });

      alert('Agenda bloqueada com sucesso!');
      navigate('/agenda');
    } catch (error: any) {
      console.error(error);
      alert('Erro ao bloquear agenda: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium tracking-tight pr-8">
          Bloqueio de Agenda
        </h1>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pt-8">
        {/* Seletor de Profissional (Apenas Admin) */}
        {userRole === 'ADMIN' && (
            <div>
                <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Profissional</label>
                <div className="relative">
                    <select 
                        value={selectedProId}
                        onChange={(e) => setSelectedProId(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 font-bold appearance-none shadow-sm"
                    >
                        {professionals.map(pro => (
                            <option key={pro.id} value={pro.id}>{pro.name}</option>
                        ))}
                    </select>
                    <ChevronLeft className="absolute right-4 top-1/2 -translate-y-1/2 rotate-[-90deg] text-gray-400 pointer-events-none" size={18} />
                </div>
            </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Início do Bloqueio</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
                <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 font-medium"
                />
            </div>
            <div className="relative w-32">
                <input 
                    type="time" 
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 font-medium"
                />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Fim do Bloqueio</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
                <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 font-medium"
                />
            </div>
            <div className="relative w-32">
                <input 
                    type="time" 
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 font-medium"
                />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Motivo (Opcional)</label>
          <input 
            type="text" 
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="Ex: Almoço, Médico..." 
            className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 font-medium shadow-sm"
          />
        </div>

        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3 items-start">
            <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-orange-700 leading-relaxed">
                O sistema irá verificar automaticamente se existem clientes agendados neste horário. Caso exista conflito, o bloqueio não será permitido.
            </p>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-lg shadow-md active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Bloqueio'}
          </button>
        </div>
      </div>

      {conflictError && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={24} className="text-red-500" />
                        <h3 className="text-red-600 font-black uppercase tracking-widest text-xs">Conflito Detectado</h3>
                    </div>
                    <button onClick={() => setConflictError(null)} className="text-gray-400 p-1 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-3">
                    <p className="text-sm font-bold text-red-800">
                        Não é possível bloquear este horário pois já existe um agendamento.
                    </p>
                    
                    <div className="bg-white p-3 rounded-xl border border-red-100 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                        <p className="text-sm font-black text-gray-800 mb-2">{conflictError.clientName}</p>
                        
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Horário</p>
                        <p className="text-sm font-black text-gray-800">
                            {conflictError.time} - {new Date(new Date(`${conflictError.date}T${conflictError.time}`).getTime() + (conflictError.duration || 30)*60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                </div>

                <button 
                    onClick={() => setConflictError(null)} 
                    className="w-full bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all"
                >
                    Entendi
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default AgendaBlockForm;
