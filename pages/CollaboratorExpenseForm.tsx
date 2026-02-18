
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Receipt, DollarSign, Calendar, Info, Loader2, CheckCircle2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addTransaction } from '../data/transactions';
import { addNotification } from '../data/notifications';
import { db } from '../supabase';

const CollaboratorExpenseForm: React.FC = () => {
  const navigate = useNavigate();
  const proName = localStorage.getItem('user_name') || 'Colaborador';
  const proId = localStorage.getItem('user_pro_id') || '';

  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    value: '',
    paymentMethod: ''
  });

  // Carregar formas de pagamento cadastradas no sistema
  useEffect(() => {
    const fetchMethods = async () => {
        const { data } = await db.paymentMethods().select('name').order('name');
        if (data) {
            setPaymentMethods(data);
            if (data.length > 0) setFormData(prev => ({ ...prev, paymentMethod: data[0].name }));
        }
    };
    fetchMethods();
  }, []);

  const handleSave = async () => {
    if (!formData.description || !formData.value || !formData.paymentMethod) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const valNumber = parseFloat(formData.value.replace(',', '.')) || 0;

      // 1. Salvar Transação na tabela 'transactions'
      // TYPE e CATEGORY são fixos como "DESPESA" conforme solicitado
      await addTransaction({
        date: formData.date,
        operation: 'COMPRA', // Representa saída financeira
        type: 'DESPESA' as any,
        category: 'DESPESA',
        item: formData.description, // Coluna 'item' recebe a descrição
        val: -Math.abs(valNumber), // Salva como negativo (saída)
        payment_method: formData.paymentMethod,
        pro: proName, // Nome do colaborador automático
        professional_id: proId,
        status: 'Pago'
      });

      // 2. Notificar Administrador
      await addNotification({
        type: 'FINANCEIRO',
        title: '📉 Despesa de Colaborador',
        message: `${proName} lançou: ${formData.description} (R$ ${valNumber.toFixed(2)}) pago via ${formData.paymentMethod}.`,
        link: '/financial/log'
      });

      alert('Despesa lançada com sucesso!');
      navigate('/menu');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar despesa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold tracking-tight pr-8">Lançar Despesa</h1>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto bg-white pt-8">
        <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 flex gap-4 items-center">
          <div className="bg-blue-900 p-2.5 rounded-2xl text-white shadow-sm">
            <Info size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-blue-900 font-black leading-tight uppercase tracking-wider">
              Registro de Gasto Interno
            </p>
            <p className="text-[10px] text-blue-700 font-medium mt-0.5">
              Utilize para gastos com água, café, limpeza, etc.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* DATA */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Data da Despesa</label>
            <div className="relative">
              <input 
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 shadow-sm"
              />
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            </div>
          </div>

          {/* DESCRIÇÃO (ITEM) */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Descrição / O que comprou?</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Ex: Copos descartáveis 200ml"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 shadow-sm"
              />
              <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* VALOR (VAL) */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Valor Gasto</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: e.target.value})}
                  placeholder="0,00"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-10 outline-none focus:ring-1 focus:ring-blue-900 font-black text-lg text-gray-800 shadow-sm"
                />
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>

            {/* FORMA DE PAGAMENTO (METHOD) */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 px-1">Pagamento via</label>
              <div className="relative">
                <select 
                  value={formData.paymentMethod}
                  onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-10 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-xs appearance-none shadow-sm"
                >
                  {paymentMethods.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>
          </div>

          {/* INDICADOR AUTOMÁTICO DE COLABORADOR */}
          <div className="pt-2 px-1">
             <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                <CheckCircle2 size={12} className="text-green-500" />
                Lançado por: <span className="text-blue-900">{proName}</span>
             </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[#1e3a8a] text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 mt-8 mb-12"
        >
          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={22} />}
          {loading ? 'Processando...' : 'Confirmar Lançamento'}
        </button>
      </div>
    </div>
  );
};

export default CollaboratorExpenseForm;
