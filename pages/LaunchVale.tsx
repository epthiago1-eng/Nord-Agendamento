import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Loader2, Banknote, Calendar, FileText, DollarSign } from 'lucide-react';
import { addTransaction } from '../data/transactions';

const LaunchVale: React.FC = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const proId = localStorage.getItem('user_pro_id');
  const proName = localStorage.getItem('user_name');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason || !proId) {
        alert('Preencha todos os campos.');
        return;
    }

    setLoading(true);
    try {
      const val = parseFloat(amount.replace(',', '.'));
      if (isNaN(val) || val <= 0) {
          alert('Valor inválido.');
          setLoading(false);
          return;
      }

      await addTransaction({
        type: 'VALE',
        category: 'Adiantamento',
        operation: 'COMPRA', // Saída de caixa
        val: -Math.abs(val), // Negativo no fluxo de caixa
        item: `Vale - ${reason}`,
        professional_id: proId,
        client_supplier: proName || 'Colaborador',
        date: date,
        status: 'Pago', // Saiu do caixa
        payment_method: 'Dinheiro' // Assumindo dinheiro por enquanto
      });
      
      alert('Vale lançado com sucesso!');
      navigate('/menu');
    } catch (error) {
      alert('Erro ao lançar vale');
      console.error(error);
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
        <div className="flex-1 text-center pr-8">
            <h1 className="text-lg font-bold tracking-tight">Solicitar Vale</h1>
            <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">Adiantamento</p>
        </div>
      </header>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600 shrink-0">
                <Banknote size={24} />
            </div>
            <div>
                <h3 className="text-blue-900 font-black text-xs uppercase tracking-widest mb-1">Como funciona?</h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                    O valor solicitado será registrado como uma saída do caixa e será <strong>descontado automaticamente</strong> do seu próximo pagamento de comissões.
                </p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1 flex items-center gap-2">
                    <Calendar size={12} /> Data da Retirada
                </label>
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-4 font-bold text-gray-700 text-sm outline-none focus:border-blue-500 transition-all"
                    required
                />
            </div>

            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1 flex items-center gap-2">
                    <DollarSign size={12} /> Valor (R$)
                </label>
                <input 
                    type="number" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-4 font-bold text-gray-700 text-lg outline-none focus:border-blue-500 transition-all"
                    required
                />
            </div>

            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1 flex items-center gap-2">
                    <FileText size={12} /> Motivo / Descrição
                </label>
                <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Adiantamento para almoço..."
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3 px-4 font-bold text-gray-700 text-sm outline-none focus:border-blue-500 transition-all h-24 resize-none"
                    required
                />
            </div>

            <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-8"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Confirmar Vale
            </button>
        </form>
      </div>
    </div>
  );
};

export default LaunchVale;
