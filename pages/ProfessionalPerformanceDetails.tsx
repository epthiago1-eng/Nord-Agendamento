
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Users, ShoppingBag, ClipboardList, Wallet, 
  Calendar, CheckCircle2, TrendingUp, User, CheckSquare, Square, 
  DollarSign, X, Loader2, Edit2, AlertCircle, Save, Banknote, Trash2,
  Clock, Search, Filter
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTransactions, Transaction, processCommissionPayment, addTransaction, deleteTransaction } from '../data/transactions';
import { db } from '../supabase';

const ProfessionalPerformanceDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id: proId } = useParams();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allPendingTransactions, setAllPendingTransactions] = useState<Transaction[]>([]);
  const [historyTab, setHistoryTab] = useState<'pending' | 'period' | 'paid'>('pending');
  const [pendingSearch, setPendingSearch] = useState('');
  const [proDetails, setProDetails] = useState<any>(null);
  const [auditConfirmed, setAuditConfirmed] = useState(true);
  const [commissionConfigs, setCommissionConfigs] = useState<any[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<string, string>>({}); 

  // Filtros de Data
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'custom'>('week');
  const [currentRefDate, setCurrentRefDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Controle de Seleção
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethodsList, setPaymentMethodsList] = useState<any[]>([]);

  // Helper para calcular intervalo
  const getRange = (mode: 'week' | 'month', refDate: Date) => {
    const start = new Date(refDate);
    const end = new Date(refDate);

    if (mode === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
        start.setDate(diff);
        end.setDate(start.getDate() + 6); // Domingo
    } else {
        start.setDate(1);
        end.setMonth(start.getMonth() + 1);
        end.setDate(0);
    }
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
  };

  // Inicializa e Atualiza Datas
  useEffect(() => {
    if (viewMode === 'custom') return;
    const { start, end } = getRange(viewMode, currentRefDate);
    setDateRange({ start, end });
  }, [viewMode, currentRefDate]);

  // Navegação de Data
  const handlePrev = () => {
    const newDate = new Date(currentRefDate);
    if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentRefDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentRefDate);
    if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentRefDate(newDate);
  };

  // Carrega Dados
  const loadData = async (force = false) => {
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

      // 1. Busca transações do período
      const all = await getTransactions({
          startDate: dateRange.start,
          endDate: dateRange.end,
          proId: proId
      });
      // Filtra para mostrar apenas Vendas e Vales na performance (exclui pagamentos de comissão que são 'COMPRA')
      const filtered = all.filter(t => t.operation === 'VENDA' || t.type === 'VALE');
      setTransactions(filtered);

      // 2. Busca TODAS as transações do profissional para garantir que comissões de períodos anteriores não fiquem esquecidas
      const allPro = await getTransactions({ proId: proId });
      const pendingList = allPro.filter(t => 
        (t.operation === 'VENDA' || t.type === 'VALE') && !t.commission_paid
      );
      setAllPendingTransactions(pendingList);

      setSelectedIds([]); // Limpa seleção ao recarregar
      setAuditConfirmed(true);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadData(true);
    }
  }, [proId, dateRange]);

  const calculateCommission = (transaction: Transaction) => {
    // 0. Se for VALE, retorna valor negativo (Dedução)
    if (transaction.type === 'VALE') {
        return -Math.abs(transaction.val);
    }

    // 1. Se houver comissão sobrescrita no banco, usa ela (prioridade máxima)
    if (transaction.commission_value !== undefined && transaction.commission_value !== null) {
        return transaction.commission_type === 'percent' 
            ? transaction.val * (transaction.commission_value / 100)
            : transaction.commission_value;
    }

    // 2. Se já tiver o valor calculado salvo na transação, usa ele (Novo Padrão)
    if (transaction.commission_amount !== undefined && transaction.commission_amount !== null) {
        return transaction.commission_amount;
    }

    // 3. Se for gorjeta, o colaborador recebe 100% integralmente
    if (transaction.category === 'Gorjeta' || transaction.type === 'GORJETA') {
        return transaction.val;
    }

    // 4. Se for OUTROS, retorna 0 (Pendente) a menos que tenha sido sobrescrito acima
    // IMPORTANTE: Apenas type === 'OUTROS' deve cair aqui. Serviços normais devem ter fallback.
    if (transaction.type === 'OUTROS') {
        return 0;
    }

    // 5. Busca regra específica do serviço/produto
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
        // Fallback Padrão: 40% para Serviços, 10% para Produtos
        // Se não for OUTROS, aplica regra padrão mesmo sem config específica
        const rate = (transaction.category === 'Serviço' || transaction.type === 'SERVIÇO') ? 0.4 : 0.1;
        commValue = transaction.val * rate;
    }
    return commValue;
  };

  // Cálculo do Saldo Pendente Global (Independente do filtro de data)
  const totalPendingCommission = useMemo(() => {
    return allPendingTransactions.reduce((acc, t) => {
      return acc + calculateCommission(t);
    }, 0);
  }, [allPendingTransactions, commissionConfigs, servicesMap]);

  // Quantidade e valor de pendências de períodos anteriores (antes de dateRange.start)
  const priorPendingStats = useMemo(() => {
    const priorItems = allPendingTransactions.filter(t => t.date < dateRange.start);
    const priorTotal = priorItems.reduce((acc, t) => acc + calculateCommission(t), 0);
    return {
      count: priorItems.length,
      total: priorTotal,
      items: priorItems
    };
  }, [allPendingTransactions, dateRange.start, commissionConfigs, servicesMap]);

  const stats = useMemo(() => {
    const filtered = transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end);
    
    let grossTotal = 0;
    let commTotal = 0;
    let grossCommission = 0;
    let valesTotal = 0;
    let serviceCount = 0;
    let serviceTotal = 0;
    let productCount = 0;
    let productTotal = 0;
    
    const servicesCounter: Record<string, number> = {};
    const productsCounter: Record<string, number> = {};
    const uniqueClients = new Set();

    const detailedLog = filtered.map(t => {
        const comm = calculateCommission(t);
        
        if (t.type === 'VALE') {
            valesTotal += Math.abs(t.val);
        } else {
            grossCommission += comm;
            grossTotal += t.val;
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
        }
        commTotal += comm;

        return { ...t, commissionValue: comm, netValue: t.val - comm, isPrior: t.date < dateRange.start };
    });

    const topService = Object.entries(servicesCounter).sort((a, b) => b[1] - a[1])[0] || ['Nenhum', 0];
    const topProduct = Object.entries(productsCounter).sort((a, b) => b[1] - a[1])[0] || ['Nenhum', 0];

    return {
        grossTotal,
        grossCommission,
        commTotal, // Net Commission
        valesTotal,
        netTotal: grossTotal - grossCommission, 
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

  // Lista de itens a serem exibidos de acordo com a aba selecionada
  const displayedLog = useMemo(() => {
    let source: Transaction[] = [];

    if (historyTab === 'pending') {
      // TODAS as comissões pendentes (incluindo anteriores)
      source = allPendingTransactions;
    } else if (historyTab === 'paid') {
      // Transações pagas do período
      source = transactions.filter(t => t.commission_paid);
    } else {
      // Transações do período (ambas)
      source = transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end);
    }

    const processed = source.map(t => {
      const comm = calculateCommission(t);
      const isPrior = t.date < dateRange.start;
      return {
        ...t,
        commissionValue: comm,
        netValue: t.val - comm,
        isPrior
      };
    });

    if (pendingSearch) {
      const term = pendingSearch.toLowerCase();
      return processed.filter(t => 
        (t.client_supplier && t.client_supplier.toLowerCase().includes(term)) ||
        (t.item && t.item.toLowerCase().includes(term))
      );
    }

    return processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyTab, allPendingTransactions, transactions, dateRange.start, dateRange.end, pendingSearch, commissionConfigs, servicesMap]);

  // Itens pendentes disponíveis para seleção na visualização atual
  const selectablePendingItems = useMemo(() => {
    return displayedLog.filter(t => !t.commission_paid);
  }, [displayedLog]);

  const isAllPendingSelected = selectablePendingItems.length > 0 && 
    selectablePendingItems.every(t => selectedIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (isAllPendingSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectablePendingItems.map(t => t.id));
    }
  };

  // Resumo da Seleção para o Modal
  const selectionSummary = useMemo(() => {
    // Busca os itens selecionados em displayedLog e em allPendingTransactions
    const poolMap = new Map<string, any>();
    displayedLog.forEach(t => poolMap.set(t.id, t));
    allPendingTransactions.forEach(t => {
      if (!poolMap.has(t.id)) {
        poolMap.set(t.id, {
          ...t,
          commissionValue: calculateCommission(t),
          isPrior: t.date < dateRange.start
        });
      }
    });

    const items = selectedIds.map(id => poolMap.get(id)).filter(Boolean);
    if (items.length === 0) return null;

    const totalCommission = items.reduce((sum, t) => sum + (t.commissionValue || 0), 0);
    const totalServices = items.filter(t => t.category === 'Serviço' || t.type === 'SERVIÇO').length;
    const totalProducts = items.filter(t => t.category === 'Produto' || t.type === 'PRODUTO').length;
    const totalVales = items.filter(t => t.type === 'VALE').length;
    
    // Ordena por data para pegar primeira e última
    const sortedDates = items.map(t => t.date).sort();
    const firstDate = sortedDates[0] || new Date().toISOString().split('T')[0];
    const lastDate = sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0];

    return {
        totalCommission,
        count: items.length,
        totalServices,
        totalProducts,
        totalVales,
        firstDate,
        lastDate
    };
  }, [selectedIds, displayedLog, allPendingTransactions, dateRange.start, commissionConfigs, servicesMap]);



  // Toggle de Checkbox
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePay = async () => {
    if (!selectionSummary || !paymentMethod) {
        alert('Selecione uma forma de pagamento.');
        return;
    }

    // Verifica se há itens com comissão pendente (valor 0 e não pago)
    const pendingItems = displayedLog.filter(t => selectedIds.includes(t.id) && t.commissionValue === 0 && !t.commission_paid);
    if (pendingItems.length > 0) {
        alert(`Atenção: Existem ${pendingItems.length} itens selecionados com comissão pendente (R$ 0,00). Defina a comissão antes de realizar o pagamento.`);
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

  const [editCommissionModal, setEditCommissionModal] = useState<{show: boolean, transaction: Transaction | null, value: string, type: 'percent' | 'fixed'}>({
    show: false,
    transaction: null,
    value: '',
    type: 'percent'
  });

  const handleEditCommission = (t: Transaction) => {
    // Se já foi pago, não deve editar (ou deve avisar)
    if (t.commission_paid) {
        alert('Esta comissão já foi paga e não pode ser editada.');
        return;
    }

    // Calcula o valor atual para mostrar no input
    const currentComm = calculateCommission(t);
    // Tenta inferir se é porcentagem ou fixo baseado no valor salvo, ou padrão percent
    const initialType = t.commission_type || 'percent';
    const initialValue = t.commission_value !== undefined ? t.commission_value : (initialType === 'percent' ? (currentComm / t.val) * 100 : currentComm);

    setEditCommissionModal({
        show: true,
        transaction: t,
        value: initialValue ? initialValue.toString() : '',
        type: initialType
    });
  };

  const saveCommissionEdit = async () => {
    if (!editCommissionModal.transaction || !editCommissionModal.value) return;

    setProcessing(true);
    try {
        const val = parseFloat(editCommissionModal.value.replace(',', '.'));
        if (isNaN(val) || val < 0) {
            alert('Valor inválido');
            return;
        }

        const { error } = await db.transactions()
            .update({
                commission_value: val,
                commission_type: editCommissionModal.type
            })
            .eq('id', editCommissionModal.transaction.id);

        if (error) throw error;

        // Notifica o colaborador sobre a atualização da comissão
        if (editCommissionModal.transaction.professional_id) {
            await db.notifications().insert({
                type: 'FINANCEIRO',
                title: 'Comissão Atualizada',
                message: `A comissão do item "${editCommissionModal.transaction.item}" foi atualizada para ${editCommissionModal.type === 'percent' ? editCommissionModal.value + '%' : 'R$ ' + editCommissionModal.value}.`,
                recipient_pro_id: editCommissionModal.transaction.professional_id,
                link: '/collaborator/financial',
                read: false,
                created_at: new Date().toISOString()
            });
        }

        setEditCommissionModal({ show: false, transaction: null, value: '', type: 'percent' });
        loadData(); // Recarrega para atualizar a UI
        alert('Comissão salva com sucesso!');
    } catch (err: any) {
        alert('Erro ao salvar comissão: ' + err.message);
    } finally {
        setProcessing(false);
    }
  };

    const [showValeModal, setShowValeModal] = useState(false);
    const [valeAmount, setValeAmount] = useState('');
    const [valeReason, setValeReason] = useState('');
    const [valeDate, setValeDate] = useState(new Date().toISOString().split('T')[0]);

    const handleLaunchVale = async () => {
        if (!valeAmount || !valeReason) {
            alert('Preencha valor e motivo.');
            return;
        }
        setProcessing(true);
        try {
            const val = parseFloat(valeAmount.replace(',', '.'));
            if (isNaN(val) || val <= 0) {
                alert('Valor inválido.');
                return;
            }

            await addTransaction({
                type: 'VALE',
                category: 'Adiantamento',
                operation: 'COMPRA',
                val: -Math.abs(val),
                item: `Vale - ${valeReason}`,
                professional_id: proId,
                client_supplier: proDetails?.name || 'Profissional',
                date: valeDate,
                status: 'Pago',
                payment_method: 'Dinheiro'
            });

            setShowValeModal(false);
            setValeAmount('');
            setValeReason('');
            loadData();
            alert('Vale lançado com sucesso!');
        } catch (err: any) {
            alert('Erro ao lançar vale: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const [deleteValeModal, setDeleteValeModal] = useState<{show: boolean, id: string | null}>({
        show: false,
        id: null
    });

    const confirmDeleteVale = (id: string) => {
        setDeleteValeModal({ show: true, id });
    };

    const handleDeleteVale = async () => {
        if (!deleteValeModal.id) return;
        
        setProcessing(true);
        try {
            await deleteTransaction(deleteValeModal.id);
            loadData();
            setDeleteValeModal({ show: false, id: null });
            alert('Vale excluído com sucesso.');
        } catch (err: any) {
            alert('Erro ao excluir vale: ' + err.message);
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
        
        {/* Filtro de Período */}
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex bg-gray-50 p-1 rounded-xl">
                <button onClick={() => { setViewMode('week'); setCurrentRefDate(new Date()); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'week' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}>Semana</button>
                <button onClick={() => { setViewMode('month'); setCurrentRefDate(new Date()); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'month' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}>Mês</button>
                <button onClick={() => setViewMode('custom')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'custom' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}>Outro</button>
            </div>

            {viewMode !== 'custom' ? (
                <div className="flex items-center justify-between px-2">
                    <button onClick={handlePrev} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronLeft size={20} /></button>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                            {viewMode === 'week' ? 'Semana de' : 'Mês de'}
                        </p>
                        <p className="text-sm font-black text-blue-900">
                            {new Date(dateRange.start + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            {' - '}
                            {new Date(dateRange.end + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                    </div>
                    <button onClick={handleNext} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronRight size={20} /></button>
                </div>
            ) : (
                <div className="flex gap-2 items-center px-2">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold text-gray-600 py-2 px-3" />
                    <span className="text-gray-300">-</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold text-gray-600 py-2 px-3" />
                </div>
            )}
        </div>

        {/* Filtro de Período */}
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex bg-gray-50 p-1 rounded-xl">
                <button onClick={() => { setViewMode('week'); setCurrentRefDate(new Date()); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'week' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}>Semana</button>
                <button onClick={() => { setViewMode('month'); setCurrentRefDate(new Date()); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'month' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}>Mês</button>
                <button onClick={() => setViewMode('custom')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'custom' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}>Outro</button>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 px-2">
                {viewMode !== 'custom' ? (
                    <div className="flex items-center justify-between flex-1 w-full">
                        <button onClick={handlePrev} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronLeft size={20} /></button>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                {viewMode === 'week' ? 'Semana de' : 'Mês de'}
                            </p>
                            <p className="text-sm font-black text-blue-900">
                                {new Date(dateRange.start + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                {' - '}
                                {new Date(dateRange.end + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </p>
                        </div>
                        <button onClick={handleNext} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronRight size={20} /></button>
                    </div>
                ) : (
                    <div className="flex gap-2 items-center flex-1 w-full">
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold text-gray-600 py-2 px-3" />
                        <span className="text-gray-300">-</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-gray-50 border-none rounded-lg text-xs font-bold text-gray-600 py-2 px-3" />
                    </div>
                )}
                
                <button 
                    onClick={() => loadData(true)}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200 active:scale-95"
                >
                    <CheckCircle2 size={14} /> Confirmar e Carregar
                </button>
            </div>
        </div>

        {!auditConfirmed ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 shadow-sm">
                <div className="bg-blue-50 p-6 rounded-full text-blue-300">
                    <Calendar size={48} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-gray-900">Aguardando Confirmação</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 max-w-[240px] mx-auto">
                        Selecione o período desejado e clique em confirmar para carregar a performance.
                    </p>
                </div>
            </div>
        ) : loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-blue-600" size={40} />
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Carregando dados...</p>
            </div>
        ) : (
            <>
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
                                {stats.valesTotal > 0 && (
                                    <div className="flex flex-col items-start mt-1 opacity-80">
                                        <span className="text-[8px] text-blue-200 font-bold uppercase">Bruto: R$ {stats.grossCommission.toFixed(2).replace('.', ',')}</span>
                                        <span className="text-[8px] text-red-300 font-bold uppercase">Vales: - R$ {stats.valesTotal.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-blue-300 font-bold uppercase">Líquido (Período)</p>
                                <p className="text-lg font-black text-green-300">R$ {stats.netTotal.toFixed(2).replace('.', ',')}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowValeModal(true)}
                            className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                            <Banknote size={16} /> Lançar Vale / Adiantamento
                        </button>
                    </div>
                </div>

                {/* Alerta de Comissões Pendentes de Períodos Anteriores */}
                {priorPendingStats.count > 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <div className="text-xs space-y-1">
                            <p className="font-black uppercase tracking-wider text-[11px] text-amber-800">
                                Atenção: {priorPendingStats.count} {priorPendingStats.count === 1 ? 'comissão pendente' : 'comissões pendentes'} de períodos anteriores
                            </p>
                            <p className="text-amber-700 font-medium leading-relaxed">
                                Valor acumulado anterior: <strong className="font-bold">R$ {priorPendingStats.total.toFixed(2).replace('.', ',')}</strong>. Elas estão listadas abaixo com destaque para não ficarem esquecidas e facilitar a quitação!
                            </p>
                        </div>
                    </div>
                )}

                {/* Histórico com Checkbox e Acerto */}
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div>
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <ClipboardList size={16} className="text-blue-900" /> Acerto de Contas & Comissões
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                Selecione os itens para realizar o pagamento
                            </p>
                        </div>

                        {/* Abas de Visualização (Pendentes vs Período vs Pagas) */}
                        <div className="flex bg-gray-100 p-1 rounded-2xl">
                            <button 
                                onClick={() => { setHistoryTab('pending'); setSelectedIds([]); }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${historyTab === 'pending' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Clock size={12} />
                                Pendentes ({allPendingTransactions.length})
                            </button>
                            <button 
                                onClick={() => { setHistoryTab('period'); setSelectedIds([]); }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${historyTab === 'period' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Calendar size={12} />
                                Período ({stats.log.length})
                            </button>
                            <button 
                                onClick={() => { setHistoryTab('paid'); setSelectedIds([]); }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${historyTab === 'paid' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <CheckCircle2 size={12} />
                                Pagas
                            </button>
                        </div>
                    </div>

                    {/* Barra de Ações: Busca e Botão MARCAR TODAS */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                value={pendingSearch} 
                                onChange={e => setPendingSearch(e.target.value)}
                                placeholder="Buscar por cliente ou serviço..."
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-900"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        </div>

                        {selectablePendingItems.length > 0 && (
                            <button
                                type="button"
                                onClick={handleToggleSelectAll}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm ${
                                    isAllPendingSelected
                                        ? 'bg-blue-900 text-white'
                                        : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                                }`}
                            >
                                {isAllPendingSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                <span>{isAllPendingSelected ? 'Desmarcar Todas' : 'Marcar Todas as Pendentes'}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isAllPendingSelected ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-900'}`}>
                                    {selectablePendingItems.length}
                                </span>
                            </button>
                        )}
                    </div>

                    <div className="space-y-2 pt-1">
                        {displayedLog.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 space-y-2">
                                <Wallet size={36} className="mx-auto opacity-30 text-blue-900" />
                                <p className="text-xs font-bold uppercase tracking-wider">
                                    {historyTab === 'pending' ? 'Nenhuma comissão pendente encontrada.' : 'Nenhum registro para exibir.'}
                                </p>
                            </div>
                        ) : (
                            displayedLog.map((t) => {
                                const isSelected = selectedIds.includes(t.id);
                                return (
                                    <div 
                                        key={t.id} 
                                        onClick={() => !t.commission_paid && toggleSelect(t.id)}
                                        className={`p-4 rounded-2xl border shadow-sm flex flex-col gap-2 transition-all ${
                                            !t.commission_paid ? 'cursor-pointer active:scale-[0.99]' : ''
                                        } ${
                                            t.commission_paid 
                                            ? 'border-green-100 bg-green-50/20 opacity-80' 
                                            : isSelected 
                                                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40' 
                                                : t.isPrior
                                                    ? 'border-amber-200 bg-amber-50/30'
                                                    : 'border-gray-100 bg-white hover:border-gray-200'
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
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className={`text-xs font-black line-clamp-1 ${t.commission_paid ? 'text-green-800' : 'text-gray-900'}`}>
                                                            {t.item}
                                                            {t.commission_paid && <span className="ml-2 text-[8px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded uppercase">Pago</span>}
                                                        </p>
                                                        {t.isPrior && !t.commission_paid && (
                                                            <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-black uppercase tracking-wider flex items-center gap-1">
                                                                <Clock size={10} /> Período Anterior ({new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')})
                                                            </span>
                                                        )}
                                                        {t.appointment_id && (
                                                            <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                                                                ID: {t.appointment_id.slice(0, 8)}...
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                        <span>{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                        <span>•</span>
                                                        <span>{t.category}</span>
                                                        {t.client_supplier && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-blue-600 font-black">{t.client_supplier}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${t.type === 'VALE' ? 'text-red-500' : 'text-gray-800'}`}>
                                                    {t.type === 'VALE' ? '-' : ''} R$ {Math.abs(t.val).toFixed(2).replace('.', ',')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-gray-400 uppercase tracking-wider">{t.type === 'VALE' ? 'Dedução' : 'Comissão'}</span>
                                            <div className="flex items-center gap-2">
                                                {t.commissionValue === 0 && !t.commission_paid && t.type !== 'VALE' ? (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEditCommission(t); }}
                                                        className="bg-red-100 text-red-600 px-2 py-1 rounded-md font-black uppercase tracking-wider hover:bg-red-200 transition-colors flex items-center gap-1"
                                                    >
                                                        <AlertCircle size={10} /> Pendente (Definir)
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {!t.commission_paid && t.type !== 'VALE' && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleEditCommission(t); }}
                                                                className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
                                                                title="Editar Comissão"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                        )}
                                                        {t.type === 'VALE' && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); confirmDeleteVale(t.id); }}
                                                                className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors mr-1"
                                                                title="Excluir Vale"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                        <span className={`font-black px-2 py-0.5 rounded-md ${t.commission_paid ? 'text-green-700 bg-green-100' : (t.type === 'VALE' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50')}`}>
                                                            {t.type === 'VALE' ? '-' : '+'} R$ {Math.abs(t.commissionValue).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão de Vale */}
      {deleteValeModal.show && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-red-600 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Trash2 size={16} /> Excluir Vale
                    </h3>
                    <button onClick={() => setDeleteValeModal({ show: false, id: null })} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 items-start">
                        <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-800 font-medium leading-relaxed">
                            Tem certeza que deseja excluir este vale? Esta ação não pode ser desfeita e o valor será removido dos cálculos.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setDeleteValeModal({ show: false, id: null })}
                            className="flex-1 bg-gray-100 text-gray-500 font-bold py-3.5 rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDeleteVale}
                            disabled={processing}
                            className="flex-1 bg-red-600 text-white font-black py-3.5 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-700"
                        >
                            {processing ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Modal de Lançar Vale */}
      {showValeModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-blue-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Banknote size={16} /> Lançar Vale
                    </h3>
                    <button onClick={() => setShowValeModal(false)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Data</label>
                        <input 
                            type="date" 
                            value={valeDate}
                            onChange={(e) => setValeDate(e.target.value)}
                            className="w-full bg-white border-2 border-blue-100 rounded-xl py-3 px-4 font-bold text-gray-700 text-sm outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Valor (R$)</label>
                        <input 
                            type="number" 
                            value={valeAmount}
                            onChange={(e) => setValeAmount(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-white border-2 border-blue-100 rounded-xl py-3 px-4 font-bold text-gray-700 text-lg outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Motivo</label>
                        <input 
                            type="text" 
                            value={valeReason}
                            onChange={(e) => setValeReason(e.target.value)}
                            placeholder="Ex: Adiantamento"
                            className="w-full bg-white border-2 border-blue-100 rounded-xl py-3 px-4 font-bold text-gray-700 text-sm outline-none focus:border-blue-500"
                        />
                    </div>

                    <button 
                        onClick={handleLaunchVale}
                        disabled={processing}
                        className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Confirmar Lançamento
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Modal de Edição de Comissão */}
      {editCommissionModal.show && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-blue-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Edit2 size={16} /> Editar Comissão
                    </h3>
                    <button onClick={() => setEditCommissionModal({...editCommissionModal, show: false})} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Item</p>
                        <p className="text-sm font-black text-blue-900">{editCommissionModal.transaction?.item}</p>
                        <p className="text-[10px] text-blue-500 font-bold mt-1">Valor Venda: R$ {editCommissionModal.transaction?.val.toFixed(2)}</p>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setEditCommissionModal({...editCommissionModal, type: 'percent'})}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${editCommissionModal.type === 'percent' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                        >
                            Porcentagem (%)
                        </button>
                        <button 
                            onClick={() => setEditCommissionModal({...editCommissionModal, type: 'fixed'})}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${editCommissionModal.type === 'fixed' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                        >
                            Valor Fixo (R$)
                        </button>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
                            {editCommissionModal.type === 'percent' ? 'Porcentagem da Comissão' : 'Valor da Comissão'}
                        </label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={editCommissionModal.value}
                                onChange={(e) => setEditCommissionModal({...editCommissionModal, value: e.target.value})}
                                placeholder="0,00"
                                className="w-full bg-white border-2 border-blue-100 rounded-xl py-3 px-4 pl-10 font-bold text-gray-700 text-sm outline-none focus:border-blue-500"
                                autoFocus
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                {editCommissionModal.type === 'percent' ? '%' : 'R$'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex gap-2 items-start">
                        <AlertCircle size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-yellow-800 leading-tight">
                            Esta alteração sobrescreve a regra padrão apenas para este lançamento.
                        </p>
                    </div>

                    <button 
                        onClick={saveCommissionEdit}
                        disabled={processing}
                        className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Salvar Comissão
                    </button>
                </div>
            </div>
        </div>
      )}

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
                        <div className="text-center flex-1 border-l border-gray-200">
                            <span className="block text-xl font-black text-red-500">{selectionSummary.totalVales}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase">Vales</span>
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
