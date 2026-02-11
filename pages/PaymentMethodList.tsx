
import React, { useState } from 'react';
import { ChevronLeft, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PaymentMethod {
  id: string;
  name: string;
  enableTax: boolean;
  taxValue: string;
}

const initialMethods: PaymentMethod[] = [
  { id: '1', name: 'Dinheiro', enableTax: false, taxValue: '' },
  { id: '2', name: 'Pix', enableTax: false, taxValue: '' },
  { id: '3', name: 'Cartão Crédito', enableTax: true, taxValue: '2.5' },
  { id: '4', name: 'Cartão Débito', enableTax: true, taxValue: '1.2' },
];

const PaymentMethodList: React.FC = () => {
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const handleToggleSwipe = (id: string) => {
    setSwipedId(swipedId === id ? null : id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir esta forma de pagamento?')) {
      setMethods(prev => prev.filter(m => m.id !== id));
      setSwipedId(null);
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    navigate(`/payment-methods/edit/${method.id}`, { state: { method } });
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate('/menu')} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Formas de Pagamento</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="bg-white divide-y divide-gray-100">
          {methods.map((method) => (
            <div key={method.id} className="relative overflow-hidden bg-white min-h-[60px]">
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
                <span className="text-gray-800 font-medium text-base tracking-tight">{method.name}</span>
                <div className="flex items-center gap-2">
                    {method.enableTax && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                            Taxa {method.taxValue}%
                        </span>
                    )}
                    <ChevronRight className="text-gray-300" size={20} />
                </div>
              </div>
            </div>
          ))}

          {methods.length === 0 && (
            <div className="p-12 text-center text-gray-400 italic">
              Nenhuma forma de pagamento cadastrada.
            </div>
          )}
        </div>
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
