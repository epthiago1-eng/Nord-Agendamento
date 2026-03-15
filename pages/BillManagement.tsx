import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Receipt, AlertCircle, 
  CheckCircle2, Clock, Loader2, Trash2, Calendar, Filter, X, Wallet2, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, db } from '../supabase';
import { getSettings, saveSettings } from '../data/agendaData';

// --- COMPONENTE DO CARD DE CONTA ---
const BillItem = ({ bill, onPay, onUnpay, onDelete, onClick }: any) => {
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
            <button 
              onClick={(e) => { e.stopPropagation(); onUnpay(bill); }}
              className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-orange-100 transition-colors flex items-center gap-1"
            >
              <RotateCcw size={12} /> Estornar
            </button>
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
  
  // Novos estados para pagamento
  const [settings, setSettings] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [payModal, setPayModal] = useState<{ show: boolean, bill: any | null }>({ show: false, bill: null });
  const [payForm, setPayForm] = useState({ method: '', source: 'cash' });
  const [saving, setSaving] = useState(false);

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

      const [billsRes, settingsRes, methodsRes] = await Promise.all([
        supabase
          .from('bills')
          .select('*')
          .gte('due_date', startOfMonth)
          .lte('due_date', endOfMonth)
          .order('due_date', { ascending: true }),
        supabase.from('settings').select('*').single(),
        db.paymentMethods().select('*')
      ]);

      if (billsRes.error) throw billsRes.error;
      setBills(billsRes.data || []);
      
      if (settingsRes.data) setSettings(settingsRes.data);
      if (methodsRes.data) {
        setPaymentMethods(methodsRes.data);
        if (methodsRes.data.length > 0) {
            setPayForm(prev => ({ ...prev, method: methodsRes.data[0].name }));
        }
      }
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

  const openPayModal = (bill: any) => {
    setPayModal({ show: true, bill });
  };

  const confirmPayment = async () => {
    if (!payModal.bill || !settings) return;
    
    // Evita processamento duplo se já estiver salvando
    if (saving) return;
    
    setSaving(true);
    const bill = payModal.bill;
    const amount = Number(bill.value);

    try {
      // 0. Verifica se a conta já não foi paga (evita duplicidade por cliques rápidos)
      const { data: currentBill } = await supabase
        .from('bills')
        .select('status')
        .eq('id', bill.id)
        .single();
      
      if (currentBill?.status === 'PAID') {
        setPayModal({ show: false, bill: null });
        return;
      }

      // 1. Atualiza Conta
      const { error } = await supabase
        .from('bills')
        .update({ status: 'PAID' })
        .eq('id', bill.id);
      
      if (error) throw error;

      // 2. Atualiza Saldo
      const settingsData = await getSettings();
      if (settingsData) {
          let newSettings = { ...settingsData };
          const method = payForm.method.toLowerCase();
          
          if (payForm.source === 'cash') {
              if (method.includes('dinheiro')) {
                  newSettings.cash_balance = (newSettings.cash_balance || 0) - amount;
              } else if (method.includes('pix')) {
                  newSettings.pix_balance = (newSettings.pix_balance || 0) - amount;
              } else if (method.includes('cartão') || method.includes('cartao')) {
                  newSettings.card_balance = (newSettings.card_balance || 0) - amount;
              } else {
                  newSettings.cash_balance = (newSettings.cash_balance || 0) - amount;
              }
          } else {
              newSettings.bank_balance = (newSettings.bank_balance || 0) - amount;
          }

          await saveSettings(newSettings);
          setSettings(newSettings);
      }

      // 3. Lança no Financeiro
      await addTransaction({
        type: 'DESPESA',
        category: bill.category,
        item: `Pgto: ${bill.description}`,
        val: -Math.abs(amount),
        payment_method: payForm.method,
        pro: 'Sistema',
        date: new Date().toISOString().split('T')[0],
        status: 'Pago'
      });

      // 4. Verifica Recorrência (Cria o próximo mês se não existir)
      if (bill.recurring) {
        const nextDueDate = new Date(bill.due_date);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
        
        // Verifica se já existe uma conta com mesma descrição e data no próximo mês
        const { data: existingNext } = await supabase
          .from('bills')
          .select('id')
          .eq('description', bill.description)
          .eq('due_date', nextDueDateStr)
          .limit(1);

        if (!existingNext || existingNext.length === 0) {
          const { id: _, created_at: __, ...newBillData } = bill;
          await supabase.from('bills').insert({
            ...newBillData,
            due_date: nextDueDateStr,
            status: 'PENDING'
          });
        }
      }

      // Atualiza lista local
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'PAID' } : b));
      setPayModal({ show: false, bill: null });
      alert('Conta paga com sucesso!');
      
    } catch (err: any) {
      alert('Erro ao processar pagamento: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnpay = async (bill: any) => {
    if (!settings) return;
    if (!confirm(`Deseja desfazer o pagamento de "${bill.description}"? O valor será estornado do saldo.`)) return;

    setSaving(true);
    try {
      // 1. Volta status para PENDING
      await supabase.from('bills').update({ status: 'PENDING' }).eq('id', bill.id);

      // 2. Localiza e remove transação
      const amount = Number(bill.value);
      const searchItem = `Pgto: ${bill.description}`;
      const searchVal = -Math.abs(amount);

      const { data: matchingTrans } = await supabase
        .from('transactions')
        .select('id, payment_method')
        .eq('item', searchItem)
        .eq('val', searchVal)
        .eq('type', 'DESPESA')
        .order('created_at', { ascending: false })
        .limit(1);

      if (matchingTrans && matchingTrans.length > 0) {
        const trans = matchingTrans[0];
        
        // Restaura saldo
        const settingsData = await getSettings();
        if (settingsData) {
          const newSettings = { ...settingsData };
          const method = (trans.payment_method || '').toLowerCase();
          
          if (method.includes('dinheiro')) {
            newSettings.cash_balance = (newSettings.cash_balance || 0) + amount;
          } else if (method.includes('pix')) {
            newSettings.pix_balance = (newSettings.pix_balance || 0) + amount;
          } else if (method.includes('cartão') || method.includes('cartao')) {
            newSettings.card_balance = (newSettings.card_balance || 0) + amount;
          } else {
            newSettings.bank_balance = (newSettings.bank_balance || 0) + amount;
          }

          await saveSettings(newSettings);
          setSettings(newSettings);
        }

        const { deleteTransaction } = await import('../data/transactions');
        await deleteTransaction(trans.id);
      }

      // 3. Remove próxima recorrência se existir e estiver pendente
      if (bill.recurring) {
        const nextDate = new Date(bill.due_date);
        nextDate.setMonth(nextDate.getMonth() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        await supabase
          .from('bills')
          .delete()
          .eq('description', bill.description)
          .eq('due_date', nextDateStr)
          .eq('status', 'PENDING');
      }

      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'PENDING' } : b));
      alert('Pagamento desfeito com sucesso!');
    } catch (err: any) {
      alert('Erro ao desfazer: ' + err.message);
    } finally {
      setSaving(false);
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
                  <BillItem key={b.id} bill={b} onPay={openPayModal} onUnpay={handleUnpay} onDelete={deleteBill} onClick={(id: string) => navigate(`/bills/edit/${id}`)} />
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
                  <BillItem key={b.id} bill={b} onPay={openPayModal} onUnpay={handleUnpay} onDelete={deleteBill} onClick={(id: string) => navigate(`/bills/edit/${id}`)} />
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
                  <BillItem key={b.id} bill={b} onPay={openPayModal} onUnpay={handleUnpay} onDelete={deleteBill} onClick={(id: string) => navigate(`/bills/edit/${id}`)} />
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

      {/* MODAL DE PAGAMENTO */}
      {payModal.show && payModal.bill && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-blue-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Wallet2 size={16} /> Pagar Conta
                    </h3>
                    <button onClick={() => setPayModal({ show: false, bill: null })} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                        <p className="text-[10px] text-blue-800 font-black uppercase tracking-widest mb-1">{payModal.bill.description}</p>
                        <h4 className="text-2xl font-black text-blue-900">R$ {Number(payModal.bill.value).toFixed(2).replace('.', ',')}</h4>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Origem do Pagamento</label>
                        <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                            <button 
                                onClick={() => setPayForm({...payForm, source: 'cash'})}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${payForm.source === 'cash' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                            >
                                Caixa Físico
                            </button>
                            <button 
                                onClick={() => setPayForm({...payForm, source: 'bank'})}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${payForm.source === 'bank' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                            >
                                Conta Corrente
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Método de Pagamento</label>
                        <select
                            value={payForm.method}
                            onChange={(e) => setPayForm({...payForm, method: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
                        >
                            {paymentMethods.map(pm => (
                                <option key={pm.id} value={pm.name}>{pm.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-3 items-start">
                        <AlertCircle size={20} className="text-orange-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-orange-800 font-medium leading-relaxed">
                            O valor será deduzido do <b>{payForm.source === 'cash' ? 'Caixa Físico' : 'Conta Corrente'}</b> e um lançamento de despesa será criado no financeiro.
                        </p>
                    </div>

                    <button 
                        onClick={confirmPayment}
                        disabled={saving}
                        className="w-full bg-green-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Pagamento'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BillManagement;