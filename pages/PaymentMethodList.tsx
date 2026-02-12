
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, ChevronRight, Trash2, Loader2, CreditCard, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../supabase';

const PaymentMethodList: React.FC = () => {
  const navigate = useNavigate();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const fetchMethods = async () => {
    setLoading(true);
    try {
        const { data, error } = await db.paymentMethods().select('*').order('name');
        if (error) throw error;
        setMethods(data || []);
    } catch (err) {
        console.error('Erro ao buscar formas de pagamento:', err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleToggleSwipe = (id: string) => {
    setSwipedId(swipedId === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta forma de pagamento?')) {
      try {
        const { error } = await db.paymentMethods().delete().eq('id', id);
        if(error) throw error;
        
        setMethods(prev => prev.filter(m => m.id !== id));
        setSwipedId(null);
      } catch (err) {
        alert('Erro ao excluir item.');
      }
    }
  };

  const handleEdit = (method: any) => {
    navigate(`/payment-methods/edit/${method.id}`, { state: { method } });
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/menu')} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Formas de Pagamento</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
           <div className="flex flex-col items-center justify-center p-20 gap-3 text-blue-900/30">
             <Loader2 className="animate-spin" size={32} />
             <span className="text-[10px] font-black uppercase tracking-widest">Carregando...</span>
           </div>
        ) : (
            <div className="bg-white divide-y divide-gray-100">
            {methods.length === 0 ? (
                <div className="p-12 text-center text-gray-400 italic flex flex-col items-center gap-2">
                    <CreditCard size={32} className="opacity-20" />
                    Nenhuma forma de pagamento cadastrada.
                </div>
            ) : methods.map((method) => (
                <div key={method.id} className="relative overflow-hidden bg-white min-h-[70px]">
                {/* Delete Action (Revealed behind) */}
                <div 
                    className={`absolute right-0 top-0 bottom-0 flex transition-transform duration-300 ease-in-out ${
                    swipedId === method.id ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    <button 
                    onClick={() => handleDelete(method.id)}
                    className="w-24 bg-[#ef4444] text-white flex flex-col items-center justify-center gap-1 active:opacity-80"
                    >
                    <Trash2 size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Excluir</span>
                    </button>
                </div>

                {/* Card Content */}
                <div 
                    onClick={() => handleEdit(method)}
                    onContextMenu={(e) => { e.preventDefault(); handleToggleSwipe(method.id); }}
                    className={`p-5 flex justify-between items-center bg-white cursor-pointer active:bg-gray-50 transition-transform duration-300 ease-in-out ${
                    swipedId === method.id ? '-translate-x-24' : 'translate-x-0'
                    }`}
                >
                    <div className="flex flex-col">
                        <span className="text-gray-800 font-bold text-sm tracking-tight">{method.name}</span>
                        {method.enable_tax && (
                             <div className="flex items-center gap-1 mt-1 text-red-500">
                                <Percent size={10} strokeWidth={3} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                    Taxa: {String(method.tax_rate || 0).replace('.', ',')}%
                                </span>
                             </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <ChevronRight className="text-gray-300" size={20} />
                    </div>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => navigate('/payment-methods/new')}
        className="fixed bottom-24 right-6 bg-[#1e2a4a] text-white p-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform z-50"
      >
        <Plus size={32} />
      </button>
    </div>
  );
};

export default PaymentMethodList;
