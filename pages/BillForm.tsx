import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Receipt, DollarSign, RefreshCw, 
  CheckCircle2, Trash2, Clock, Save, Loader2, RotateCcw
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { addTransaction } from '../data/transactions';

const BillForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    description: '',
    value: '',
    dueDate: new Date().toISOString().split('T')[0],
    recurring: false,
    category: 'Fixo',
    reminderDays: '3',
    observation: ''
  });

  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      fetchBillData();
    }
  }, [id]);

  const fetchBillData = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          description: data.description || '',
          value: data.value ? Number(data.value).toFixed(2).replace('.', ',') : '',
          dueDate: data.due_date || new Date().toISOString().split('T')[0],
          recurring: !!data.recurring,
          category: data.category || 'Fixo',
          reminderDays: String(data.reminder_days || '3'),
          observation: data.observation || ''
        });
        setIsPaid(data.status === 'PAID');
      }
    } catch (err: any) {
      console.error('Erro ao carregar conta:', err);
      alert('Não foi possível carregar os dados desta conta.');
      navigate('/bills');
    } finally {
      setInitialLoading(false);
    }
  };

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

  const handleSave = async (markAsPaidNow = false) => {
    if (!formData.description) {
      alert('A descrição da conta é obrigatória.');
      return;
    }

    const cleanValue = formData.value.replace(/\./g, '').replace(',', '.');
    const valueFloat = parseFloat(cleanValue) || 0;

    if (markAsPaidNow) {
      if (valueFloat <= 0) {
        alert('Para marcar como pago, informe um valor válido maior que zero.');
        return;
      }
    }

    if (!formData.value) {
      alert('Informe o valor previsto da conta.');
      return;
    }

    setLoading(true);
    try {
      const finalStatus = markAsPaidNow ? 'PAID' : (isPaid ? 'PAID' : 'PENDING');

      const payload = {
        description: formData.description,
        value: valueFloat,
        due_date: formData.dueDate,
        recurring: formData.recurring,
        category: formData.category,
        reminder_days: parseInt(formData.reminderDays) || 3,
        observation: formData.observation,
        status: finalStatus
      };

      if (id) {
        const { error } = await supabase.from('bills').update(payload).eq('id', id);
        if (error) throw error;

        // Se está pagando AGORA e é recorrente, cria a conta do próximo mês
        if (markAsPaidNow && formData.recurring) {
          await createNextMonthBill({ ...payload, id, due_date: formData.dueDate });
        }
      } else {
        const { error } = await supabase.from('bills').insert(payload);
        if (error) throw error;
      }

      if (markAsPaidNow && !isPaid) {
        await addTransaction({
          type: 'expense',
          category: formData.category,
          item: `Pgto: ${formData.description}`,
          val: -Math.abs(valueFloat),
          method: 'Dinheiro',
          pro: 'Sistema',
          date: new Date().toISOString().split('T')[0],
          status: 'Pago'
        });
      }

      alert('Salvo com sucesso!');
      navigate('/bills');
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      alert('Falha ao salvar no banco: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpay = async () => {
    if (!confirm('Deseja reabrir esta conta? O status voltará para "Pendente".')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bills')
        .update({ status: 'PENDING' })
        .eq('id', id);

      if (error) throw error;

      setIsPaid(false);
      alert('Conta reaberta!');
      navigate('/bills');
    } catch (err: any) {
      alert('Erro ao reabrir conta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (!confirm('Tem certeza? Esta ação apagará o registro permanentemente.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
      
      alert('Conta excluída com sucesso!');
      navigate('/bills', { replace: true });
    } catch (err: any) {
      console.error('Erro ao apagar:', err);
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#fcfaff]">
        <Loader2 className="animate-spin text-blue-900" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-bold tracking-tight">
          {id ? 'Detalhes da Conta' : 'Nova Conta'}
        </h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto flex-1 bg-white">
        
        {id && (
          <div className={`p-4 rounded-3xl flex items-center justify-between border ${isPaid ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
            <div className="flex items-center gap-2">
              {isPaid ? <CheckCircle2 size={20} /> : <Clock size={20} />}
              <div>
                <span className="text-xs font-black uppercase tracking-widest block">{isPaid ? 'Conta Paga' : 'Pendente'}</span>
                {isPaid && <span className="text-[10px] opacity-80">Valor debitado do financeiro</span>}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Descrição *</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Ex: Aluguel da Barbearia"
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-12 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-bold"
              />
              <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Valor (R$) *</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: e.target.value})}
                  placeholder="0,00"
                  className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-10 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-black text-lg"
                />
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Vencimento</label>
              <input 
                type="date" 
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-bold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Recorrência</label>
              <button 
                onClick={() => setFormData({...formData, recurring: !formData.recurring})}
                className={`w-full py-4 rounded-2xl border transition-all flex items-center justify-center gap-2 ${
                  formData.recurring ? 'bg-blue-900 border-blue-900 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}
              >
                <RefreshCw size={16} className={formData.recurring ? 'animate-spin-slow' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.recurring ? 'Mensal' : 'Única'}</span>
              </button>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Categoria</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 outline-none shadow-sm text-gray-700 font-bold text-xs appearance-none"
              >
                <option>Fixo</option>
                <option>Variável</option>
                <option>Operacional</option>
                <option>Insumo</option>
                <option>Pessoal</option>
              </select>
            </div>
          </div>
          
          {formData.recurring && (
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-[10px] text-blue-800 flex gap-2 items-center">
              <RefreshCw size={14} />
              <span>Ao pagar esta conta, uma nova será criada automaticamente para o próximo mês.</span>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-6 mb-12">
          {!isPaid && (
            <button 
              onClick={() => handleSave(true)}
              disabled={loading}
              className="w-full bg-green-600 text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Confirmar Pagamento
            </button>
          )}

          {isPaid && (
            <button 
              onClick={handleUnpay}
              disabled={loading}
              className="w-full bg-orange-100 text-orange-600 font-black py-4.5 rounded-2xl shadow-sm border border-orange-200 active:scale-95 transition-transform uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
            >
              <RotateCcw size={18} />
              Desfazer Pagamento
            </button>
          )}
          
          <button 
            onClick={() => handleSave(false)}
            disabled={loading}
            className="w-full bg-[#1e3a8a] text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {id ? 'Salvar Alterações' : 'Salvar Pendente'}
          </button>
          
          {id && (
            <button 
              onClick={handleDelete}
              disabled={loading}
              className="w-full bg-white border border-red-100 text-red-500 font-black py-4 rounded-2xl active:scale-95 transition-transform uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 mt-4"
            >
              <Trash2 size={16} />
              Excluir este Registro
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillForm;