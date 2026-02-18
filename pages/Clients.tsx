
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Info, Loader2, UserPlus, X, Save, Calendar, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../supabase';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para Modal de Novo Cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    birth_date: '', 
    // Removed observation as it doesn't exist in DB
  });
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      let query = db.clients().select('*').order('name');
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      const { data, error } = await query.limit(50);
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchClients(); }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSaveClient = async () => {
    if (!newClient.name || !newClient.phone) {
        alert('Nome e Telefone são obrigatórios.');
        return;
    }
    setSaving(true);
    try {
        const { error } = await db.clients().insert({
          name: newClient.name,
          phone: newClient.phone,
          email: newClient.email || null,
          birth_date: newClient.birth_date || null // Usando snake_case correto
        });
        if (error) throw error;
        
        alert('Cliente cadastrado com sucesso!');
        setIsModalOpen(false);
        setNewClient({ name: '', phone: '', email: '', birth_date: '' });
        fetchClients();
    } catch (err: any) {
        console.error(err);
        alert('Erro ao cadastrar cliente: ' + err.message);
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff] relative">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/menu')}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Clientes</h1>
      </header>

      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Buscar por nome..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 px-4 pl-12 outline-none shadow-sm focus:ring-2 focus:ring-blue-100 text-sm font-medium"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" /></div>
          ) : clients.length === 0 ? (
            <div className="text-center p-10 text-gray-400 italic text-xs">Nenhum cliente encontrado.</div>
          ) : (
            <div className="space-y-3">
                {clients.map((client) => (
                <button key={client.id} onClick={() => navigate(`/client-history/${client.id}`)} className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-50 shadow-sm active:scale-[0.98]">
                    <div className="text-left">
                        <h3 className="text-gray-900 font-bold text-sm">{client.name}</h3>
                        <p className="text-gray-400 text-xs font-medium mt-0.5">{client.phone}</p>
                    </div>
                    <ChevronRight className="text-gray-300" size={20} />
                </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-24 right-6 z-50">
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1e3a8a] text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-transform ring-4 ring-blue-50/50"
        >
            <UserPlus size={32} />
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-xs">Novo Cliente</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Nome *</label>
                        <input 
                            type="text" 
                            value={newClient.name}
                            onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-800 font-bold"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Telefone *</label>
                        <input 
                            type="tel" 
                            value={newClient.phone}
                            onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-800 font-bold"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-1 block">Aniversário (Opcional)</label>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={newClient.birth_date}
                                    onChange={(e) => setNewClient({...newClient, birth_date: e.target.value})}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-800 font-medium"
                                />
                                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleSaveClient}
                    disabled={saving}
                    className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar Cliente</>}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
