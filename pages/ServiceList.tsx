
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, ChevronRight, Loader2, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../supabase';

const ServiceList: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await db.services().select('*').order('name');
      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/menu')}><ChevronLeft size={24} /></button>
          <h1 className="text-lg font-medium">Serviços</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
           <div className="flex flex-col items-center justify-center p-20 gap-3 text-blue-900/30">
             <Loader2 className="animate-spin" size={32} />
             <span className="text-[10px] font-black uppercase tracking-widest">Buscando Serviços...</span>
           </div>
        ) : services.length === 0 ? (
            <div className="p-10 text-center text-gray-400 font-bold uppercase text-xs">Nenhum serviço cadastrado.</div>
        ) : (
          <div className="divide-y divide-gray-100 bg-white">
            {services.map((s) => (
              <button key={s.id} onClick={() => navigate('/services/new', { state: { service: s } })} className="w-full p-5 flex justify-between items-center active:bg-gray-50 text-left group">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Scissors size={20} /></div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-sm">{s.name}</h3>
                    <p className="text-blue-900 text-xs font-black">R$ {s.price.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-300" size={20} />
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => navigate('/services/new')} className="fixed bottom-24 right-6 bg-[#1e3a8a] text-white p-4.5 rounded-2xl shadow-2xl active:scale-95 transition-transform z-50">
        <Plus size={32} />
      </button>
    </div>
  );
};

export default ServiceList;
