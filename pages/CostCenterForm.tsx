
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CostCenterForm: React.FC = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [clientRel, setClientRel] = useState(false);
  const [supplierRel, setSupplierRel] = useState(true);
  const [proRel, setProRel] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Centro de Custo</h1>
      </header>

      <div className="p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-around items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div 
              onClick={() => setType('income')}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${type === 'income' ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}
            >
              {type === 'income' && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <span className="text-sm font-medium text-gray-700">Receita</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div 
              onClick={() => setType('expense')}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${type === 'expense' ? 'border-red-600 bg-red-600' : 'border-gray-300'}`}
            >
              {type === 'expense' && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <span className="text-sm font-medium text-gray-700">Despesa</span>
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nome</label>
          <input type="text" defaultValue="Despesas Diversas" className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Categoria</label>
          <div className="relative">
            <select className="w-full border border-gray-300 rounded-lg py-3 px-4 appearance-none outline-none focus:ring-2 focus:ring-blue-500">
                <option>Despesas Variáveis</option>
                <option>Despesas Profissionais</option>
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={18} />
          </div>
        </div>

        <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Relacionado ao Cliente</span>
                <button onClick={() => setClientRel(!clientRel)} className={`w-12 h-6 rounded-full relative transition-colors ${clientRel ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${clientRel ? 'translate-x-6' : ''}`} />
                </button>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Relacionado ao Fornecedor</span>
                <button onClick={() => setSupplierRel(!supplierRel)} className={`w-12 h-6 rounded-full relative transition-colors ${supplierRel ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${supplierRel ? 'translate-x-6' : ''}`} />
                </button>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Relacionado ao Profissional</span>
                <button onClick={() => setProRel(!proRel)} className={`w-12 h-6 rounded-full relative transition-colors ${proRel ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${proRel ? 'translate-x-6' : ''}`} />
                </button>
            </div>
        </div>

        <button className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-lg shadow-md mt-6">
          Salvar
        </button>
      </div>
    </div>
  );
};

export default CostCenterForm;
