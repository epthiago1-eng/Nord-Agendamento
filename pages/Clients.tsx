
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Info, Loader2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../supabase';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('user_role') || 'ADMIN';

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

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
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

        <div className="flex-1 overflow-y-auto pb-20">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-900" /></div>
          ) : clients.length === 0 ? (
            <div className="text-center p-10 text-gray-400 italic text-xs">Nenhum cliente encontrado.</div>
          ) : (
            <div className="space-y-3">
                {clients.map((client) => (
                <button key={client.id} onClick={() => navigate(`/client-history/${client.id}`)} className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-50 shadow-sm active:scale-[0.98]">
                    <div>
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
    </div>
  );
};

export default Clients;
