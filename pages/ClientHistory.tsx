
import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, Loader2, CalendarX, Edit2, Gift, Users as UsersIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, supabase } from '../supabase';

const ClientHistory: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [allClients, setAllClients] = useState<any[]>([]);
  
  // Modal de edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', observation: '', referred_by: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 1. Buscar dados do cliente
            const { data: clientData } = await db.clients().select('*').eq('id', id).single();
            if (clientData) {
              setClient(clientData);
              setEditForm({
                name: clientData.name,
                phone: clientData.phone,
                observation: clientData.observation || '',
                referred_by: clientData.referred_by || ''
              });
            }

            // Buscar todos os clientes para o select de indicação
            const { data: allClientsData } = await db.clients().select('id, name').neq('id', id).order('name');
            if (allClientsData) setAllClients(allClientsData);

            // 2. Buscar agendamentos deste cliente ("clientId")
            // Ordenando por data decrescente (mais recente primeiro)
            const { data: appointments, error: aptError } = await db.appointments()
                .select('*')
                .or(`clientId.eq.${id},client_id.eq.${id}`)
                .order('appointment_time', { ascending: false });
            
            if (aptError) {
                // Fallback se appointment_time ou client_id falharem
                const { data: all } = await db.appointments().select('*');
                if (all) {
                    const filtered = all.filter(a => a.clientId === id || a.client_id === id);
                    setHistory(filtered.sort((a, b) => {
                        const dateA = a.appointment_time || a.date;
                        const dateB = b.appointment_time || b.date;
                        return dateB.localeCompare(dateA);
                    }));
                }
            } else if (appointments) {
                setHistory(appointments);
            }
        } catch (err) {
            console.error('Erro ao buscar histórico:', err);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [id]);

  const handleSaveEdit = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await db.clients().update({
        name: editForm.name,
        phone: editForm.phone,
        observation: editForm.observation,
        referred_by: editForm.referred_by || null
      }).eq('id', id);
      
      if (error) throw error;
      
      setClient({ ...client, ...editForm });
      setIsEditModalOpen(false);
      alert('Cliente atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      alert('Erro ao atualizar cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetails = (item: any) => {
    navigate(`/appointment-checkout/${item.id}`); // Redireciona para o checkout existente para ver detalhes
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
          <div>
              <h1 className="text-lg font-medium leading-none">Histórico</h1>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mt-1">{client?.name || 'Carregando...'}</p>
          </div>
        </div>
        <button onClick={() => setIsEditModalOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Edit2 size={20} />
        </button>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        {/* Referral Info Card */}
        {client && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                <UsersIcon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Indicações</p>
                <p className="text-2xl font-black text-blue-900">{client.referral_count || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-green-50 p-3 rounded-full text-green-600">
                <Gift size={24} />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cortes Grátis</p>
                <p className="text-2xl font-black text-green-600">{client.free_haircuts_earned || 0}</p>
              </div>
            </div>
          </div>
        )}

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
                        <span className="text-[13px] font-bold text-gray-900 uppercase">{h.professionalName || h.professional_name}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">
                        {h.appointment_time ? new Date(h.appointment_time).toLocaleDateString('pt-BR') : new Date(h.date).toLocaleDateString('pt-BR')}
                    </span>
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
                                {h.appointment_time ? new Date(h.appointment_time).toTimeString().substring(0, 5) : h.time} 
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
      {/* Modal de Edição */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-xs">Editar Cliente</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 p-1">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Nome *</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-800 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Telefone *</label>
                <input 
                  type="tel" 
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-800 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Indicado por</label>
                <select
                  value={editForm.referred_by}
                  onChange={(e) => setEditForm({...editForm, referred_by: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-800 font-medium appearance-none"
                >
                  <option value="">Ninguém (ou não informado)</option>
                  {allClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Observações</label>
                <textarea 
                  value={editForm.observation}
                  onChange={(e) => setEditForm({...editForm, observation: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-800 font-medium resize-none h-24"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveEdit}
              disabled={saving}
              className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientHistory;
