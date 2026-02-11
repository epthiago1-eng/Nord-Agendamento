
import React, { useState, useEffect } from 'react';
import { ChevronLeft, X, Calendar, DollarSign, Tag, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { addTransaction } from '../data/transactions';

const FinancialForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const userRole = localStorage.getItem('user_role') || 'ADMIN';
  
  // Identificação dinâmica do lançador
  const userName = localStorage.getItem('user_name') || (userRole === 'ADMIN' ? 'Administrador' : 'Colaborador');

  const [type, setType] = useState<'income' | 'expense'>(userRole === 'COLLABORATOR' ? 'income' : 'income');
  const [formData, setFormData] = useState({
    item: '',
    val: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Dinheiro' as any,
    category: 'Serviço' as any,
    status: 'Pago' as any,
    observation: ''
  });

  const handleSave = () => {
    if (!formData.item || !formData.val) {
      alert('Preencha a descrição e o valor.');
      return;
    }

    const valueNum = parseFloat(formData.val.replace(',', '.'));
    
    addTransaction({
      type,
      category: formData.category,
      item: formData.item,
      val: type === 'expense' ? -Math.abs(valueNum) : valueNum,
      method: formData.method,
      pro: userName, // Salva quem lançou para auditoria correta
      date: formData.date,
      status: formData.status
    });

    alert('Lançamento realizado com sucesso!');
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">
          {id ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto flex-1 bg-white">
        {userRole === 'ADMIN' ? (
          <div className="bg-gray-50 p-1.5 rounded-2xl flex">
            <button 
              onClick={() => setType('income')}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}
            >
              Receita
            </button>
            <button 
              onClick={() => setType('expense')}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}
            >
              Despesa
            </button>
          </div>
        ) : (
            <div className="bg-blue-50 p-4 rounded-2xl flex items-center justify-between border border-blue-100">
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Tipo de Lançamento</span>
                <span className="bg-white px-4 py-1 rounded-full text-[10px] font-black text-green-600 uppercase">Receita de Venda</span>
            </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">O que foi vendido/gasto?</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.item}
                onChange={e => setFormData({...formData, item: e.target.value})}
                placeholder="Ex: Corte Degradê ou Pomada"
                className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-bold pl-11"
              />
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Valor (R$)</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.val}
                onChange={e => setFormData({...formData, val: e.target.value})}
                placeholder="0,00"
                className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-black text-xl pl-11"
              />
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Data</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Categoria</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as any})}
                className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-4 appearance-none outline-none shadow-sm text-gray-700 font-bold"
              >
                <option value="Serviço">Serviço</option>
                <option value="Produto">Produto</option>
                {userRole === 'ADMIN' && <option value="Despesa Fixa">Despesa Fixa</option>}
                {userRole === 'ADMIN' && <option value="Comissão">Comissão</option>}
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Forma de Pagamento</label>
            <select 
              value={formData.method}
              onChange={e => setFormData({...formData, method: e.target.value as any})}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-4 appearance-none outline-none shadow-sm text-gray-700 font-bold"
            >
              <option>Dinheiro</option>
              <option>Pix</option>
              <option>Cartão de Crédito</option>
              <option>Cartão de Débito</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Lançado por: <span className="text-blue-900">{userName}</span></p>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-[#1e3a8a] text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 mt-4"
        >
          <CheckCircle2 size={20} />
          Salvar Lançamento
        </button>
      </div>
    </div>
  );
};

export default FinancialForm;
