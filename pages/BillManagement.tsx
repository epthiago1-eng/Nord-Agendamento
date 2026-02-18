import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Receipt, AlertCircle, 
  CheckCircle2, Clock, Loader2, Trash2, Calendar, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { addTransaction } from '../data/transactions';

// --- COMPONENTE DO CARD DE CONTA ---
const BillItem = ({ bill, onPay, onDelete, onClick }: any) => {
  // Formatação segura de data
  const formatDate = (dateString: string) => {
    if (!dateString) return '--/--';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`; // Formato PT-BR forçado manualmente para evitar erro de Timezone
  };

  const isOverdue = bill.status === 'PENDING' && new Date(bill.due_date) < new Date(new Date().setHours(0,0,0,0));

  return (
    <div 
      onClick={() => onClick(bill.id)}
      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-center gap-4 z-10">
        <div className={`p-3 rounded-2xl ${
          bill.status === 'PAID' ? 'bg-green-50 text-green-600' : 
          isOverdue ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-orange-50 text-orange-500'
        }`}>
          <Receipt size={22} />
        </div>
        <div>
          <h4 className="text-sm font-black text-gray-900 tracking-tight">{bill.description}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{bill.category}</span>
            <span className="text-gray-300">|</span>
            <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
              Venc: {formatDate(bill.due_date)}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right z-10 flex flex-col items-end gap-2">
        <p className={`text-base font-black ${bill.status === 'PAID' ? 'text-gray-900' : 'text-gray-700'}`}>
          R$ {Number(bill.value).toFixed(2).replace('.', ',')}
        </p>
        
        <div className="flex items-center gap-2">
          {bill.status === 'PENDING' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onPay(bill); }}
              className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-green-100 transition-colors flex items-center gap-1"
            >
              <CheckCircle2 size={12} /> Pagar
            </button>
          )}
          
          {bill.status === 'PAID' && (
            <span className="bg-gray-50 text-gray-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase">
              Pago
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- TELA PRINCIPAL ---
const BillManagement: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Navegação de Mês
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Carregar Dados
  const fetchBills = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // Define intervalo do mês
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [currentDate]);

  // Ações Rápidas
  const deleteBill = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
      setBills(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      alert('Erro ao excluir.');
    }
  };

  const payBill = async (bill: any) => {
    if (!confirm(`Confirmar pagamento de R$ ${bill.value}?`)) return;
    
    try {
      // 1. Atualiza Conta
      const { error } = await supabase
        .from('bills')
        .update({ status: 'PAID' })
        .eq('id', bill.id);
      
      if (error) throw error;

      // 2. Lança no Financeiro
      await addTransaction({
        type: 'DESPESA',
        category: bill.category,
        item: `Pgto Conta: ${bill.description}`,
        val: -Math.abs(Number(bill.value)),
        payment_method: 'Dinheiro',
        pro: 'Sistema',
        date: new Date().toISOString().split('T')[0],
        status: 'Pago'
      });

      // 3. Verifica Recorrência (Cria o próximo mês)
      if (bill.recurring) {
        const nextDueDate = new Date(bill.due_date);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        const { id: _, created_at: __, ...newBillData } = bill;
        await supabase.from('bills').insert({
          ...newBillData,
          due_date: nextDueDate.toISOString().split('T')[0],
          status: 'PENDING'
        });
      }

      // Atualiza lista local
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'PAID' } : b));
      alert('Conta paga com sucesso!');
      
    } catch (err: any) {
      alert('Erro ao processar pagamento: ' + err.message);
    }
  };

  // Separação dos Dados para Visualização
  const { overdue, pending, paid } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const overdueList: any[] = [];
    const pendingList: any[] = [];
    const paidList: any[] = [];

    bills.forEach(b => {
      if (b.status === 'PAID') {
        paidList.push(b);
      } else if (b.due_date < today) {
        overdueList.push(b);
      } else {
        pendingList.push(b);
      }
    });

    return { overdue: overdueList, pending: pendingList, paid: paidList };
  }, [bills]);

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
        {/* Navegador de Meses */}
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <button onClick={handlePrevMonth} className="p-3 hover:bg-gray-50 rounded-xl transition-colors text-blue-900">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-900">
            {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={handleNextMonth} className="p-3 hover:bg-gray-50 rounded-xl transition-colors text-blue-900">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 p-4 rounded-3xl border border-red-100 text-center">
            <span className="text-[8px] font-black text-red-600 uppercase block mb-1">Vencidas</span>
            <span className="text-xl font-black text-red-700">{overdue.length}</span>
          </div>
          <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 text-center">
            <span className="text-[8px] font-black text-orange-600 uppercase block mb-1">Em Aberto</span>
            <span className="text-xl font-black text-orange-700">{pending.length}</span>
          </div>
          <div className="bg-green-50 p-4 rounded-3xl border border-green-100 text-center">
            <span className="text-[8px] font-black text-green-600 uppercase block mb-1">Liquidadas</span>
            <span className="text-xl font-black text-green-700">{paid.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-900" size={32} /></div>
        ) : (
          <>
            {/* Lista de Vencidas */}
            {overdue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-red-600">
                  <AlertCircle size={16} />
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Contas Vencidas</h3>
                </div>
                {overdue.map(b => (
                  <BillItem key={b.id} bill={b} onPay={payBill} onDelete={deleteBill} onClick={(id: string) => navigate(`/bills/edit/${id}`)} />
                ))}
              </div>
            )}

            {/* Lista de Pendentes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2 text-orange-500">
                <Clock size={16} />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Pendentes no Mês</h3>
              </div>
              {pending.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-3xl text-gray-400 text-xs font-bold uppercase">
                  Nenhuma conta pendente
                </div>
              ) : (
                pending.map(b => (
                  <BillItem key={b.id} bill={b} onPay={payBill} onDelete={deleteBill} onClick={(id: string) => navigate(`/bills/edit/${id}`)} />
                ))
              )}
            </div>

            {/* Lista de Pagas */}
            {paid.length > 0 && (
              <div className="space-y-3 opacity-80">
                <div className="flex items-center gap-2 px-2 text-green-600">
                  <CheckCircle2 size={16} />
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Contas Pagas</h3>
                </div>
                {paid.map(b => (
                  <BillItem key={b.id} bill={b} onPay={payBill} onDelete={deleteBill} onClick={(id: string) => navigate(`/bills/edit/${id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB - Add Button */}
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