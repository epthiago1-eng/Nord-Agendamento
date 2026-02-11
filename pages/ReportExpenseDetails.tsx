
import React, { useState } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, TrendingDown, Lightbulb, UserCheck, Settings, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockExpenseCategories = [
  {
    id: 'c1',
    name: 'Contas Fixas',
    icon: Lightbulb,
    total: 1200.00,
    items: [
      { id: 'e1', desc: 'Conta de Luz', date: '05/02', val: 450.00 },
      { id: 'e2', desc: 'Aluguel Sala', date: '01/02', val: 750.00 },
    ]
  },
  {
    id: 'c2',
    name: 'Comissões Profissionais',
    icon: UserCheck,
    total: 2450.00,
    items: [
      { id: 'e3', desc: 'Comissão Felipe', date: 'Fev', val: 1200.00 },
      { id: 'e4', desc: 'Comissão Diego', date: 'Fev', val: 1250.00 },
    ]
  },
  {
    id: 'c3',
    name: 'Despesas Gerais',
    icon: Settings,
    total: 550.00,
    items: [
      { id: 'e5', desc: 'Material de Limpeza', date: '10/02', val: 150.00 },
      { id: 'e6', desc: 'Café e Insumos', date: '12/02', val: 400.00 },
    ]
  }
];

const ReportExpenseDetails: React.FC = () => {
  const navigate = useNavigate();
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Relatório de Despesas</h1>
      </header>

      <div className="p-4 space-y-4 overflow-y-auto pb-24">
        <div className="flex justify-center mb-4">
            <button className="bg-white px-5 py-2 rounded-full border border-gray-100 text-xs font-bold text-blue-900 shadow-sm uppercase tracking-wider">
                Fevereiro 2026
            </button>
        </div>

        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex flex-col items-center mb-6">
            <TrendingDown className="text-red-500 mb-2" size={32} />
            <span className="text-red-800 text-[11px] font-bold uppercase tracking-widest">Gasto Total do Mês</span>
            <span className="text-3xl font-black text-red-600">R$ 4.200,00</span>
        </div>

        {mockExpenseCategories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
            <div 
              onClick={() => setExpandedCatId(expandedCatId === cat.id ? null : cat.id)}
              className="p-5 flex items-center justify-between cursor-pointer active:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600">
                  <cat.icon size={22} />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold text-sm tracking-tight">{cat.name}</h3>
                  <p className="text-gray-400 text-[10px] font-bold uppercase">{cat.items.length} lançamentos</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-500 font-black text-sm">R$ {cat.total.toFixed(2).replace('.', ',')}</span>
                <div className="text-gray-300">
                    {expandedCatId === cat.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>

            {expandedCatId === cat.id && (
              <div className="bg-gray-50/50 px-5 pb-5 pt-1 border-t border-gray-50 space-y-3">
                {cat.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                        <FileText size={14} className="text-gray-300" />
                        <div>
                            <p className="text-gray-700 font-bold text-xs">{item.desc}</p>
                            <p className="text-gray-400 text-[10px]">{item.date}</p>
                        </div>
                    </div>
                    <span className="text-gray-900 font-bold text-xs">R$ {item.val.toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportExpenseDetails;
