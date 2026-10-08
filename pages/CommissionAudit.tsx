import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, Calendar, Filter, DollarSign, CheckCircle2, 
  AlertCircle, Loader2, CheckSquare, Square, Search
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTransactions, payCommissions } from '../data/transactions';
import { db } from '../supabase';

const CommissionAudit: React.FC = () => {
  const navigate = useNavigate();
  const { proName } = useParams();
  
  // Filtros
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'custom'>('week');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [typeFilter, setTypeFilter] = useState<'all' | 'Serviço' | 'Produto'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Dados
  const [transactions, setTransactions] = useState<any[]>([]);
  const [proDetails, setProDetails] = useState<any>(null);
  
  // Seleção para Pagamento
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Configuração Inicial de Datas (Semana Atual)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay())); 
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    
    setDateRange({
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    });
  }, []);

  const handleSetView = (mode: 'week' | 'month') => {
    setViewMode(mode);
    const today = new Date();
    let start = '', end = '';

    if (mode === 'week') {
        const first = new Date(today.setDate(today.getDate() - today.getDay()));
        const last = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        start = first.toISOString().split('T')[0];
        end = last.toISOString().split('T')[0];
    } else {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    setDateRange({ start, end });
  };

  // Carrega Transações e Dados do Profissional
  const fetchData = async () => {
    if (!proName) return;
    setLoading(true);
    try {
        const decodedName = decodeURIComponent(proName);
        
        // Busca Pro ID pelo nome exato para garantir o vínculo de UUID
        const { data: pros } = await db.professionals().select('*').ilike('name', decodedName);
        const currentPro = pros?.[0];
        if (currentPro) setProDetails(currentPro);

        // Busca transações
        const allTrans = await getTransactions();
        
        // Filtra localmente
        const filtered = allTrans.filter(t => 
            (t.pro === decodedName || (currentPro && t.professional_id === currentPro.id)) && 
            t.operation === 'VENDA' && 
            t.date >= dateRange.start && 
            t.date <= dateRange.end
        );

        setTransactions(filtered);
    } catch (err) {
        console.error("Erro ao carregar auditoria:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange.start && dateRange.end && proName) {
        fetchData();
        setSelectedIds([]); 
    }
  }, [dateRange, proName]);

  // Cálculos
  const displayedTransactions = useMemo(() => {
    return transactions.filter(t => {
        if (typeFilter !== 'all' && t.category !== typeFilter) return false;
        if (statusFilter === 'pending' && t.commission_paid) return false;
        if (statusFilter === 'paid' && !t.commission_paid) return false;
        return true;
    }).map(t => {
        const rate = t.category === 'Serviço' ? 0.4 : 0.1;
        const commValue = t.val * rate;
        return { ...t, commissionValue: commValue, rateLabel: `${rate * 100}%` };
    });
  }, [transactions, typeFilter, statusFilter]);

  const totals = useMemo(() => {
    return displayedTransactions.reduce((acc, t) => ({
        produced: acc.produced + t.val,
        commission: acc.commission + t.commissionValue
    }), { produced: 0, commission: 0 });
  }, [displayedTransactions]);

  const selectedTotal = useMemo(() => {
    return displayedTransactions
        .filter(t => selectedIds.includes(t.id))
        .reduce((sum, t) => sum + t.commissionValue, 0);
  }, [selectedIds, displayedTransactions]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const pendentesIds = displayedTransactions.filter(t => !t.commission_paid).map(t => t.id);
    const allSelected = pendentesIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : pendentesIds);
  };

  const handlePayCommissions = async () => {
    if (selectedIds.length === 0) return;
    
    let targetProId = proDetails?.id;
    const decodedName = decodeURIComponent(proName || 'Profissional');

    if (!window.confirm(`Confirmar o pagamento de R$ ${selectedTotal.toFixed(2)} para ${decodedName}?`)) {
        return;
    }

    setProcessing(true);
    try {
        await payCommissions(selectedIds, selectedTotal, decodedName, targetProId);
        
        alert(`✅ Baixa concluída! Foram liquidados ${selectedIds.length} itens.`);
        setSelectedIds([]); 
        await fetchData(); 
    } catch (err: any) {
        console.error('Erro na baixa:', err);
        alert(`Erro ao processar: ${err.message}`);
    } finally {
        setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
            <div>
                <h1 className="text-sm font-medium opacity-80 uppercase tracking-wider">Auditoria de Comissão</h1>
                <p className="text-lg font-bold leading-none">{proName ? decodeURIComponent(proName) : '...'}</p>
            </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 overflow-hidden">
            {proDetails?.avatar ? <img src={proDetails.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">PRO</div>}
        </div>
      </header>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-32">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex bg-gray-50 p-1 rounded-xl">
                <button onClick={() => handleSetView('week')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-400'}`}>Semana</button>
                <button onClick={() => handleSetView('month')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-400'}`}>Mês</button>
            </div>
            
            <div className="flex gap-2">
                <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-700" />
                <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-700" />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setTypeFilter('all')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${typeFilter === 'all' ? 'bg-blue-900 text-white' : 'bg-white text-gray-400'}`}>Tudo</button>
                <button onClick={() => setTypeFilter('Serviço')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${typeFilter === 'Serviço' ? 'bg-blue-900 text-white' : 'bg-white text-gray-400'}`}>Serviços</button>
                <button onClick={() => setTypeFilter('Produto')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${typeFilter === 'Produto' ? 'bg-blue-900 text-white' : 'bg-white text-gray-400'}`}>Produtos</button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Produzido</p>
                <p className="text-lg font-black text-gray-900">R$ {totals.produced.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm text-center">
                <p className="text-[9px] font-bold text-blue-400 uppercase">Comissão</p>
                <p className="text-lg font-black text-blue-900">R$ {totals.commission.toFixed(2).replace('.', ',')}</p>
            </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <button onClick={toggleSelectAll} className="text-gray-400">
                        {displayedTransactions.filter(t => !t.commission_paid).length > 0 && selectedIds.length === displayedTransactions.filter(t => !t.commission_paid).length ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Selecionar Tudo</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setStatusFilter('all')} className={`text-[9px] font-bold ${statusFilter === 'all' ? 'text-blue-900' : 'text-gray-400'}`}>TUDO</button>
                    <button onClick={() => setStatusFilter('pending')} className={`text-[9px] font-bold ${statusFilter === 'pending' ? 'text-blue-900' : 'text-gray-400'}`}>PENDENTES</button>
                </div>
            </div>

            {loading ? (
                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-900" /></div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {displayedTransactions.length === 0 ? (
                        <p className="p-8 text-center text-xs text-gray-400 italic">Nenhum registro.</p>
                    ) : (
                        displayedTransactions.map(t => (
                            <div key={t.id} className={`p-4 flex items-center justify-between transition-colors ${selectedIds.includes(t.id) ? 'bg-blue-50/50' : ''}`}>
                                <div className="flex items-center gap-3">
                                    {t.commission_paid ? (
                                        <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                                    ) : (
                                        <button onClick={() => toggleSelect(t.id)} className="text-gray-300">
                                            {selectedIds.includes(t.id) ? <CheckSquare size={18} className="text-blue-900" /> : <Square size={18} />}
                                        </button>
                                    )}
                                    <div>
                                        <p className="text-xs font-bold text-gray-800 line-clamp-1">{t.item}</p>
                                        <p className="text-[9px] text-gray-400 uppercase">
                                            {new Date(t.date).toLocaleDateString('pt-BR')} • {t.category} • {t.rateLabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black ${t.commission_paid ? 'text-green-600' : 'text-gray-900'}`}>
                                        R$ {t.commissionValue.toFixed(2).replace('.', ',')}
                                    </p>
                                    {t.commission_paid && <span className="text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">PAGO</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-xl z-[100] animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Valor da Baixa</p>
                    <p className="text-2xl font-black text-blue-900">R$ {selectedTotal.toFixed(2).replace('.', ',')}</p>
                </div>
                <button 
                    onClick={handlePayCommissions}
                    disabled={processing}
                    className="bg-green-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2"
                >
                    {processing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Dar Baixa
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default CommissionAudit;