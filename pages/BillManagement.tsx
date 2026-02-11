
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Receipt, AlertCircle, 
  CheckCircle2, Clock, Calendar, MoreVertical, RefreshCw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Bill {
  id: string;
  description: string;
  value?: number;
  dueDate: string;
  status: 'PAID' | 'PENDING';
  recurring: boolean;
  category: string;
}

// Fixed BillCard definition: moved outside and added explicit onClick prop to fix JSX 'key' typing error
const BillCard: React.FC<{ bill: Bill; isOverdue?: boolean; onClick: () => void }> = ({ bill, isOverdue = false, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between group"
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${
        bill.status === 'PAID' ? 'bg-green-50 text-green-600' : 
        isOverdue ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-orange-50 text-orange-600'
      }`}>
        <Receipt size={22} />
      </div>
      <div>
        <h4 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
          {bill.description}
          {bill.recurring && <RefreshCw size={12} className="text-blue-400" />}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{bill.category}</span>
          <span className="text-gray-200 text-[10px]">|</span>
          <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
            Venc: {new Date(bill.dueDate).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
    </div>
    <div className="text-right">
      <p className={`text-base font-black ${bill.status === 'PAID' ? 'text-gray-900' : isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
        {bill.value ? `R$ ${bill.value.toFixed(2).replace('.', ',')}` : '--,---'}
      </p>
      <div className="flex items-center justify-end gap-1 mt-1">
        {bill.status === 'PAID' ? (
          <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter">Liquidado</span>
        ) : isOverdue ? (
          <span className="text-[8px] font-black text-red-600 uppercase tracking-tighter">Atrasado!</span>
        ) : (
          <span className="text-[8px] font-black text-orange-500 uppercase tracking-tighter">Aguardando</span>
        )}
      </div>
    </div>
  </div>
);

const mockBills: Bill[] = [
  { id: '1', description: 'Aluguel do Ponto', value: 2500, dueDate: '2026-02-10', status: 'PAID', recurring: true, category: 'Fixo' },
  { id: '2', description: 'Conta de Energia', dueDate: '2026-02-05', status: 'PENDING', recurring: true, category: 'Variável' },
  { id: '3', description: 'Internet Fibra', value: 120, dueDate: '2026-02-15', status: 'PENDING', recurring: true, category: 'Fixo' },
  { id: '4', description: 'Produtos de Limpeza', value: 85, dueDate: '2026-02-01', status: 'PAID', recurring: false, category: 'Operacional' },
  { id: '5', description: 'Marketing Digital', value: 300, dueDate: '2026-02-03', status: 'PENDING', recurring: true, category: 'Marketing' },
];

const BillManagement: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date(2026, 1)); // Fev 2026
  const today = new Date('2026-02-05'); // Simulação do dia atual

  const billsByStatus = useMemo(() => {
    const overdue: Bill[] = [];
    const pending: Bill[] = [];
    const paid: Bill[] = [];

    mockBills.forEach(bill => {
      const dueDate = new Date(bill.dueDate);
      if (bill.status === 'PAID') {
        paid.push(bill);
      } else if (dueDate < today) {
        overdue.push(bill);
      } else {
        pending.push(bill);
      }
    });

    return { overdue, pending, paid };
  }, [mockBills, today]);

  const changeMonth = (offset: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(selectedMonth.getMonth() + offset);
    setSelectedMonth(newMonth);
  };

  const handleBillClick = (bill: Bill) => {
    navigate(`/bills/edit/${bill.id}`, { state: { bill } });
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/menu')} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight">Contas e Despesas</h1>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Gestão de Fluxo de Caixa</span>
        </div>
        <button className="p-2 bg-blue-800 rounded-xl"><MoreVertical size={20} /></button>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        {/* Month Selector */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronLeft size={20} className="text-blue-900" /></button>
          <div className="text-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-900">
              {selectedMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronRight size={20} className="text-blue-900" /></button>
        </div>

        {/* Resumo da Seção */}
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 p-4 rounded-3xl border border-red-100 text-center">
                <span className="text-[8px] font-black text-red-600 uppercase block mb-1">Atrasadas</span>
                <span className="text-sm font-black text-red-700">{billsByStatus.overdue.length}</span>
            </div>
            <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 text-center">
                <span className="text-[8px] font-black text-orange-600 uppercase block mb-1">Pendentes</span>
                <span className="text-sm font-black text-orange-700">{billsByStatus.pending.length}</span>
            </div>
            <div className="bg-green-50 p-4 rounded-3xl border border-green-100 text-center">
                <span className="text-[8px] font-black text-green-600 uppercase block mb-1">Pagas</span>
                <span className="text-sm font-black text-green-700">{billsByStatus.paid.length}</span>
            </div>
        </div>

        {/* SEÇÃO: ATRASADAS */}
        {billsByStatus.overdue.length > 0 && (
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 text-red-600">
                    <AlertCircle size={18} />
                    <h3 className="text-gray-900 font-black text-[10px] uppercase tracking-[0.2em]">Contas Vencidas</h3>
                </div>
                <div className="space-y-3">
                    {billsByStatus.overdue.map(bill => (
                      <BillCard 
                        key={bill.id} 
                        bill={bill} 
                        isOverdue 
                        onClick={() => handleBillClick(bill)} 
                      />
                    ))}
                </div>
            </div>
        )}

        {/* SEÇÃO: PENDENTES NO MÊS */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-2 text-orange-500">
                <Clock size={18} />
                <h3 className="text-gray-900 font-black text-[10px] uppercase tracking-[0.2em]">A Vencer no Mês</h3>
            </div>
            {billsByStatus.pending.length > 0 ? (
                <div className="space-y-3">
                    {billsByStatus.pending.map(bill => (
                      <BillCard 
                        key={bill.id} 
                        bill={bill} 
                        onClick={() => handleBillClick(bill)} 
                      />
                    ))}
                </div>
            ) : (
                <p className="text-center py-6 text-[10px] text-gray-400 font-bold uppercase border-2 border-dashed border-gray-100 rounded-3xl">Tudo em dia para este período</p>
            )}
        </div>

        {/* SEÇÃO: PAGAS */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-2 text-green-600">
                <CheckCircle2 size={18} />
                <h3 className="text-gray-900 font-black text-[10px] uppercase tracking-[0.2em]">Histórico de Pagas</h3>
            </div>
            <div className="space-y-3">
                {billsByStatus.paid.map(bill => (
                  <BillCard 
                    key={bill.id} 
                    bill={bill} 
                    onClick={() => handleBillClick(bill)} 
                  />
                ))}
            </div>
        </div>

        <div className="h-20" />
      </div>

      <button 
        onClick={() => navigate('/bills/new')}
        className="fixed bottom-24 right-6 bg-[#1e3a8a] text-white p-4.5 rounded-[2rem] shadow-2xl active:scale-90 transition-transform z-50 ring-4 ring-blue-50"
      >
        <Plus size={32} />
      </button>
    </div>
  );
};

export default BillManagement;
