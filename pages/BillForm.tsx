
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Receipt, DollarSign, RefreshCw, 
  CheckCircle2, Trash2, Save, Loader2, RotateCcw, Clock, AlertTriangle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { getSettings, saveSettings } from '../data/agendaData';
import { addTransaction, deleteTransaction } from '../data/transactions';

const BillForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  
  // Novos estados para financeiro
  const [settings, setSettings] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [payForm, setPayForm] = useState({ method: 'Dinheiro', source: 'cash' });
  
  // Estado do Formulário
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    dueDate: new Date().toISOString().split('T')[0],
    recurring: false,
    category: 'Fixo',
    observation: '',
    status: 'PENDING' // 'PENDING' ou 'PAID'
  });

  // Estado para Modal de Confirmação customizado
  const [confirmConfig, setConfirmConfig] = useState<{
    show: boolean,
    title: string,
    message: string,
    action: () => void,
    type: 'danger' | 'info' | 'success'
  }>({ show: false, title: '', message: '', action: () => {}, type: 'info' });

  // Carregar dados se for edição
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carrega configurações e métodos de pagamento sempre
        const [settingsData, methodsRes] = await Promise.all([
          getSettings(),
          supabase.from('payment_methods').select('*')
        ]);

        if (settingsData) setSettings(settingsData);
        if (methodsRes.data) {
          setPaymentMethods(methodsRes.data);
          // Se houver métodos, tenta selecionar um padrão
          if (methodsRes.data.length > 0) {
            const hasDinheiro = methodsRes.data.find((m: any) => m.name === 'Dinheiro');
            setPayForm(prev => ({ ...prev, method: hasDinheiro ? 'Dinheiro' : methodsRes.data[0].name }));
          }
        }

        if (id) {
          const { data, error } = await supabase
            .from('bills')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          if (data) {
            setFormData({
              description: data.description || '',
              value: data.value ? String(data.value).replace('.', ',') : '',
              dueDate: data.due_date,
              recurring: data.recurring || false,
              category: data.category || 'Fixo',
              observation: data.observation || '',
              status: data.status || 'PENDING'
            });
          }
        }
      } catch (err) {
        console.error(err);
        if (id) {
          alert('Erro ao carregar dados da conta.');
          navigate('/bills');
        }
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  // Helper para abrir o modal
  const triggerConfirm = (title: string, message: string, action: () => void, type: 'danger' | 'info' | 'success' = 'info') => {
    setConfirmConfig({ show: true, title, message, action, type });
  };

  // FUNÇÕES DE AÇÃO

  // 1. Salvar (Criar ou Editar sem mudar status financeiro extra)
  const handleSave = async () => {
    if (!formData.description || !formData.value) {
      alert('Preencha descrição e valor.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        description: formData.description,
        value: parseFloat(formData.value.replace(',', '.')) || 0,
        due_date: formData.dueDate,
        recurring: formData.recurring,
        category: formData.category,
        observation: formData.observation,
        status: formData.status // Mantém o status atual
      };

      if (id) {
        await supabase.from('bills').update(payload).eq('id', id);
      } else {
        await supabase.from('bills').insert(payload);
      }

      alert('Conta salva com sucesso!');
      navigate('/bills');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Realizar Pagamento (Salva, muda status, lança transação)
  const handlePay = () => {
    const amount = parseFloat(formData.value.replace(',', '.')) || 0;
    if (amount <= 0) {
      alert('Valor inválido para pagamento.');
      return;
    }

    triggerConfirm(
      'Confirmar Pagamento',
      'Deseja confirmar o pagamento desta conta?',
      async () => {
        setConfirmConfig(prev => ({...prev, show: false}));
        setLoading(true);
        try {
          // 0. Verifica se a conta já não foi paga (evita duplicidade)
          if (id) {
            const { data: currentBill } = await supabase
              .from('bills')
              .select('status')
              .eq('id', id)
              .single();
            
            if (currentBill?.status === 'PAID') {
              alert('Esta conta já consta como paga.');
              navigate('/bills');
              return;
            }
          }

          // Atualiza (ou cria) a conta como PAGA
          const payload = {
            description: formData.description,
            value: amount,
            due_date: formData.dueDate,
            recurring: formData.recurring,
            category: formData.category,
            observation: formData.observation,
            status: 'PAID'
          };

          if (id) {
            await supabase.from('bills').update(payload).eq('id', id);
          } else {
            const { data: newBill, error } = await supabase.from('bills').insert(payload).select().single();
            if (error) throw error;
            // Se acabou de criar, precisamos do ID para futuras operações nesta mesma tela (embora naveguemos fora)
          }

          // 1. Lança Transação
          await addTransaction({
            type: 'DESPESA',
            category: formData.category,
            item: `Pgto: ${formData.description}`,
            val: -Math.abs(amount),
            payment_method: payForm.source === 'bank' ? `${payForm.method} (Banco)` : payForm.method,
            pro: 'Sistema',
            date: new Date().toISOString().split('T')[0],
            status: 'Pago'
          });

          // Lógica de Recorrência (Criar próximo mês se não existir)
          if (formData.recurring) {
            const nextDate = new Date(formData.dueDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            const nextDateStr = nextDate.toISOString().split('T')[0];

            // Verifica se já existe uma conta com mesma descrição e data no próximo mês
            const { data: existingNext } = await supabase
              .from('bills')
              .select('id')
              .eq('description', formData.description)
              .eq('due_date', nextDateStr)
              .limit(1);

            if (!existingNext || existingNext.length === 0) {
              await supabase.from('bills').insert({
                ...payload,
                due_date: nextDateStr,
                status: 'PENDING'
              });
            }
          }

          alert('Pagamento registrado com sucesso!');
          navigate('/bills');
        } catch (err: any) {
          alert('Erro no pagamento: ' + err.message);
        } finally {
          setLoading(false);
        }
      },
      'success'
    );
  };

  // 3. Desfazer Pagamento (Volta para PENDING e remove transação)
  const handleUnpay = () => {
    if (!id) return;
    triggerConfirm(
      'Desfazer Pagamento',
      'O status voltará para PENDENTE e o valor sairá das despesas. Confirmar?',
      async () => {
        setConfirmConfig(prev => ({...prev, show: false}));
        setLoading(true);
        try {
          // 1. Volta status da conta para PENDING
          const { error } = await supabase
            .from('bills')
            .update({ status: 'PENDING' })
            .eq('id', id);

          if (error) throw error;

          // 2. Localiza e remove a transação financeira correspondente
          const amount = parseFloat(formData.value.replace(',', '.')) || 0;
          const searchItem = `Pgto: ${formData.description}`;
          const searchVal = -Math.abs(amount);

          // Busca a transação mais recente que bate com esses dados
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
             await deleteTransaction(trans.id);
          }

          // 3. Se for recorrente, tenta remover a conta do próximo mês que foi gerada automaticamente
          // (Apenas se ela ainda estiver PENDENTE e tiver a mesma descrição)
          if (formData.recurring) {
            const nextDate = new Date(formData.dueDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            const nextDateStr = nextDate.toISOString().split('T')[0];

            await supabase
              .from('bills')
              .delete()
              .eq('description', formData.description)
              .eq('due_date', nextDateStr)
              .eq('status', 'PENDING');
          }

          setFormData(prev => ({ ...prev, status: 'PENDING' }));
          alert('Pagamento desfeito! O valor foi estornado do financeiro.');
        } catch (err: any) {
          alert('Erro ao desfazer: ' + err.message);
        } finally {
          setLoading(false);
        }
      },
      'info'
    );
  };

  // 4. Excluir
  const handleDelete = () => {
    if (!id) return;
    
    triggerConfirm(
      'Excluir Conta',
      'Deseja excluir permanentemente este registro?',
      async () => {
        setConfirmConfig(prev => ({...prev, show: false}));
        setLoading(true);
        try {
          const { error } = await supabase.from('bills').delete().eq('id', id);
          if (error) throw error;
          
          alert('Registro excluído.');
          navigate('/bills', { replace: true });
        } catch (err: any) {
          alert('Erro ao excluir: ' + err.message);
        } finally {
          setLoading(false);
        }
      },
      'danger'
    );
  };

  if (initialLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-900" size={32} /></div>;
  }

  const isPaid = formData.status === 'PAID';

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-bold tracking-tight">
          {id ? 'Detalhes da Conta' : 'Nova Conta'}
        </h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto flex-1 bg-white">
        
        {/* Status Banner */}
        {id && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 ${isPaid ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
            {isPaid ? <CheckCircle2 size={24} /> : <Clock size={24} />}
            <div>
              <h3 className="font-black text-sm uppercase tracking-widest">{isPaid ? 'CONTA PAGA' : 'PENDENTE'}</h3>
              <p className="text-[10px] opacity-80">{isPaid ? 'Valor debitado do financeiro' : 'Aguardando pagamento'}</p>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Descrição</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Ex: Aluguel"
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-12 outline-none focus:ring-2 focus:ring-blue-900 font-bold text-gray-700"
              />
              <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Valor (R$)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: e.target.value})}
                  placeholder="0,00"
                  className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-10 outline-none focus:ring-2 focus:ring-blue-900 font-black text-lg text-gray-800"
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
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-900 font-bold text-gray-700 text-xs"
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
        </div>

        {/* Opções de Pagamento (Apenas se não estiver pago) */}
        {!isPaid && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
            <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] mb-2 px-1">Configurações de Pagamento</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Origem do Valor</label>
              <div className="flex bg-white p-1 rounded-2xl border border-gray-200">
                <button 
                  type="button"
                  onClick={() => setPayForm({...payForm, source: 'cash'})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${payForm.source === 'cash' ? 'bg-blue-900 text-white shadow-md' : 'text-gray-400'}`}
                >
                  Caixa Físico
                </button>
                <button 
                  type="button"
                  onClick={() => setPayForm({...payForm, source: 'bank'})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${payForm.source === 'bank' ? 'bg-blue-900 text-white shadow-md' : 'text-gray-400'}`}
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
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-900 font-bold text-gray-700 text-xs appearance-none shadow-sm"
              >
                {paymentMethods.map(pm => (
                  <option key={pm.id} value={pm.name}>{pm.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="pt-6 space-y-3 pb-12">
          {/* Botão de Pagamento (Só aparece se NÃO estiver pago) */}
          {!isPaid && (
            <button 
              onClick={handlePay}
              disabled={loading}
              className="w-full bg-green-600 text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Confirmar Pagamento
            </button>
          )}

          {/* Botão de Desfazer Pagamento (Só aparece se ESTIVER pago) */}
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

          {/* Botão Salvar Genérico */}
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#1e3a8a] text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save />}
            {id ? 'Salvar Alterações' : 'Salvar Pendente'}
          </button>

          {/* Botão Excluir (Só se estiver editando) */}
          {id && (
            <button 
              type="button"
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

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      {confirmConfig.show && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                confirmConfig.type === 'danger' ? 'bg-red-50 text-red-500' : 
                confirmConfig.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'
            }`}>
              {confirmConfig.type === 'danger' ? <AlertTriangle size={32} /> : confirmConfig.type === 'success' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} className="rotate-180" />}
            </div>
            <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-2">{confirmConfig.title}</h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmConfig.action}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all ${
                    confirmConfig.type === 'danger' ? 'bg-red-600 text-white' : 
                    confirmConfig.type === 'success' ? 'bg-green-600 text-white' : 'bg-[#1e3a8a] text-white'
                  }`}
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setConfirmConfig({ ...confirmConfig, show: false })}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 bg-gray-50 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillForm;
