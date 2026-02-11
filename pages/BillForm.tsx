
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Receipt, DollarSign, Calendar, RefreshCw, 
  BellRing, CheckCircle2, XCircle, Trash2, Info, Clock 
} from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const BillForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const editData = location.state?.bill;

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

  useEffect(() => {
    if (editData) {
      setFormData({
        description: editData.description || '',
        value: editData.value ? editData.value.toFixed(2).replace('.', ',') : '',
        dueDate: editData.dueDate || new Date().toISOString().split('T')[0],
        recurring: editData.recurring || false,
        category: editData.category || 'Fixo',
        reminderDays: '3',
        observation: ''
      });
      setIsPaid(editData.status === 'PAID');
    }
  }, [editData]);

  const handleSave = (markAsPaid = false) => {
    if (!formData.description) {
      alert('A descrição é obrigatória.');
      return;
    }

    if (markAsPaid && !formData.value) {
      alert('Para marcar como PAGA, é obrigatório informar o valor líquido pago.');
      return;
    }

    const action = id ? 'atualizada' : 'cadastrada';
    const statusMsg = markAsPaid ? 'e liquidada com sucesso!' : 'com sucesso!';
    
    alert(`Conta ${action} ${statusMsg}`);
    navigate('/bills');
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-bold tracking-tight">
          {id ? 'Detalhes da Conta' : 'Nova Conta'}
        </h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto flex-1 bg-white">
        
        {/* Status Badge */}
        {id && (
            <div className={`p-4 rounded-3xl flex items-center justify-between ${isPaid ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                <div className="flex items-center gap-2">
                    {isPaid ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                    <span className="text-xs font-black uppercase tracking-widest">{isPaid ? 'Esta conta foi paga' : 'Pagamento Pendente'}</span>
                </div>
                {!isPaid && (
                  <button className="text-[10px] font-black underline uppercase">Ver Log</button>
                )}
            </div>
        )}

        <div className="space-y-4">
          {/* Descrição */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Descrição do Gasto</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Ex: Conta de Luz / Aluguel"
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-12 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-bold"
              />
              <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Valor Previsto (R$)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: e.target.value})}
                  placeholder="0,00"
                  className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-10 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-black"
                />
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              </div>
              <p className="text-[9px] text-gray-400 mt-1.5 pl-1 italic leading-tight">Deixe vazio se o valor variar cada mês.</p>
            </div>
            {/* Vencimento */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Vencimento</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Recorrência e Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">É Recorrente?</label>
                <button 
                    onClick={() => setFormData({...formData, recurring: !formData.recurring})}
                    className={`w-full py-4 rounded-2xl border transition-all flex items-center justify-center gap-2 ${
                        formData.recurring ? 'bg-blue-900 border-blue-900 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                >
                    <RefreshCw size={16} className={formData.recurring ? 'animate-spin-slow' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{formData.recurring ? 'Sim' : 'Não'}</span>
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
                    <option>Marketing</option>
                </select>
            </div>
          </div>

          {/* Lembrete Automático */}
          <div className="bg-orange-50/50 p-5 rounded-[2rem] border border-orange-100 space-y-3">
              <div className="flex items-center gap-2 text-orange-900">
                <BellRing size={18} className="animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Aviso de Vencimento</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-orange-700">Me avisar</span>
                <input 
                    type="number" 
                    value={formData.reminderDays}
                    onChange={e => setFormData({...formData, reminderDays: e.target.value})}
                    className="w-16 bg-white border border-orange-200 rounded-xl py-2 px-3 text-center font-black text-orange-900"
                />
                <span className="text-[11px] font-bold text-orange-700">dias antes.</span>
              </div>
          </div>

          {/* Observação */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Notas Internas</label>
            <textarea 
              value={formData.observation}
              onChange={e => setFormData({...formData, observation: e.target.value})}
              placeholder="Ex: Pagar via conta do Itaú..."
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none shadow-sm text-gray-700"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 mb-12">
          {!isPaid && (
            <button 
                onClick={() => handleSave(true)}
                className="w-full bg-green-600 text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
            >
                <CheckCircle2 size={20} />
                Confirmar Pagamento
            </button>
          )}
          
          <button 
            onClick={() => handleSave(false)}
            className="w-full bg-[#1e3a8a] text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3"
          >
            {id ? 'Atualizar Dados' : 'Salvar como Pendente'}
          </button>
          
          {id && (
            <button 
              onClick={() => { if(confirm('Excluir esta conta permanentemente?')) navigate('/bills'); }}
              className="w-full bg-red-50 text-red-500 font-black py-4 rounded-2xl active:scale-95 transition-transform uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Excluir Registro
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillForm;
