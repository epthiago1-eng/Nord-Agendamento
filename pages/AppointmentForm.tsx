
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Search, UserPlus, X, Check, Scissors, 
  UserCheck, Mail, Loader2, AlertTriangle, Clock, Calendar, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkAvailability, saveAppointment } from '../data/agendaData';
import { addNotification } from '../data/notifications';
import { db } from '../supabase';

const AppointmentForm: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || 'ADMIN';
  
  // Listas vindas do banco de dados
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [professionalsList, setProfessionalsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de Seleção e Busca
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedProId, setSelectedProId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estado do Modal de Cadastro Rápido
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    birth_date: ''
    // Removido observation
  });

  // Formatação segura YYYY-MM-DD
  const formatDateSafe = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    date: formatDateSafe(new Date()),
    time: '10:00',
    status: 'Confirmado',
    observation: ''
  });

  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Carregar dados iniciais do Supabase
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: pros } = await db.professionals().select('*').eq('status', 'Ativo');
            if (pros) {
                setProfessionalsList(pros);
                const userProId = localStorage.getItem('user_pro_id');
                if (userRole === 'COLLABORATOR' && userProId) {
                    setSelectedProId(userProId);
                } else if (pros.length > 0) {
                    setSelectedProId(pros[0].id);
                }
            }

            const { data: servs } = await db.services().select('*').order('name');
            if (servs) setServicesList(servs);

            const { data: clis } = await db.clients().select('*').limit(20).order('created_at', { ascending: false });
            if (clis) setClientsList(clis);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [userRole]);

  // Busca dinâmica de clientes
  useEffect(() => {
    if (clientSearch.length > 2) {
        const fetchSearch = async () => {
            const { data } = await db.clients()
                .select('*')
                .ilike('name', `%${clientSearch}%`)
                .limit(10);
            if (data) setClientsList(data);
        };
        fetchSearch();
    }
  }, [clientSearch]);

  const filteredClients = useMemo(() => {
    if (clientSearch.length === 0) return [];
    const searchLower = clientSearch.toLowerCase();
    return clientsList.filter((c: any) => {
      const nameMatch = (c.name || '').toLowerCase().includes(searchLower);
      const phoneMatch = c.phone && c.phone.includes(clientSearch);
      return nameMatch || phoneMatch;
    });
  }, [clientSearch, clientsList]);

  const totalDuration = useMemo(() => 
    selectedServices.reduce((sum, s) => sum + (s.duration || 30), 0)
  , [selectedServices]);

  const totalValue = useMemo(() => 
    selectedServices.reduce((sum, s) => sum + s.price, 0)
  , [selectedServices]);

  const toggleService = (service: any) => {
    setSelectedServices(prev => 
      prev.find(s => s.id === service.id) 
        ? prev.filter(s => s.id !== service.id) 
        : [...prev, service]
    );
  };

  // Verificar disponibilidade quando dados mudam
  useEffect(() => {
    if (selectedProId && formData.date && formData.time && totalDuration > 0) {
        setAvailabilityError(null);
        checkAvailability(selectedProId, formData.date, formData.time, totalDuration)
            .then(result => {
                if (!result.available) setAvailabilityError(result.reason || 'Horário indisponível');
            });
    }
  }, [selectedProId, formData.date, formData.time, totalDuration]);

  const handleQuickAdd = async () => {
    if (!newClient.name || !newClient.phone) {
      alert('Nome e Telefone são campos obrigatórios.');
      return;
    }
    try {
        const { data, error } = await db.clients().insert({
            name: newClient.name,
            phone: newClient.phone,
            email: newClient.email || null,
            birth_date: newClient.birth_date || null // snake_case
        }).select().single();

        if (error) throw error;

        setClientsList(prev => [...prev, data]);
        setSelectedClient(data);
        setIsQuickAddOpen(false);
        setClientSearch('');
        setNewClient({ name: '', phone: '', email: '', birth_date: '' });
    } catch (err: any) {
        console.error(err);
        alert('Erro ao cadastrar cliente: ' + err.message);
    }
  };

  const handleSave = async () => {
    if (!selectedClient) { alert('Selecione um cliente.'); return; }
    if (selectedServices.length === 0) { alert('Selecione pelo menos um serviço.'); return; }
    if (!selectedProId) { alert('Selecione um profissional.'); return; }
    if (availabilityError) { alert(availabilityError); return; }

    setSaving(true);
    try {
        const pro = professionalsList.find(p => p.id === selectedProId);
        
        await saveAppointment({
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            clientPhone: selectedClient.phone,
            professionalId: selectedProId,
            professionalName: pro?.name || 'Desconhecido',
            date: formData.date,
            time: formData.time,
            duration: totalDuration,
            status: formData.status as any,
            services: selectedServices.map(s => s.name),
            observation: formData.observation,
            totalValue: totalValue
        });

        await addNotification({
            type: 'AGENDAMENTO',
            title: 'Novo Agendamento (Painel)',
            message: `Cliente ${selectedClient.name} agendado para ${formData.date.split('-').reverse().join('/')} às ${formData.time}.`,
            link: '/agenda',
            recipient_pro_id: selectedProId
        });

        alert('Agendamento salvo com sucesso!');
        navigate('/agenda');
    } catch (e: any) {
        alert('Erro ao salvar: ' + e.message);
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Novo Agendamento</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-900" size={32} />
        </div>
      ) : (
        <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-32">
            {/* BUSCA DE CLIENTE */}
            <div className="relative">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Cliente</label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                <input 
                    type="text" 
                    value={selectedClient ? selectedClient.name : clientSearch}
                    onChange={(e) => {
                        setClientSearch(e.target.value); 
                        setSelectedClient(null);
                        setShowSuggestions(true);
                    }}
                    placeholder="Nome ou Telefone..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-blue-900 shadow-inner font-bold text-gray-700"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                {selectedClient && (
                    <button onClick={() => setSelectedClient(null)} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400">
                    <X size={18} />
                    </button>
                )}
                </div>
                <button 
                onClick={() => setIsQuickAddOpen(true)}
                className="bg-blue-900 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
                title="Cadastro Rápido"
                >
                <UserPlus size={24} />
                </button>
            </div>

            {showSuggestions && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-14 bg-white border border-gray-100 rounded-2xl shadow-2xl mt-2 z-[100] max-h-60 overflow-y-auto">
                {filteredClients.map((c: any) => (
                    <button 
                    key={c.id}
                    onClick={() => {
                        setSelectedClient(c);
                        setShowSuggestions(false);
                        setClientSearch('');
                    }}
                    className="w-full p-4 flex items-center justify-between hover:bg-blue-50 border-b border-gray-50 last:border-0"
                    >
                    <div className="text-left">
                        <p className="font-bold text-gray-800 text-sm">{c.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{c.phone}</p>
                    </div>
                    </button>
                ))}
                </div>
            )}
            </div>

            {/* SELEÇÃO DE PROFISSIONAL */}
            {userRole === 'ADMIN' && (
            <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Profissional</label>
                <div className="grid grid-cols-3 gap-3">
                {professionalsList.map(p => (
                    <button
                    key={p.id}
                    onClick={() => setSelectedProId(p.id)}
                    className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${
                        selectedProId === p.id 
                        ? 'bg-blue-900 border-blue-900 text-white shadow-lg' 
                        : 'bg-white border-gray-100 text-gray-400'
                    }`}
                    >
                    {p.name}
                    </button>
                ))}
                </div>
            </div>
            )}

            {/* SERVIÇOS */}
            <div className="space-y-3">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Serviços</label>
            <div className="grid grid-cols-1 gap-2">
                {servicesList.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Nenhum serviço cadastrado.</p>
                ) : servicesList.map(s => (
                <button
                    key={s.id}
                    onClick={() => toggleService(s)}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    selectedServices.find(x => x.id === s.id)
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-gray-100'
                    }`}
                >
                    <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedServices.find(x => x.id === s.id) ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Scissors size={18} />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-gray-800">{s.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{s.duration} min • R$ {s.price?.toFixed(2)}</p>
                    </div>
                    </div>
                    {selectedServices.find(x => x.id === s.id) && <Check size={20} className="text-blue-900" />}
                </button>
                ))}
            </div>
            </div>

            {/* DATA E HORA */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Data</label>
                    <input 
                        type="date" 
                        value={formData.date}
                        min={formatDateSafe(new Date())} 
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 outline-none font-bold text-gray-700 text-sm shadow-inner"
                    />
                </div>
                <div>
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Horário</label>
                    <input 
                        type="time" 
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 outline-none font-bold text-gray-700 text-sm shadow-inner"
                    />
                </div>
            </div>

            {/* ALERTA DE CONFLITO */}
            {availabilityError && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 items-center animate-in slide-in-from-top-2">
                    <AlertTriangle className="text-red-500 shrink-0" size={20} />
                    <span className="text-xs font-bold text-red-700">{availabilityError}</span>
                </div>
            )}

            {/* RESUMO */}
            {selectedServices.length > 0 && (
            <div className="bg-[#1e3a8a] text-white p-6 rounded-[2rem] shadow-xl animate-in fade-in slide-in-from-bottom-4">
                <p className="text-blue-200 text-[9px] font-black uppercase tracking-widest mb-3">Resumo do Atendimento</p>
                <div className="flex justify-between items-end">
                <div>
                    <span className="text-2xl font-black">R$ {totalValue.toFixed(2).replace('.', ',')}</span>
                    <p className="text-blue-200 text-[10px] font-bold mt-1 uppercase">{totalDuration} minutos totais</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-blue-200 uppercase">Fim estimado</p>
                    <p className="text-lg font-black">
                    {new Date(new Date(`2026-01-01T${formData.time}`).getTime() + totalDuration * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                </div>
                </div>
            </div>
            )}

            <button 
            onClick={handleSave}
            disabled={saving || !!availabilityError}
            className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[64px]"
            >
                {saving ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
            </button>
        </div>
      )}

      {/* MODAL DE CADASTRO RÁPIDO */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-xs">Cadastro Rápido</h3>
              <button onClick={() => setIsQuickAddOpen(false)} className="text-gray-400 p-1"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3 p-4 bg-blue-50 rounded-3xl border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck size={14} className="text-blue-900" />
                  <span className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Obrigatório</span>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Nome Completo *"
                      value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      className="w-full bg-white border border-blue-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-bold text-gray-700"
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="tel" 
                      placeholder="Telefone / WhatsApp *"
                      value={newClient.phone}
                      onChange={e => setNewClient({...newClient, phone: e.target.value})}
                      className="w-full bg-white border border-blue-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-bold text-gray-700"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-1">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest pl-3">Opcional</p>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="E-mail"
                    value={newClient.email}
                    onChange={e => setNewClient({...newClient, email: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-10 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-medium text-gray-700"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                </div>
                <div className="relative">
                  <input 
                    type="date" 
                    value={newClient.birth_date}
                    onChange={e => setNewClient({...newClient, birth_date: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-10 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-medium text-gray-700"
                  />
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                </div>
              </div>
            </div>

            <button 
              onClick={handleQuickAdd}
              className="w-full bg-blue-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-widest text-xs min-h-[60px]"
            >
              Salvar e Selecionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentForm;
