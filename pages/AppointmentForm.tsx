
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Search, UserPlus, List, Calendar, Clock, 
  ChevronRight, X, User, Check, Scissors, UserCheck, Mail, Fingerprint, Cake
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isSlotBlocked, saveAppointment } from '../data/agendaData';

const STORAGE_CLIENTS_KEY = 'nord_barber_clients_list';

const initialMockClients = [
  { id: '1', name: 'Alan', phone: '(22) 9 9602-9673', email: '', birthDate: '', cpf: '' },
  { id: '2', name: 'Alessandro Freitas', phone: '(22) 9 9607-0063', email: '', birthDate: '', cpf: '' },
  { id: '3', name: 'Alex', phone: '(21) 7926-8484', email: '', birthDate: '', cpf: '' },
  { id: '4', name: 'Igor Apollonio', phone: '(22) 9 9999-8888', email: '', birthDate: '', cpf: '' },
];

const mockServices = [
  { id: 's1', name: 'Corte na Máquina', duration: 45, price: 40 },
  { id: 's2', name: 'Barba', duration: 30, price: 30 },
  { id: 's3', name: 'Sobrancelha', duration: 15, price: 15 },
  { id: 's4', name: 'Corte na Tesoura', duration: 60, price: 55 },
];

const professionals = [
  { id: '1', name: 'Diego' },
  { id: '2', name: 'Felipe' },
  { id: '3', name: 'Ricardo' },
];

const AppointmentForm: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || 'ADMIN';
  
  // Lista de clientes vinda do storage ou mock inicial
  const [clients, setClients] = useState(() => {
    const stored = localStorage.getItem(STORAGE_CLIENTS_KEY);
    return stored ? JSON.parse(stored) : initialMockClients;
  });

  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedServices, setSelectedServices] = useState<typeof mockServices>([]);
  const [selectedProId, setSelectedProId] = useState(userRole === 'COLLABORATOR' ? '2' : '1');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estado do Modal de Cadastro Rápido
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    cpf: ''
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    status: 'Confirmado',
    observation: ''
  });

  const filteredClients = useMemo(() => {
    if (clientSearch.length === 0) return [];
    
    const searchLower = clientSearch.toLowerCase();
    const searchDigits = clientSearch.replace(/\D/g, ''); // Apenas números para busca por telefone

    return clients.filter((c: any) => {
      // Busca por nome
      const nameMatch = c.name.toLowerCase().includes(searchLower);
      
      // Busca por telefone formatado (original)
      const phoneMatchOriginal = c.phone.includes(clientSearch);
      
      // Busca por telefone ignorando formatação
      const clientPhoneDigits = c.phone.replace(/\D/g, '');
      const phoneMatchDigits = searchDigits.length > 0 && clientPhoneDigits.includes(searchDigits);

      return nameMatch || phoneMatchOriginal || phoneMatchDigits;
    });
  }, [clientSearch, clients]);

  const totalDuration = useMemo(() => 
    selectedServices.reduce((sum, s) => sum + s.duration, 0)
  , [selectedServices]);

  const totalValue = useMemo(() => 
    selectedServices.reduce((sum, s) => sum + s.price, 0)
  , [selectedServices]);

  const toggleService = (service: typeof mockServices[0]) => {
    setSelectedServices(prev => 
      prev.find(s => s.id === service.id) 
        ? prev.filter(s => s.id !== service.id) 
        : [...prev, service]
    );
  };

  const handleQuickAdd = () => {
    if (!newClient.name || !newClient.phone) {
      alert('Nome e Telefone são campos obrigatórios.');
      return;
    }

    const createdClient = {
      ...newClient,
      id: Math.random().toString(36).substr(2, 9)
    };

    const updatedClients = [...clients, createdClient];
    setClients(updatedClients);
    localStorage.setItem(STORAGE_CLIENTS_KEY, JSON.stringify(updatedClients));
    
    // Auto-seleciona o cliente recém criado
    setSelectedClient(createdClient);
    setIsQuickAddOpen(false);
    setClientSearch('');
    // Limpa o formulário para o próximo
    setNewClient({ name: '', phone: '', email: '', birthDate: '', cpf: '' });
  };

  // Fix: Added async to handle the promise returned by isSlotBlocked
  const handleSave = async () => {
    if (!selectedClient) {
      alert('Selecione um cliente.');
      return;
    }
    if (selectedServices.length === 0) {
      alert('Selecione pelo menos um serviço.');
      return;
    }

    const pro = professionals.find(p => p.id === selectedProId);
    // Fix: Await the async isSlotBlocked function
    const isBlocked = await isSlotBlocked(selectedProId, formData.date, formData.time, totalDuration);

    if (isBlocked) {
        alert('Erro: Este horário está BLOQUEADO na agenda deste profissional.');
        return;
    }

    saveAppointment({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      professionalId: selectedProId,
      professionalName: pro?.name || 'Desconhecido',
      date: formData.date,
      time: formData.time,
      duration: totalDuration,
      status: formData.status,
      services: selectedServices.map(s => s.name),
      observation: formData.observation
    });

    alert('Agendamento salvo com sucesso!');
    navigate('/agenda');
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

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-32">
        {/* BUSCA DE CLIENTE COM BOTÃO DE CADASTRO RÁPIDO */}
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
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SELEÇÃO DE PROFISSIONAL (Se Admin) */}
        {userRole === 'ADMIN' && (
          <div>
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Profissional</label>
            <div className="grid grid-cols-3 gap-3">
              {professionals.map(p => (
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
            {mockServices.map(s => (
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
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.duration} min • R$ {s.price},00</p>
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
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 outline-none font-bold text-gray-700 text-sm"
                />
            </div>
            <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Horário</label>
                <input 
                    type="time" 
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 outline-none font-bold text-gray-700 text-sm"
                />
            </div>
        </div>

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
          className="w-full bg-green-600 text-white font-black py-4.5 rounded-[2rem] shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm mt-4"
        >
            Confirmar Agendamento
        </button>
      </div>

      {/* MODAL DE CADASTRO RÁPIDO */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-xs">Cadastro Rápido</h3>
              <button onClick={() => setIsQuickAddOpen(false)} className="text-gray-400 p-1"><X size={20} /></button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 no-scrollbar">
              {/* OBRIGATÓRIOS */}
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

              {/* OPCIONAIS */}
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

                <div className="grid grid-cols-1 gap-4">
                  <div className="relative">
                    <input 
                      type="date" 
                      placeholder="Data Nasc."
                      value={newClient.birthDate}
                      onChange={e => setNewClient({...newClient, birthDate: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-10 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-medium text-gray-700"
                    />
                    <Cake className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="CPF"
                      value={newClient.cpf}
                      onChange={e => setNewClient({...newClient, cpf: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-10 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-medium text-gray-700"
                    />
                    <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleQuickAdd}
              className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-widest text-xs"
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
