
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronDown, ChevronUp, Wallet, DollarSign, 
  Users, ArrowUpRight, ArrowDownRight, History, ArrowRight, RefreshCw, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, Transaction } from '../data/transactions';

const FinancialAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandPayments, setExpandPayments] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Listener para atualizações em tempo real
  useEffect(() => {
    // Busca inicial
    getTransactions().then(setTransactions);

    const handleUpdate = () => {
      setIsUpdating(true);
      getTransactions().then((data) => {
        setTransactions(data);
        setTimeout(() => setIsUpdating(false), 1000);
      });
    };
    window.addEventListener('transaction_added', handleUpdate);
    return () => window.removeEventListener('transaction_added', handleUpdate);
  }, []);

  const totals = useMemo(() => {
    let gross = 0;
    let expenses = 0;
    let pix = 0, credit = 0, debit = 0, cash = 0;
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        gross += t.val;
        if (t.method === 'Pix') pix += t.val;
        else if (t.method === 'Cartão de Crédito') credit += t.val;
        else if (t.method === 'Cartão de Débito') debit += t.val;
        else if (t.method === 'Dinheiro') cash += t.val;
      } else {
        expenses += Math.abs(t.val);
      }
    });

    return { gross, expenses, net: gross - expenses, pix, credit, debit, cash };
  }, [transactions]);

  // Cálculo de comissões dinâmico por colaborador
  const commissionsByPro = useMemo(() => {
    const map: Record<string, { service: number, product: number }> = {};
    transactions.forEach(t => {
      if (t.type === 'income' && t.pro !== 'Admin') {
        if (!map[t.pro]) map[t.pro] = { service: 0, product: 0 };
        if (t.category === 'Serviço') map[t.pro].service += t.val * 0.4;
        if (t.category === 'Produto') map[t.pro].product += t.val * 0.1;
      }
    });
    return Object.entries(map).map(([name, vals]) => ({
      name,
      serviceComm: vals.service,
      productComm: vals.product,
      total: vals.service + vals.product
    }));
  }, [transactions]);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/menu')} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight">Gestão Financeira</h1>
            <div className="flex items-center justify-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isUpdating ? 'bg-yellow-400 animate-ping' : 'bg-green-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                    {isUpdating ? 'Atualizando...' : 'Consolidado em tempo real'}
                </span>
            </div>
        </div>
        <button onClick={() => navigate('/financial/log')} className="p-2 bg-blue-800 rounded-xl active:scale-90 border border-blue-700">
          <History size={20} />
        </button>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        <div className="bg-[#1e3a8a] p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden ring-4 ring-blue-50/10">
            <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12"><Wallet size={140} /></div>
            <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Saldo Líquido</p>
            <h2 className="text-4xl font-black mb-6">R$ {totals.net.toFixed(2).replace('.', ',')}</h2>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-800/50">
                <div>
                    <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <ArrowUpRight size={10} className="text-green-400" /> Bruto
                    </p>
                    <p className="text-lg font-black">R$ {totals.gross.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                        <ArrowDownRight size={10} className="text-red-400" /> Gastos
                    </p>
                    <p className="text-lg font-black">R$ {totals.expenses.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>
        </div>

        {/* LOG DE MOVIMENTAÇÕES ACESSO RÁPIDO */}
        <button onClick={() => navigate('/financial/log')} className="w-full bg-white p-5 rounded-[2rem] border border-blue-100 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-900 p-2.5 rounded-2xl group-hover:bg-blue-900 group-hover:text-white transition-colors">
              <History size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-gray-900 font-black text-xs uppercase tracking-widest">Auditar Lançamentos</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Ver logs de colaboradores</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-blue-200 group-hover:text-blue-900 transition-colors" />
        </button>

        {/* COMISSÕES DINÂMICAS */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <Users size={18} className="text-blue-900" />
                <h3 className="text-gray-900 font-black text-xs uppercase tracking-[0.2em]">Comissões Geradas</h3>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-50 px-5 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <span>Profissional</span>
                    <span className="text-center">Produção</span>
                    <span className="text-right">A Pagar</span>
                </div>
                <div className="divide-y divide-gray-50">
                    {commissionsByPro.map((c, i) => (
                        <div 
                            key={i} 
                            onClick={() => navigate(`/financial/commissions/${c.name}`)}
                            className="grid grid-cols-3 px-5 py-4 items-center active:bg-blue-50 cursor-pointer transition-colors group"
                        >
                            <span className="text-xs font-black text-gray-900 flex items-center gap-1">
                                {c.name} <ChevronRight size={12} className="text-gray-300 group-hover:text-blue-500" />
                            </span>
                            <span className="text-center text-[11px] font-bold text-gray-400 italic">40% Serv / 10% Prod</span>
                            <span className="text-right text-xs font-black text-blue-900">R${c.total.toFixed(2).replace('.', ',')}</span>
                        </div>
                    ))}
                    {commissionsByPro.length === 0 && <p className="p-5 text-center text-[10px] text-gray-400 font-bold uppercase">Nenhuma comissão hoje</p>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAdmin;
