
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Settings, Calendar as CalendarIcon, Edit3, ShieldCheck, Loader2, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../supabase';

const ProfessionalList: React.FC = () => {
  const navigate = useNavigate();
  const [pros, setPros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const fetchPros = async () => {
    setLoading(true);
    try {
      const { data, error } = await db.professionals().select('*').order('name');
      if (error) throw error;
      setPros(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPros();
  }, []);

  const handleToggleSwipe = (id: string) => {
    setSwipedId(swipedId === id ? null : id);
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/menu')} className="p-1"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Profissionais</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3 text-blue-900/30">
            <Loader2 className="animate-spin" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest">Carregando Equipe...</span>
          </div>
        ) : pros.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 text-gray-300">
                <UserX size={48} />
                <p className="text-sm font-bold uppercase tracking-tighter">Nenhum barbeiro cadastrado</p>
            </div>
        ) : pros.map((pro) => (
          <div key={pro.id} className="relative overflow-hidden border-b border-gray-100 bg-white">
            <div className={`absolute right-0 top-0 bottom-0 flex transition-transform duration-300 ease-in-out ${swipedId === pro.id ? 'translate-x-0' : 'translate-x-full'}`}>
              <button onClick={() => navigate(`/professionals/edit/${pro.id}`, { state: { pro } })} className="w-20 bg-[#ffa500] text-white flex flex-col items-center justify-center gap-1"><Edit3 size={20} /><span className="text-[9px] font-bold uppercase">Editar</span></button>
              <button onClick={() => navigate(`/professionals/services/${pro.id}`)} className="w-20 bg-[#9ca3af] text-white flex flex-col items-center justify-center gap-1"><Settings size={20} /><span className="text-[9px] font-bold uppercase">Serviços</span></button>
              <button onClick={() => navigate(`/professionals/access/${pro.id}`, { state: { pro } })} className="w-20 bg-[#ef4444] text-white flex flex-col items-center justify-center gap-1"><ShieldCheck size={20} /><span className="text-[9px] font-bold uppercase">Acesso</span></button>
            </div>

            <div onClick={() => handleToggleSwipe(pro.id)} className={`p-5 transition-transform duration-300 bg-white cursor-pointer active:bg-gray-50 ${swipedId === pro.id ? '-translate-x-[240px]' : 'translate-x-0'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border-2 border-blue-50">
                    <img src={pro.avatar || `https://ui-avatars.com/api/?name=${pro.name}&background=random`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-bold text-sm tracking-tight">{pro.name}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${pro.status === 'Ativo' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {pro.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/professionals/new')} className="fixed bottom-24 right-6 bg-[#1e2a4a] text-white p-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform z-50">
        <Plus size={32} />
      </button>
    </div>
  );
};

export default ProfessionalList;
