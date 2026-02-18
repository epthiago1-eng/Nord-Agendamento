
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Users, ShoppingBag, ClipboardList, Wallet, 
  Calendar, CheckCircle2, TrendingUp, User, CheckSquare, Square, 
  DollarSign, X, Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTransactions, Transaction, processCommissionPayment } from '../data/transactions';
import { db } from '../supabase';

const ProfessionalPerformanceDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id: proId } = useParams();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [proDetails, setProDetails] = useState<any>(null);
  const [commissionConfigs, setCommissionConfigs] = useState<any[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<string, string>>({}); 

  // Filtros
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Controle de Seleção
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethodsList, setPaymentMethodsList] = useState<any[]>([]);

  // Inicializa Datas
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setDateRange({ start, end });
  }, []);

  // Carrega Dados
  const loadData = async () => {
    if (!proId) return;
    setLoading(true);
    try {
      const { data: pro } = await db.professionals().select('*').eq('id', proId).single();
      if (pro) setProDetails(pro);

      const { data: configs } = await db.professionalServices().select('*').eq('professional_id', proId);
      if (configs) setCommissionConfigs(configs);

      const { data: services } = await db.services().select('id, name');
      if (services) {
          const map: Record<string, string> = {};
          services.forEach(s => map[s.name] = s.id);
          setServicesMap(map);
      }

      const { data: methods } = await db.paymentMethods().select('name');
      if (methods) {
          setPaymentMethodsList(methods);
          if (methods.length > 0) setPaymentMethod(methods[0].name);
      }

      const all = await getTransactions();
      const proTrans = all.filter(t => 
          t.operation === 'VENDA' && 
          (t.professional_id === proId || (pro && t.pro === pro.name))
      );
      setTransactions(proTrans);
      setSelectedIds([]); // Limpa seleção ao recarregar

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [proId]);

  const calculateCommission = (transaction: Transaction) => {
    const serviceId = servicesMap[transaction.item];
    const config = commissionConfigs.find(c => c.service_id === serviceId);
    let commValue = 0;
    
    if (config) {
        if (config.commission_type === 'percent') {
            commValue = transaction.val * (config.commission_value / 100);
        } else {
            commValue = config.commission_value;
        }
    } else {
        const rate = transaction.category === 'Serviço' ? 0.4 : 0.1;
        commValue = transaction.val * rate;
    }
    return commValue;
  };

  // Cálculo do Saldo Pendente Global (Independente do filtro de data)
  const totalPendingCommission = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (!t.commission_paid) {
        return acc + calculateCommission(t);
      }
      return acc;
    }, 0);
  }, [transactions, commissionConfigs, servicesMap]);

  const stats = useMemo(() => {
    const filtered = transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end);
    
    let grossTotal = 0;
    let commTotal = 0;
    let serviceCount = 0;
    let serviceTotal = 0;
    let productCount = 0;
    let productTotal = 0;
    
    const servicesCounter: Record<string, number> = {};
    const productsCounter: Record<string, number> = {};
    const uniqueClients = new Set();

    const detailedLog = filtered.map(t => {
        const comm = calculateCommission(t);
        
        grossTotal += t.val;
        commTotal += comm;
        if (t.client_supplier) uniqueClients.add(t.client_supplier);

        if (t.category === 'Serviço' || t.type === 'SERVIÇO') {
            serviceCount++;
            serviceTotal += t.val;
            servicesCounter[t.item] = (servicesCounter[t.item] || 0) + 1;
        } else {
            productCount += (t.quantity || 1);
            productTotal += t.val;
            productsCounter[t.item] = (productsCounter[t.item] || 0) + (t.quantity || 1);
        }

        return { ...t, commissionValue: comm, netValue: t.val - comm };
    });

    const topService = Object.entries(servicesCounter).sort((a, b) => b[1] - a[1])[0] || ['Nenhum', 0];
    const topProduct = Object.entries(productsCounter).sort((a, b) => b[1] - a[1])[0] || ['Nenhum', 0];

    return {
        grossTotal,
        commTotal,
        netTotal: grossTotal - commTotal,
        serviceCount,
        serviceTotal,
        productCount,
        productTotal,
        clientCount: uniqueClients.size,
        topService: { name: topService[0], count: topService[1] },
        topProduct: { name: topProduct[0], count: topProduct[1] },
        log: detailedLog
    };
  }, [transactions, dateRange, commissionConfigs, servicesMap]);

  // Resumo da Seleção para o Modal
  const selectionSummary = useMemo(() => {
    const items = stats.log.filter(t => selectedIds.includes(t.id));
    if (items.length === 0) return null;

    const totalCommission = items.reduce((sum, t) => sum + t.commissionValue, 0);
    const totalServices = items.filter(t => t.category === 'Serviço' || t.type === 'SERVIÇO').length;
    const totalProducts = items.filter(t => t.category === 'Produto' || t.type === 'PRODUTO').length;
    
    // Ordena por data para pegar primeira e última
    const sortedDates = items.map(t => t.date).sort();
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];

    return {
        totalCommission,
        count: items.length,
        totalServices,
        totalProducts,
        firstDate,
        lastDate
    };
  }, [selectedIds, stats.log]);

  const setFilter = (mode: 'week' | 'month') => {
    setViewMode(mode);
    const now = new Date();
    let start = '', end = '';

    if (mode === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        const sunday = new Date(now.setDate(monday.getDate() + 6));
        start = monday.toISOString().split('T')[0];
        end = sunday.toISOString().split('T')[0];
    } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    setDateRange({ start, end });
  };

  // Toggle de Checkbox
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePay = async () => {
    if (!selectionSummary || !paymentMethod) {
        alert('Selecione uma forma de pagamento.');
        return;
    }

    setProcessing(true);
    try {
        await processCommissionPayment(
            selectedIds,
            selectionSummary.totalCommission,
            proDetails?.name || 'Profissional',
            paymentMethod,
            {
                startDate: selectionSummary.firstDate,
                endDate: selectionSummary.lastDate,
                serviceCount: selectionSummary.totalServices,
                productCount: selectionSummary.totalProducts
            },
            proId
        );
        
        setShowPaymentModal(false);
        alert('Pagamento de comissão registrado com sucesso!');
        loadData(); // Recarrega para atualizar os status

    } catch (err: any) {
        alert('Erro: ' + err.message);
    } finally {
        setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff] relative">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center pr-8">
            <h1 className="text-lg font-bold tracking-tight">{proDetails?.name || 'Profissional'}</h1>
            <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">Performance Individual</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        
        {/* Filtro */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex shadow-sm">
            <button onClick={() => setFilter('week')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${viewMode === 'week' ? 'bg-blue-50 text-blue-900 shadow-sm' : 'text-gray-400'}`}>Semana</button>
            <button onClick={() => setFilter('month')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${viewMode === 'month' ? 'bg-blue-50 text-blue-900 shadow-sm' : 'text-gray-400'}`}>Mês</button>
        </div>

        {/* Big Numbers */}
        <div className="grid grid-cols-1 gap-3">
            <div className="bg-blue-900 text-white p-5 rounded-[2rem] shadow-xl relative overflow-hidden">
                 <div className="absolute right-[-10px] top-[-10px] opacity-10"><Wallet size={100} /></div>
                 
                 <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Faturamento Bruto</p>
                        <p className="text-3xl font-black">R$ {stats.grossTotal.toFixed(2).replace('.', ',')}</p>
                    </div>
                    {/* Display for Total Pending Commission */}
                    <div className="bg-blue-800/50 p-2 rounded-xl border border-blue-500/30 backdrop-blur-sm text-right min-w-[100px]">
                         <p className="text-[8px] text-blue-200 font-bold uppercase tracking-wider mb-0.5">Saldo Pendente</p>
                         <p className="text-sm font-black text-white">R$ {totalPendingCommission.toFixed(2).replace('.', ',')}</p>
                    </div>
                 </div>

                 <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                    <div>
                        <p className="text-[9px] text-blue-300 font-bold uppercase">Comissão (Período)</p>
                        <p className="text-lg font-black text-orange-300">R$ {stats.commTotal.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-blue-300 font-bold uppercase">Líquido (Período)</p>
                        <p className="text-lg font-black text-green-300">R$ {stats.netTotal.toFixed(2).replace('.', ',')}</p>
                    </div>
                 </div>
            </div>
        </div>

        {/* Histórico com Checkbox */}
        <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pl-2">Histórico para Baixa</h3>
            <div className="space-y-2">
                {stats.log.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 italic py-8">Nenhum registro neste período.</p>
                ) : (
                    stats.log.map((t) => {
                        const isSelected = selectedIds.includes(t.id);
                        return (
                            <div 
                                key={t.id} 
                                onClick={() => !t.commission_paid && toggleSelect(t.id)}
                                className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-2 transition-all active:scale-[0.99] ${
                                    t.commission_paid 
                                    ? 'border-green-100 bg-green-50/20 opacity-80' 
                                    : isSelected 
                                        ? 'border-blue-300 ring-1 ring-blue-300 bg-blue-50/30' 
                                        : 'border-gray-100'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        {/* Checkbox ou Status Pago */}
                                        <div className="shrink-0">
                                            {t.commission_paid ? (
                                                <div className="bg-green-100 text-green-600 p-1.5 rounded-lg">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            ) : (
                                                <div className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'text-blue-900' : 'text-gray-300'}`}>
                                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <p className={`text-xs font-black line-clamp-1 ${t.commission_paid ? 'text-green-800' : 'text-gray-900'}`}>
                                                {t.item}
                                                {t.commission_paid && <span className="ml-2 text-[8px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded uppercase">Pago</span>}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
                                                {new Date(t.date).toLocaleDateString('pt-BR')} • {t.category}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-800">R$ {t.val.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Comissão</span>
                                    <span className={`font-black px-2 py-0.5 rounded-md ${t.commission_paid ? 'text-green-700 bg-green-100' : 'text-blue-600 bg-blue-50'}`}>
                                        + R$ {t.commissionValue.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>

      {/* Floating Action Bar (Barra de Baixa) */}
      {selectedIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[60] animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between gap-4">
                  <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Selecionado</p>
                      <p className="text-2xl font-black text-blue-900">
                          R$ {selectionSummary?.totalCommission.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500">{selectedIds.length} itens</p>
                  </div>
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-green-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center gap-2"
                  >
                      <DollarSign size={16} />
                      Baixar Comissão
                  </button>
              </div>
          </div>
      )}

      {/* Modal de Pagamento */}
      {showPaymentModal && selectionSummary && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-blue-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Wallet size={16} /> Resumo do Pagamento
                    </h3>
                    <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-xs text-gray-500 font-bold">Colaborador</span>
                        <span className="text-xs text-gray-900 font-black">{proDetails?.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-xs text-gray-500 font-bold">Período</span>
                        <span className="text-[10px] text-gray-900 font-black uppercase">
                            {new Date(selectionSummary.firstDate).toLocaleDateString('pt-BR')} até {new Date(selectionSummary.lastDate).toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                    <div className="flex justify-between pt-1">
                        <div className="text-center flex-1 border-r border-gray-200">
                            <span className="block text-xl font-black text-blue-900">{selectionSummary.totalServices}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase">Serviços</span>
                        </div>
                        <div className="text-center flex-1">
                            <span className="block text-xl font-black text-orange-500">{selectionSummary.totalProducts}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase">Produtos</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Forma de Pagamento</label>
                    <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-white border-2 border-blue-100 rounded-xl py-3 px-4 font-bold text-gray-700 text-sm outline-none focus:border-blue-500"
                    >
                        <option value="">Selecione...</option>
                        {paymentMethodsList.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                </div>

                <div className="pt-2">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Total a Pagar</span>
                        <span className="text-2xl font-black text-green-600">R$ {selectionSummary.totalCommission.toFixed(2).replace('.', ',')}</span>
                    </div>
                    
                    <button 
                        onClick={handlePay}
                        disabled={processing}
                        className="w-full bg-green-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        Confirmar Pagamento
                    </button>
                    <button 
                        onClick={() => setShowPaymentModal(false)}
                        className="w-full bg-transparent text-gray-400 font-bold py-3 mt-2 text-xs uppercase"
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

export default ProfessionalPerformanceDetails;
