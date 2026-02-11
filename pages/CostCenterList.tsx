
import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CostCenterList: React.FC = () => {
  const navigate = useNavigate();
  const centers = ['Receitas', 'Comissão', 'Despesas Diversas'];

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Centro de Custo</h1>
      </header>

      <div className="bg-white divide-y divide-gray-50">
        {centers.map((c, idx) => (
          <div key={idx} className="p-5 flex justify-between items-center active:bg-gray-50">
            <span className="text-gray-800 font-medium">{c}</span>
            <ChevronRight className="text-gray-300" size={20} />
          </div>
        ))}
      </div>

      <button 
        onClick={() => navigate('/cost-centers/new')}
        className="fixed bottom-24 right-6 bg-blue-900 text-white p-4 rounded-xl shadow-xl"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default CostCenterList;
