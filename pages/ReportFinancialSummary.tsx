
import React from 'react';
import { ChevronLeft, TrendingUp, TrendingDown, CreditCard, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Smartphone, ClipboardList, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockFinancialData = {
  gross: 12500.00,
  expenses: 4200.00,
  net: 8300.00,
  servicesTotal: 9800.00,
  productsTotal: 2700.00,
  payments: [
    { method: 'Dinheiro', total: 4500.00, count: 85, color: 'text-green-600', bg: 'bg-green-50', icon: DollarSign },
    { method: 'Pix', total: 3200.00, count: 62, color: 'text-blue-600', bg: 'bg-blue-50', icon: Smartphone },
    { method: 'Cartão de Crédito', total: 3800.00, count: 45, color: 'text-purple-600', bg: 'bg-purple-50', icon: CreditCard },
    { method: 'Cartão de Débito', total: 1000.00, count: 18, color: 'text-orange-600', bg: 'bg-orange-50', icon: CreditCard },
  ]
};

const ReportFinancialSummary: React.FC = () => {
  const navigate = useNavigate();

  const servicePercent = (mockFinancialData.servicesTotal / (mockFinancialData.servicesTotal + mockFinancialData.productsTotal)) * 100;

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Resumo Financeiro</h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        <div className="flex justify-center">
            <button className="bg-white px-5 py-2 rounded-full border border-gray-100 text-xs font-bold text-blue-900 shadow-sm uppercase tracking-wider">
                Fevereiro 2026
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
                <p className="text-4xl font-black text-gray-900 tracking-tight">R$ {mockFinancialData.gross.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg shadow-red-900/5">
                    <div className="flex items-center gap-2 mb-2 text-red-500">
                        <ArrowDownRight size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Despesas</span>
                    </div>
                    <p className="text-xl font-black text-gray-900">R$ {mockFinancialData.expenses.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="bg-[#1e3a8a] p-6 rounded-[2rem] shadow-2xl shadow-blue-900/30 ring-4 ring-blue-50">
                    <div className="flex items-center gap-2 mb-2 text-blue-200">
                        <Wallet size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Saldo Líquido</span>
                    </div>
                    <p className="text-xl font-black text-white">R$ {mockFinancialData.net.toFixed(2).replace('.', ',')}</p>
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
                    <p className="font-black text-gray-900">R$ {mockFinancialData.servicesTotal.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-orange-600">
                        <ShoppingBag size={16} />
                        <span className="text-[10px] font-bold uppercase">Total Produtos</span>
                    </div>
                    <p className="font-black text-gray-900">R$ {mockFinancialData.productsTotal.toFixed(2).replace('.', ',')}</p>
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
                {mockFinancialData.payments.map((p, idx) => (
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
