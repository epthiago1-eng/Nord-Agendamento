
import React from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, Package, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SalesHome: React.FC = () => {
  const navigate = useNavigate();

  const options = [
    { label: 'Vender Produtos', icon: ShoppingBag, type: 'products' },
    { label: 'Vender Pacotes', icon: Package, type: 'packages' },
    { label: 'Vender Planos de Assinatura', icon: Star, type: 'subscriptions' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Vendas</h1>
      </header>

      <div className="p-4 space-y-3">
        {options.map((opt) => (
          <button 
            key={opt.type}
            onClick={() => navigate(`/sales/new/${opt.type}`)}
            className="w-full bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-gray-600">
                <opt.icon size={22} />
              </div>
              <span className="text-gray-700 font-medium">{opt.label}</span>
            </div>
            <ChevronRight className="text-gray-300" size={20} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SalesHome;
