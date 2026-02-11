
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, Wallet, TrendingUp, ShoppingBag, ClipboardList, 
  Star, User, Calendar, PlusCircle, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, Transaction } from '../data/transactions';

const CollaboratorFinancial: React.FC = () => {
  const navigate = useNavigate();
  // Busca o nome real do usuário salvo no login
  const proName = localStorage.getItem('user_name') || 'Colaborador';
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions());

  useEffect(() => {
    const handleUpdate = () => setTransactions(getTransactions());
    window.addEventListener('transaction_added', handleUpdate);
    return () => window.removeEventListener('transaction_added', handleUpdate);
  }, []);

  const myStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let daily = 0, dailyCount = 0, monthServ = 0, monthProd = 0;
    
    // Filtra transações onde o campo 'pro' bate exatamente com o nome logado
    transactions.filter(t => t.pro === proName).forEach(t => {
      if (t.type === 'income') {
        if (t.date === today) {
          daily += t.val;
          dailyCount++;
        }
        if (t.category === 'Serviço') monthServ += t.val;
        if (t.category === 'Produto') monthProd += t.val;
      }
    });

    const comm = (monthServ * 0.4) + (monthProd * 0.1);
    return { daily, dailyCount, monthServ, monthProd, commission: comm };
  }, [transactions, proName]);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/menu')}><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8 tracking-tight">Meu Desempenho</h1>
      </header>

      <div className="p-4 space-y-5 pb-24 overflow-y-auto">
        
        <button 
          onClick={() => navigate('/financial/new')}
          className="w-full bg-white p-5 rounded-[2rem] border-2 border-dashed border-blue-200 flex items-center justify-between active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-900 text-white p-2.5 rounded-2xl">
              <PlusCircle size={22} />
            </div>
            <div className="text-left">
              <h3 className="text-blue-900 font-black text-xs uppercase tracking-widest">Lançar Nova Venda</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Produto ou Serviço feito agora</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-blue-200" />
        </button>

        <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10 rotate-12"><Wallet size={120} /></div>
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Minha Comissão Estimada</p>
            <h2 className="text-3xl font-black mb-2">R$ {myStats.commission.toFixed(2).replace('.', ',')}</h2>
            <p className="text-[10px] text-blue-200 font-bold uppercase">Baseado em 40% serv. / 10% prod.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                    <TrendingUp size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Hoje</span>
                </div>
                <p className="text-xl font-black text-gray-900">R$ {myStats.daily.toFixed(2).replace('.', ',')}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{myStats.dailyCount} Lançamentos</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 text-blue-900 mb-2">
                    <Calendar size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Produção Total</span>
                </div>
                <p className="text-xl font-black text-gray-900">R$ {(myStats.monthServ + myStats.monthProd).toFixed(2).replace('.', ',')}</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-gray-900 font-black text-xs uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <Star size={14} className="text-yellow-500" /> Detalhes de {proName}
            </h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><ClipboardList size={18} /></div>
                        <span className="text-sm font-bold text-gray-700 tracking-tight">Serviços</span>
                    </div>
                    <span className="font-black text-gray-900">R$ {myStats.monthServ.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-50 p-2 rounded-xl text-orange-500"><ShoppingBag size={18} /></div>
                        <span className="text-sm font-bold text-gray-700 tracking-tight">Produtos</span>
                    </div>
                    <span className="font-black text-gray-900">R$ {myStats.monthProd.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorFinancial;
