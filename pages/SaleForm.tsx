
import React from 'react';
import { ChevronLeft, Search, UserPlus, List, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const SaleForm: React.FC = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();

  const getTitle = () => {
    switch(type) {
        case 'products': return 'Venda de Produtos';
        case 'packages': return 'Venda de Pacotes';
        case 'subscriptions': return 'Venda de Planos de Assinatura';
        default: return 'Venda';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
            <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
            <h1 className="text-lg font-medium">{getTitle()}</h1>
        </div>
        <List size={22} />
      </header>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Profissional</label>
          <div className="relative">
            <input type="text" placeholder="Buscar..." className="w-full border border-gray-300 rounded-lg py-3 px-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Cliente</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
                <input type="text" placeholder="Buscar..." className="w-full border border-gray-300 rounded-lg py-3 px-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500" />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <button className="bg-white border border-gray-300 p-2.5 rounded-lg text-blue-900"><UserPlus size={24} /></button>
          </div>
        </div>

        {type === 'products' ? (
            <>
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Produtos</label>
                    <div className="relative">
                        <input type="text" placeholder="Buscar..." className="w-full border border-gray-300 rounded-lg py-3 px-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500" />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Quantidade</label>
                    <div className="flex gap-2 items-center">
                        <input type="number" defaultValue="0" className="flex-1 border border-gray-300 rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500" />
                        <button className="bg-blue-900 text-white p-2.5 rounded-lg"><Plus size={24} /></button>
                    </div>
                </div>
            </>
        ) : (
            <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">{type === 'packages' ? 'Pacotes' : 'Plano de Assinatura'}</label>
                <div className="relative">
                    <input type="text" placeholder="Buscar..." className="w-full border border-gray-300 rounded-lg py-3 px-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500" />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
            </div>
        )}

        <div className="py-6 border-b border-gray-100">
            <h3 className="text-center font-bold text-gray-800 text-lg mb-4">Lista de {type === 'products' ? 'Produtos' : 'Itens'}</h3>
            <p className="text-center text-gray-400 italic text-sm">Não há itens adicionados.</p>
            <p className="text-center text-green-600 font-bold mt-4">Valor total: R$ 0,00</p>
        </div>

        <div className="py-6">
            <h3 className="text-center font-bold text-gray-800 text-lg mb-4">Lançamento Financeiro</h3>
            <p className="text-center text-gray-400 italic text-sm">Não há registro financeiro.</p>
            <p className="text-center text-green-600 font-bold mt-4">Valor total: R$ 0,00</p>
        </div>

        <div className="space-y-3 pb-8">
            <button className="w-full bg-green-700 text-white font-bold py-4 rounded-lg shadow-md active:bg-green-800">
                Lançar Financeiro
            </button>
            <button className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-lg shadow-md active:bg-blue-900">
                Finalizar Venda
            </button>
        </div>
      </div>
    </div>
  );
};

export default SaleForm;
