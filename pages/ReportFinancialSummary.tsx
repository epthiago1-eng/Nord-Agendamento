
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, TrendingUp, TrendingDown, CreditCard, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Smartphone, ClipboardList, ShoppingBag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../supabase';

const ReportFinancialSummary: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    gross: 0,
    expenses: 0,
    net: 0,
    servicesTotal: 0,
    productsTotal: 0,
    payments: [] as any[]
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: transactions } = await db.transactions()
          .select('*')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        if (!transactions) return;

        let gross = 0;
        let expenses = 0;
        let servicesTotal = 0;
        let productsTotal = 0;
        const paymentMap: Record<string, { total: number, count: number }> = {};

        transactions.forEach(t => {
          if (t.operation === 'VENDA') {
            const val = Math.abs(t.val);
            gross += val;
            
            if (t.category === 'Produto' || t.type === 'PRODUTO') {
              productsTotal += val;
            } else if (t.category !== 'Gorjeta' && t.type !== 'GORJETA') {
              servicesTotal += val;
            }

            const method = t.payment_method || 'Outros';
            if (!paymentMap[method]) paymentMap[method] = { total: 0, count: 0 };
            paymentMap[method].total += val;
            paymentMap[method].count += 1;
          } else if (t.operation === 'DESPESA') {
            expenses += Math.abs(t.val);
          }
        });

        const payments = Object.entries(paymentMap).map(([method, stats]) => {
          let icon = CreditCard;
          let color = 'text-blue-600';
          let bg = 'bg-blue-50';

          if (method === 'Dinheiro') { icon = DollarSign; color = 'text-green-600'; bg = 'bg-green-50'; }
          if (method === 'Pix') { icon = Smartphone; color = 'text-blue-600'; bg = 'bg-blue-50'; }
          if (method.includes('Crédito')) { icon = CreditCard; color = 'text-purple-600'; bg = 'bg-purple-50'; }
          if (method.includes('Débito')) { icon = CreditCard; color = 'text-orange-600'; bg = 'bg-orange-50'; }

          return { method, ...stats, icon, color, bg };
        });

        setData({
          gross,
          expenses,
          net: gross - expenses,
          servicesTotal,
          productsTotal,
          payments: payments.sort((a, b) => b.total - a.total)
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const servicePercent = useMemo(() => {
    const total = data.servicesTotal + data.productsTotal;
    if (total === 0) return 100;
    return (data.servicesTotal / total) * 100;
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#fcfaff]">
        <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
          <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft size={24} /></button>
          <h1 className="flex-1 text-center text-lg font-medium mr-8">Resumo Financeiro</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-900" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Resumo Financeiro</h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        <div className="flex justify-center">
            <button className="bg-white px-5 py-2 rounded-full border border-gray-100 text-xs font-bold text-blue-900 shadow-sm uppercase tracking-wider">
                {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </button>
        </div>

        {/* High-Level Financial Cards */}
        <div className="space-y-4">
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                    <TrendingUp size={200} />
                </div>
                <div className="flex items-center gap-3 mb-2 text-green-600">
                    <div className="bg-green-50 p-2.5 rounded-2xl"><ArrowUpRight size={22} /></div>
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Faturamento Bruto</span>
                </div>
                <p className="text-4xl font-black text-gray-900 tracking-tight">R$ {data.gross.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg shadow-red-900/5">
                    <div className="flex items-center gap-2 mb-2 text-red-500">
                        <ArrowDownRight size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Despesas</span>
                    </div>
                    <p className="text-xl font-black text-gray-900">R$ {data.expenses.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="bg-[#1e3a8a] p-6 rounded-[2rem] shadow-2xl shadow-blue-900/30 ring-4 ring-blue-50">
                    <div className="flex items-center gap-2 mb-2 text-blue-200">
                        <Wallet size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Saldo Líquido</span>
                    </div>
                    <p className="text-xl font-black text-white">R$ {data.net.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>
        </div>

        {/* Product vs Service Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
            <div className="flex justify-between items-center">
                <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest">Mix de Vendas</h3>
                <div className="flex gap-4 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-blue-600">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div> Serviços
                    </div>
                    <div className="flex items-center gap-1.5 text-orange-500">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div> Produtos
                    </div>
                </div>
            </div>
            
            {/* Progress Bar Visualization */}
            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-600" style={{ width: `${servicePercent}%` }}></div>
                <div className="h-full bg-orange-500" style={{ width: `${100 - servicePercent}%` }}></div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-900">
                        <ClipboardList size={16} />
                        <span className="text-[10px] font-bold uppercase">Total Serviços</span>
                    </div>
                    <p className="font-black text-gray-900">R$ {data.servicesTotal.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-orange-600">
                        <ShoppingBag size={16} />
                        <span className="text-[10px] font-bold uppercase">Total Produtos</span>
                    </div>
                    <p className="font-black text-gray-900">R$ {data.productsTotal.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>
        </div>

        {/* Payments Breakdown */}
        <div className="space-y-4">
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-[0.2em] pl-2 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-900" />
                Por Meio de Pagamento
            </h3>
            <div className="grid grid-cols-1 gap-3">
                {data.payments.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-100 text-gray-400 text-[10px] font-bold uppercase">Sem vendas registradas</div>
                ) : data.payments.map((p, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-4">
                            <div className={`${p.bg} ${p.color} p-3.5 rounded-2xl shadow-inner`}>
                                <p.icon size={22} />
                            </div>
                            <div>
                                <h4 className="text-gray-900 font-black text-sm tracking-tight">{p.method}</h4>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{p.count} vendas</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-gray-900 font-black text-lg">R$ {p.total.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportFinancialSummary;
