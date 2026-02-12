import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Receipt, AlertCircle, 
  CheckCircle2, Clock, Loader2, Check, Trash2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { addTransaction } from '../data/transactions';

const BillCard: React.FC<{ 
  bill: any; 
  isOverdue?: boolean; 
  onClick: () => void; 
  onPay: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}> = ({ bill, isOverdue = false, onClick, onPay, onDelete, isDeleting }) => (
  <div 
    onClick={onClick}
    className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all flex items-center justify-between group relative overflow-hidden hover:shadow-md cursor-pointer active:scale-[0.98]"
  >
    <div className="flex items-center gap-4 z-10">
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
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{bill.category || 'Geral'}</span>
          <span className="text-gray-200 text-[10px]">|</span>
          <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
            Venc: {bill.due_date ? new Date(bill.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--'}
          </span>
        </div>
      </div>
    </div>
    <div className="text-right z-20 flex flex-col items-end gap-2 relative">
      <p className={`text-base font-black ${bill.status === 'PAID' ? 'text-gray-900' : isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
        R$ {Number(bill.value || 0).toFixed(2).replace('.', ',')}
      </p>
      
      <div className="flex items-center gap-1">
        <button 
          onClick={(e) => {
            e.stopPropagation(); 
            onDelete(e);
          }}
          disabled={isDeleting}
          className={`p-2.5 rounded-full transition-colors ${
            isDeleting 
              ? 'text-gray-300 bg-gray-50 cursor-wait' 
              : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
          }`}
          title="Excluir Conta"
        >
          {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
        </button>

        {bill.status !== 'PAID' ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onPay(e);
            }}
            className="flex items-center gap-1 bg-green-50 text-green-600 px-3 py-2 rounded-full hover:bg-green-100 transition-colors shadow-sm ml-1"
          >
            <Check size={14} strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-widest">Pagar</span>
          </button>
        ) : (
          <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter bg-green-50 px-2 py-0.5 rounded-md ml-1">Liquidado</span>
        )}
      </div>
    </div>
  </div>
);

const BillManagement: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      
      const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setBills(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar contas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [selectedMonth]);

  const createNextMonthBill = async (currentBill: any) => {
    try {
      const nextDueDate = new Date(currentBill.due_date);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

      const { error } = await supabase.from('bills').insert({
        description: currentBill.description,
        value: currentBill.value,
        due_date: nextDueDateStr,
        recurring: true,
        category: currentBill.category,
        reminder_days: currentBill.reminder_days,
        observation: currentBill.observation,
        status: 'PENDING',
        parent_bill_id: currentBill.id
      });

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao criar conta recorrente:', err);
    }
  };

  const handleQuickPay = async (e: React.MouseEvent, bill: any) => {
    e.stopPropagation();
    
    const valueFloat = Number(bill.value) || 0;

    if (valueFloat <= 0) {
      alert('Para realizar o pagamento, o valor da conta deve ser maior que zero.\n\nPor favor, clique no card para editar e adicionar um valor.');
      return;
    }
    
    if(!window.confirm(`Confirmar pagamento de R$ ${valueFloat.toFixed(2).replace('.', ',')}?\nIsso registrará uma saída no financeiro.`)) return;

    setPayingId(bill.id);

    try {
      const { error: updateError } = await supabase
        .from('bills')
        .update({ status: 'PAID' })
        .eq('id', bill.id);

      if (updateError) throw updateError;

      await addTransaction({
        type: 'expense',
        category: bill.category || 'Fixas',
        item: `Pgto: ${bill.description}`,
        val: -Math.abs(valueFloat),
        method: 'Dinheiro',
        pro: 'Sistema',
        date: new Date().toISOString().split('T')[0],
        status: 'Pago'
      });

      // Se for recorrente, criar conta do próximo mês
      if (bill.recurring) {
        await createNextMonthBill(bill);
      }

      // Atualizar a lista local
      setBills(prev => prev.map(b => 
        b.id === bill.id ? { ...b, status: 'PAID' } : b
      ));

      alert('Pagamento realizado com sucesso!');
    } catch (err: any) {
      console.error('Falha ao processar pagamento:', err);
      alert('ERRO NO BANCO: ' + err.message);
      fetchBills(); // Reverter em caso de erro
    } finally {
      setPayingId(null);
    }
  };

  const handleQuickDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (!id) return;

    if (!window.confirm('Deseja EXCLUIR permanentemente este registro?')) return;

    setDeletingId(id);

    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBills(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      alert('ERRO AO APAGAR: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const billsByStatus = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue: any[] = [];
    const pending: any[] = [];
    const paid: any[] = [];

    bills.forEach(bill => {
      if (bill.status === 'PAID') {
        paid.push(bill);
      } else if (bill.due_date && bill.due_date < todayStr) {
        overdue.push(bill);
      } else {
        pending.push(bill);
      }
    });

    return { overdue, pending, paid };
  }, [bills]);

  const changeMonth = (offset: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(selectedMonth.getMonth() + offset);
    setSelectedMonth(newMonth);
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/menu')} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold tracking-tight">Contas e Despesas</h1>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Fluxo de Caixa</span>
        </div>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ChevronLeft size={20} className="text-blue-900" />
          </button>
          <div className="text-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-900">
              {selectedMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ChevronRight size={20} className="text-blue-900" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 p-4 rounded-3xl border border-red-100 text-center">
            <span className="text-[8px] font-black text-red-600 uppercase block mb-1 tracking-tighter">Vencidas</span>
            <span className="text-sm font-black text-red-700">{billsByStatus.overdue.length}</span>
          </div>
          <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 text-center">
            <span className="text-[8px] font-black text-orange-600 uppercase block mb-1 tracking-tighter">Em aberto</span>
            <span className="text-sm font-black text-orange-700">{billsByStatus.pending.length}</span>
          </div>
          <div className="bg-green-50 p-4 rounded-3xl border border-green-100 text-center">
            <span className="text-[8px] font-black text-green-600 uppercase block mb-1 tracking-tighter">Liquidadas</span>
            <span className="text-sm font-black text-green-700">{billsByStatus.paid.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-900" size={32} />
          </div>
        ) : (
          <>
            {billsByStatus.overdue.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 text-red-600">
                  <AlertCircle size={18} />
                  <h3 className="text-gray-900 font-black text-[10px] uppercase tracking-[0.2em]">Contas em Atraso</h3>
                </div>
                <div className="space-y-3">
                  {billsByStatus.overdue.map(bill => (
                    <BillCard 
                      key={bill.id} 
                      bill={bill} 
                      isOverdue
                      isDeleting={deletingId === bill.id}
                      onClick={() => navigate(`/bills/edit/${bill.id}`)}
                      onPay={(e) => handleQuickPay(e, bill)}
                      onDelete={(e) => handleQuickDelete(e, bill.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2 text-orange-500">
                <Clock size={18} />
                <h3 className="text-gray-900 font-black text-[10px] uppercase tracking-[0.2em]">Pendentes no Mês</h3>
              </div>
              {billsByStatus.pending.length > 0 ? (
                <div className="space-y-3">
                  {billsByStatus.pending.map(bill => (
                    <BillCard 
                      key={bill.id} 
                      bill={bill}
                      isDeleting={deletingId === bill.id}
                      onClick={() => navigate(`/bills/edit/${bill.id}`)} 
                      onPay={(e) => handleQuickPay(e, bill)}
                      onDelete={(e) => handleQuickDelete(e, bill.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-[10px] text-gray-400 font-bold uppercase border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                  Nenhuma pendência encontrada
                </p>
              )}
            </div>

            {billsByStatus.paid.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 text-green-600">
                  <CheckCircle2 size={18} />
                  <h3 className="text-gray-900 font-black text-[10px] uppercase tracking-[0.2em]">Pagamentos Efetuados</h3>
                </div>
                <div className="space-y-3 opacity-80">
                  {billsByStatus.paid.map(bill => (
                    <BillCard 
                      key={bill.id} 
                      bill={bill}
                      isDeleting={deletingId === bill.id}
                      onClick={() => navigate(`/bills/edit/${bill.id}`)}
                      onPay={() => {}}
                      onDelete={(e) => handleQuickDelete(e, bill.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
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