
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Filter, 
  TrendingUp, TrendingDown, DollarSign, Users, 
  ShoppingBag, Trash2, Edit2, AlertCircle, BarChart3, Eye, X, Save, Loader2,
  FileSpreadsheet, ArrowLeftRight, MinusCircle, Wallet2, Banknote, Landmark, Clock, CheckCircle2, ClipboardList,
  CheckSquare, Square, Search, Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, deleteTransaction, updateTransaction, Transaction, addTransaction } from '../data/transactions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { db, supabase } from '../supabase'; // Import db and supabase to fetch data
import { getSettings, saveSettings } from '../data/agendaData';
import { EstablishmentSettings } from '../types';

const FinancialAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [weeklyTransactions, setWeeklyTransactions] = useState<Transaction[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any | null>(null);
  const [allBills, setAllBills] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPro, setSelectedPro] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditConfirmed, setAuditConfirmed] = useState(false);
  const [auditTransactions, setAuditTransactions] = useState<Transaction[]>([]);
  const [auditRange, setAuditRange] = useState({ start: '', end: '' });
  const [professionalsMap, setProfessionalsMap] = useState<Record<string, string>>({}); // Name -> ID mapping
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [allProfessionals, setAllProfessionals] = useState<any[]>([]);
  const [commissionConfigs, setCommissionConfigs] = useState<any[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<string, string>>({});
  const [adminPros, setAdminPros] = useState<string[]>([]);
  const [globalBalances, setGlobalBalances] = useState({ cash: 0, pix: 0, card: 0, bank: 0 });
  const [allTransactionsForBalance, setAllTransactionsForBalance] = useState<any[]>([]);
  const [isEditingBalances, setIsEditingBalances] = useState(false);
  const [editableBalances, setEditableBalances] = useState({ cash: 0, pix: 0, card: 0, bank: 0 });

  // Estados de Reconciliação
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [actualBalances, setActualBalances] = useState({ cash: '', pix: '', card: '', bank: '' });

  // Estados dos Modals Gerenciais
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<{show: boolean, type: 'cash' | 'bank' | 'pix' | 'card' | null}>({ show: false, type: null });
  const [showFutureModal, setShowFutureModal] = useState(false);
  const [showPaidDetailsModal, setShowPaidDetailsModal] = useState(false);
  const [expandedAccount, setExpandedAccount] = useState<'CASH' | 'PIX' | 'CARD' | 'BANK' | null>(null);
  const [managerForm, setManagerForm] = useState<{
      amount: string, 
      description: string, 
      target: string, 
      operationType: 'deposit' | 'withdraw' | 'transfer'
  }>({ amount: '', description: '', target: 'bank', operationType: 'deposit' });

  // Estados de Acerto de Contas & Comissões Pendentes
  const [allPendingTransactions, setAllPendingTransactions] = useState<Transaction[]>([]);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementSelectedPro, setSettlementSelectedPro] = useState<string>('all');
  const [settlementFilterScope, setSettlementFilterScope] = useState<'all' | 'period' | 'prior'>('all');
  const [settlementSearchTerm, setSettlementSearchTerm] = useState('');
  const [selectedSettlementIds, setSelectedSettlementIds] = useState<string[]>([]);
  const [settlementPaymentAccount, setSettlementPaymentAccount] = useState<'cash' | 'bank' | 'pix'>('cash');

  // Estados do Modal
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ item: '', val: '', date: '' });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- LÓGICA DE DATAS ---
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para começar na Segunda (ou Domingo)
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    } else {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
    }
    
    // Zera horas para comparação correta
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    return { start, end };
  }, [currentDate, viewMode]);

  // Carregar dados iniciais
  const loadData = async () => {
    setLoading(true);
    try {
      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];

      // Calcular range de 5 semanas para o gráfico histórico
      const now = new Date();
      const day = now.getDay();
      const diffToSunday = day === 0 ? 0 : 7 - day;
      const fiveWeeksEnd = new Date(now);
      fiveWeeksEnd.setDate(now.getDate() + diffToSunday);
      const fiveWeeksStart = new Date(fiveWeeksEnd);
      fiveWeeksStart.setDate(fiveWeeksEnd.getDate() - (5 * 7) + 1);

      const [txData, settingsData, prosRes, servicesRes, configsRes, adminProfilesRes, billsRes, allTxRes, weeklyTxData, allPendingTxRes] = await Promise.all([
          getTransactions({ startDate: startStr, endDate: endStr }),
          getSettings(),
          db.professionals().select('id, name'),
          db.services().select('id, name'),
          db.professionalServices().select('*'),
          db.profiles().select('professional_id').eq('role', 'ADMIN'),
          supabase.from('bills').select('*').gte('due_date', startStr).lte('due_date', endStr),
          supabase.from('transactions').select('val, total_value, payment_method, operation_type, operation, date'),
          getTransactions({ startDate: fiveWeeksStart.toISOString().split('T')[0], endDate: fiveWeeksEnd.toISOString().split('T')[0] }),
          supabase.from('transactions').select('*').or('operation.eq.VENDA,type.eq.VALE').eq('commission_paid', false).order('date', { ascending: false })
      ]);

      setAllTransactions(txData);
      setWeeklyTransactions(weeklyTxData);
      setSettings(settingsData);

      if (allPendingTxRes.data) {
        setAllPendingTransactions(allPendingTxRes.data.map((t: any) => ({
          ...t,
          val: t.total_value || t.val,
          item: t.item || t.description
        })));
      }
      
      // Calcular saldos globais (AGORA ESTÁTICOS DAS CONFIGURAÇÕES)
      if (settingsData) {
          setAllTransactionsForBalance(allTxRes.data || []);
          
          const balances = {
              cash: settingsData.cash_balance || 0,
              pix: settingsData.pix_balance || 0,
              card: settingsData.card_balance || 0,
              bank: settingsData.bank_balance || 0
          };

          setGlobalBalances(balances);
          setEditableBalances(balances);
      }
      
      if (billsRes.data) {
          setAllBills(billsRes.data);
      }
      
      if (adminProfilesRes.data) {
          const adminIds = adminProfilesRes.data.map(p => p.professional_id).filter(Boolean) as string[];
          setAdminPros(adminIds);
      }

      if (prosRes.data) {
          setAllProfessionals(prosRes.data);
          const map: Record<string, string> = {};
          prosRes.data.forEach(p => map[p.name] = p.id);
          setProfessionalsMap(map);
      }

      if (servicesRes.data) {
          const map: Record<string, string> = {};
          servicesRes.data.forEach(s => map[s.name] = s.id);
          setServicesMap(map);
      }

      if (configsRes.data) {
          setCommissionConfigs(configsRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('transaction_added', loadData);
    return () => window.removeEventListener('transaction_added', loadData);
  }, [dateRange]); // Recarrega quando a data muda

  const handleLoadAudit = async () => {
    if (!auditRange.start || !auditRange.end) {
      alert('Por favor, informe o período inicial e final para a auditoria.');
      return;
    }
    setLoadingAudit(true);
    try {
      const data = await getTransactions({ 
        startDate: auditRange.start, 
        endDate: auditRange.end 
      });
      setAuditTransactions(data);
      setAuditConfirmed(true);
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err);
      alert('Erro ao carregar dados da auditoria.');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // --- FILTRAGEM DOS DADOS ---
  const filteredData = useMemo(() => {
    return allTransactions.filter(t => {
      const tDate = new Date(t.date + 'T00:00:00'); // Garante fuso
      const inRange = tDate >= dateRange.start && tDate <= dateRange.end;
      const matchPro = selectedPro === 'all' || t.pro === selectedPro;
      return inRange && matchPro;
    });
  }, [allTransactions, dateRange, selectedPro]);

  // --- CÁLCULO DE GASTOS (PREVISTO VS PAGO) ---
  const monthlyExpenses = useMemo(() => {
    // Previsto: Contas pendentes no período
    const predicted = allBills
      .filter(b => b.status === 'PENDING')
      .reduce((acc, b) => acc + (b.value || 0), 0);
    
    // Pago: Todas as transações de COMPRA pagas no período (inclui contas, comissões, despesas, etc)
    const paidTransactions = allTransactions
      .filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        const inRange = tDate >= dateRange.start && tDate <= dateRange.end;
        return inRange && t.operation === 'COMPRA' && t.status === 'Pago';
      });
      
    const paid = paidTransactions.reduce((acc, t) => acc + Math.abs(t.val), 0);

    return { predicted, paid, paidTransactions };
  }, [allBills, allTransactions, dateRange]);

  // --- EXPORTAÇÃO EXCEL ---
  const exportToExcel = () => {
    const headers = [
      'DATA', 'OPERAÇÃO', 'TIPO', 'COD', 'DESCRIÇÃO', 
      'VR VENDA', 'VR CUSTO', 'QTD', 'TOTAL', 
      'CLIENTE/FORNEC', 'FORMA PAG.', 'PROFISSIONAL', 'STATUS'
    ];
    
    const csvContent = [
      headers.join(';'),
      ...filteredData.map(t => [
        t.date,
        t.operation,
        t.type,
        t.code || '',
        t.item,
        (t.unit_price || 0).toFixed(2).replace('.', ','),
        (t.cost_value || 0).toFixed(2).replace('.', ','),
        t.quantity || 1,
        (t.total_value || t.val).toFixed(2).replace('.', ','),
        t.client_supplier || '',
        t.payment_method,
        t.pro || '',
        t.status
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `relatorio_${viewMode}_${dateRange.start.toLocaleDateString('pt-BR').replace(/\//g, '-')}_${dateRange.end.toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    link.setAttribute('download', filename);
    link.click();
  };

  const calculateCommission = (transaction: Transaction) => {
    if (transaction.type === 'VALE') return -Math.abs(transaction.val);
    if (transaction.commission_value !== undefined && transaction.commission_value !== null) {
        return transaction.commission_type === 'percent' 
            ? transaction.val * (transaction.commission_value / 100)
            : transaction.commission_value;
    }
    if (transaction.commission_amount !== undefined && transaction.commission_amount !== null) return transaction.commission_amount;
    if (transaction.category === 'Gorjeta' || transaction.type === 'GORJETA') return transaction.val;
    if (transaction.type === 'OUTROS') return 0;
    const serviceId = servicesMap[transaction.item];
    const config = commissionConfigs.find(c => c.service_id === serviceId && c.professional_id === (transaction.professional_id || professionalsMap[transaction.pro || '']));
    if (config) {
        return config.commission_type === 'percent' ? transaction.val * (config.commission_value / 100) : config.commission_value;
    }
    const rate = (transaction.category === 'Serviço' || transaction.type === 'SERVIÇO') ? 0.4 : 0.1;
    return transaction.val * rate;
  };

  // --- CÁLCULO GERAL DE COMISSÕES PENDENTES (INDEPENDENTE DO FILTRO DE DATA) ---
  const pendingCommissionsSummary = useMemo(() => {
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];

    const processed = allPendingTransactions.map(t => {
      const comm = calculateCommission(t);
      const isPrior = t.date < startStr;
      const isInPeriod = t.date >= startStr && t.date <= endStr;
      return {
        ...t,
        commissionValue: comm,
        isPrior,
        isInPeriod
      };
    });

    let totalPendingAllTime = 0;
    let totalPendingPrior = 0;
    let totalPendingInPeriod = 0;

    const byPro: Record<string, { totalPending: number, priorPending: number, periodPending: number, items: any[] }> = {};

    processed.forEach(item => {
      const proName = item.pro || 'Outros';
      if (!byPro[proName]) {
        byPro[proName] = { totalPending: 0, priorPending: 0, periodPending: 0, items: [] };
      }

      byPro[proName].totalPending += item.commissionValue;
      byPro[proName].items.push(item);

      totalPendingAllTime += item.commissionValue;

      if (item.isPrior) {
        byPro[proName].priorPending += item.commissionValue;
        totalPendingPrior += item.commissionValue;
      } else if (item.isInPeriod) {
        byPro[proName].periodPending += item.commissionValue;
        totalPendingInPeriod += item.commissionValue;
      }
    });

    return {
      allPendingItems: processed,
      totalPendingAllTime,
      totalPendingPrior,
      totalPendingInPeriod,
      byPro
    };
  }, [allPendingTransactions, dateRange.start, dateRange.end, commissionConfigs, servicesMap, professionalsMap]);

  // --- CÁLCULOS ESTATÍSTICOS ---
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let totalCommissions = 0;
    let pendingCommissions = 0;
    let futureReceivables = 0;
    const futureTransactions: Transaction[] = [];
    
    // Dados para Gráfico Principal
    const chartMap: Record<string, any> = {};
    
    // Dados para Produção de Barbeiros
    const proMap: Record<string, { gross: number, commission: number, pending: number }> = {};

    // Dados para Top Produtos
    const productsMap: Record<string, number> = {};

    // Dados para Top Clientes
    const clientsMap: Record<string, number> = {};

    // Dados por Conta de Pagamento (Somente Entradas conforme solicitado)
    const accountStats: Record<string, { income: number, transactions: Transaction[] }> = {
      'CASH': { income: 0, transactions: [] },
      'PIX': { income: 0, transactions: [] },
      'CARD': { income: 0, transactions: [] },
      'BANK': { income: 0, transactions: [] },
    };

    filteredData.forEach(t => {
      const comm = calculateCommission(t);
      const isIncome = t.operation_type === 'ENTRADA' || t.operation === 'VENDA' || t.val > 0;

      // Totais por Conta (Somente Entradas)
      if (isIncome) {
        const method = (t.payment_method || '').toLowerCase();
        let acc = 'CASH'; // Default
        if (method.includes('pix')) acc = 'PIX';
        else if (method.includes('cartão') || method.includes('cartao') || method.includes('crédito') || method.includes('débito')) acc = 'CARD';
        else if (method.includes('banco') || method.includes('transferência') || method.includes('conta')) acc = 'BANK';
        else if (method.includes('dinheiro')) acc = 'CASH';
        
        // Usa estritamente a lógica do payment_method conforme solicitado
        const finalAcc = acc;

        if (accountStats[finalAcc]) {
          accountStats[finalAcc].income += t.val;
          accountStats[finalAcc].transactions.push(t);
        }
      }

      // Totais Gerais
      if (isIncome) {
        if (t.category !== 'Gorjeta' && t.type !== 'GORJETA') {
          income += t.val;
          totalCommissions += comm;
          if (!t.commission_paid) pendingCommissions += comm;
          
          // A Receber (Futuro) - Exemplo: Cartão de Crédito
          const method = (t.payment_method || '').toLowerCase();
          const isCard = method.includes('cartão') || method.includes('cartao') || method.includes('crédito') || method.includes('débito');
          if (t.payment_account === 'CARD' || isCard) {
              futureReceivables += t.val;
              futureTransactions.push(t);
          }
        }
      } else {
        expense += Math.abs(t.val);
      }

      // Chart Data (Agrupado por dia)
      const dayLabel = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!chartMap[dayLabel]) chartMap[dayLabel] = { name: dayLabel, entrada: 0, saida: 0, lucro: 0, totalVendas: 0 };
      
      if (isIncome) {
        if (t.category !== 'Gorjeta' && t.type !== 'GORJETA') {
          chartMap[dayLabel].entrada += t.val;
          chartMap[dayLabel].lucro += (t.val - comm);
          chartMap[dayLabel].totalVendas += t.val;
          
          const proId = t.professional_id || professionalsMap[t.pro || ''];
          const isAdmin = proId && adminPros.includes(proId);
          const proNameLower = (t.pro || '').toLowerCase();
          const isSystem = ['admin', 'sistema', 'socios', 'sócio', 'sócios'].includes(proNameLower);
          
          // Só inclui se for um profissional cadastrado E não for admin E não for nome de sistema
          // E garantimos que o nome não seja 'Admin' ou 'Sistema' mesmo que tenha proId
          if (proId && !isAdmin && !isSystem) {
              const proName = t.pro || 'Outros';
              chartMap[dayLabel][proName] = (chartMap[dayLabel][proName] || 0) + t.val;
          }
        }
      } else {
        chartMap[dayLabel].saida += Math.abs(t.val);
        chartMap[dayLabel].lucro -= Math.abs(t.val);
      }

      // Produção por Barbeiro
      if (isIncome && t.pro) {
        if (t.category !== 'Gorjeta' && t.type !== 'GORJETA') {
          const proId = t.professional_id || professionalsMap[t.pro];
          const isAdmin = proId && adminPros.includes(proId);
          const proNameLower = t.pro.toLowerCase();
          const isSystem = ['admin', 'sistema', 'socios', 'sócio', 'sócios'].includes(proNameLower);
          
          // Só inclui se for um profissional cadastrado E não for admin E não for nome de sistema
          if (proId && !isAdmin && !isSystem) {
              if (!proMap[t.pro]) proMap[t.pro] = { gross: 0, commission: 0, pending: 0 };
              proMap[t.pro].gross += t.val;
              proMap[t.pro].commission += comm;
              if (!t.commission_paid) proMap[t.pro].pending += comm;
          }
        }
      }

      // Top Produtos
      if (t.type === 'PRODUTO' && isIncome) {
        productsMap[t.item] = (productsMap[t.item] || 0) + (t.quantity || 1);
      }

      // Top Clientes (Frequência)
      if (t.operation === 'VENDA' && t.client_supplier && t.client_supplier !== 'Cliente Avulso') {
        clientsMap[t.client_supplier] = (clientsMap[t.client_supplier] || 0) + 1;
      }
    });

    // Ordenações
    const chartData = Object.values(chartMap).sort((a, b) => {
        const [dA, mA] = a.name.split('/');
        const [dB, mB] = b.name.split('/');
        return new Date(2024, parseInt(mA)-1, parseInt(dA)).getTime() - new Date(2024, parseInt(mB)-1, parseInt(dB)).getTime();
    });

    // Garante que profissionais com saldo pendente apareçam na lista da equipe mesmo se não tiveram produção no período atual
    Object.keys(pendingCommissionsSummary.byPro).forEach(name => {
      if (!proMap[name] && name !== 'Outros' && !['admin', 'sistema', 'socios', 'sócio', 'sócios'].includes(name.toLowerCase())) {
        proMap[name] = { gross: 0, commission: 0, pending: 0 };
      }
    });

    const prosData = Object.entries(proMap)
      .map(([name, data]) => {
        const proSummary = pendingCommissionsSummary.byPro[name];
        const pendingAllTime = proSummary ? proSummary.totalPending : data.pending;
        const pendingPrior = proSummary ? proSummary.priorPending : 0;
        return { 
          name, 
          value: data.gross, 
          commission: data.commission, 
          pending: data.pending, 
          pendingAllTime, 
          pendingPrior 
        };
      })
      .sort((a, b) => b.value - a.value);

    const topProducts = Object.entries(productsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topClients = Object.entries(clientsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Auditoria por Forma de Pagamento (Agrupamento de Itens)
    const auditByMethod: Record<string, Record<string, { count: number, total: number }>> = {
      'CASH': {}, 'PIX': {}, 'CARD': {}, 'BANK': {}
    };

    // Distribuição de Gastos
    const expenseDistribution: Record<string, number> = {};

    filteredData.forEach(t => {
      const val = t.val !== undefined ? t.val : (t.total_value || 0);
      const isIncome = t.operation_type === 'ENTRADA' || t.operation === 'VENDA' || t.val > 0;

      if (isIncome) {
        const method = (t.payment_method || '').toLowerCase();
        let acc = 'CASH';
        if (method.includes('pix')) acc = 'PIX';
        else if (method.includes('cartão') || method.includes('cartao') || method.includes('crédito') || method.includes('débito')) acc = 'CARD';
        else if (method.includes('banco') || method.includes('transferência') || method.includes('conta')) acc = 'BANK';
        else if (method.includes('dinheiro')) acc = 'CASH';

        if (!auditByMethod[acc][t.item]) auditByMethod[acc][t.item] = { count: 0, total: 0 };
        auditByMethod[acc][t.item].count += (t.quantity || 1);
        auditByMethod[acc][t.item].total += val;
      } else {
        const cat = t.category || t.type || 'Outros';
        expenseDistribution[cat] = (expenseDistribution[cat] || 0) + Math.abs(val);
      }
    });

    return { 
        income, 
        expense, 
        totalCommissions,
        pendingCommissions,
        pendingCommissionsAllTime: pendingCommissionsSummary.totalPendingAllTime,
        pendingCommissionsPrior: pendingCommissionsSummary.totalPendingPrior,
        futureReceivables,
        futureTransactions,
        net: income - totalCommissions, // Resultado Líquido (Faturamento - Comissões)
        chartData, 
        prosData, 
        topProducts, 
        topClients,
        accountStats,
        auditByMethod,
        expenseDistribution
    };
  }, [filteredData, commissionConfigs, servicesMap, professionalsMap, adminPros, pendingCommissionsSummary]);

  // Itens filtrados para o Modal de Acerto de Contas
  const filteredPendingForModal = useMemo(() => {
    let list = pendingCommissionsSummary.allPendingItems;

    // Filtra por profissional
    if (settlementSelectedPro !== 'all') {
      list = list.filter(t => (t.pro === settlementSelectedPro) || (t.professional_id && professionalsMap[settlementSelectedPro] === t.professional_id));
    }

    // Filtra por escopo (todas, anterior, período)
    if (settlementFilterScope === 'prior') {
      list = list.filter(t => t.isPrior);
    } else if (settlementFilterScope === 'period') {
      list = list.filter(t => t.isInPeriod);
    }

    // Filtra por termo de busca
    if (settlementSearchTerm) {
      const term = settlementSearchTerm.toLowerCase();
      list = list.filter(t => 
        (t.client_supplier && t.client_supplier.toLowerCase().includes(term)) ||
        (t.item && t.item.toLowerCase().includes(term)) ||
        (t.pro && t.pro.toLowerCase().includes(term))
      );
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [pendingCommissionsSummary.allPendingItems, settlementSelectedPro, settlementFilterScope, settlementSearchTerm, professionalsMap]);

  const isAllSettlementSelected = filteredPendingForModal.length > 0 &&
    filteredPendingForModal.every(t => selectedSettlementIds.includes(t.id));

  const handleToggleSelectAllSettlement = () => {
    if (isAllSettlementSelected) {
      setSelectedSettlementIds([]);
    } else {
      setSelectedSettlementIds(filteredPendingForModal.map(t => t.id));
    }
  };

  const settlementSelectedTotal = useMemo(() => {
    const selectedItems = pendingCommissionsSummary.allPendingItems.filter(t => selectedSettlementIds.includes(t.id));
    return selectedItems.reduce((acc, t) => acc + t.commissionValue, 0);
  }, [selectedSettlementIds, pendingCommissionsSummary.allPendingItems]);

  const handleExecuteSettlementPayment = async () => {
    if (selectedSettlementIds.length === 0) {
      alert('Selecione ao menos um item de comissão para pagar.');
      return;
    }

    setSaving(true);
    try {
      // 1. Atualiza transações no Supabase
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ commission_paid: true })
        .in('id', selectedSettlementIds);

      if (updateError) throw updateError;

      // 2. Calcula total
      const itemsToPay = pendingCommissionsSummary.allPendingItems.filter(t => selectedSettlementIds.includes(t.id));
      const totalAmount = itemsToPay.reduce((acc, t) => acc + t.commissionValue, 0);

      const proLabel = settlementSelectedPro === 'all' 
        ? 'Equipe (Geral)' 
        : settlementSelectedPro;

      const methodLabel = settlementPaymentAccount === 'bank' 
        ? 'Transferência (Banco)' 
        : settlementPaymentAccount === 'pix' 
          ? 'Pix' 
          : 'Dinheiro';

      // 3. Registra saída financeira
      await addTransaction({
        operation: 'COMPRA',
        type: 'DESPESA',
        category: 'Comissão',
        item: `Acerto de Contas: ${proLabel} (${selectedSettlementIds.length} itens)`,
        val: -Math.abs(totalAmount),
        date: new Date().toISOString().split('T')[0],
        payment_method: methodLabel,
        status: 'Pago',
        pro: 'Admin'
      });

      setShowSettlementModal(false);
      setSelectedSettlementIds([]);
      await loadData();
      alert(`✅ Acerto de contas de R$ ${Math.abs(totalAmount).toFixed(2).replace('.', ',')} realizado com sucesso para ${selectedSettlementIds.length} itens!`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao pagar comissões: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBalances = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveSettings({
        ...settings,
        cash_balance: editableBalances.cash,
        pix_balance: editableBalances.pix,
        card_balance: editableBalances.card,
        bank_balance: editableBalances.bank
      });
      setGlobalBalances(editableBalances);
      setIsEditingBalances(false);
      // Atualiza o estado local de settings também
      setSettings({
        ...settings,
        cash_balance: editableBalances.cash,
        pix_balance: editableBalances.pix,
        card_balance: editableBalances.card,
        bank_balance: editableBalances.bank
      });
    } catch (error) {
      console.error("Erro ao salvar saldos:", error);
      alert("Erro ao salvar saldos.");
    } finally {
      setSaving(false);
    }
  };

  // --- LÓGICA DE RECONCILIAÇÃO ---
  const reconciliationData = useMemo(() => {
    if (!settings || !allTransactionsForBalance.length) return null;

    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];

    const starting = { cash: settings.cash_balance || 0, pix: settings.pix_balance || 0, card: settings.card_balance || 0, bank: settings.bank_balance || 0 };
    const flow = { cash: 0, pix: 0, card: 0, bank: 0 };

    allTransactionsForBalance.forEach(t => {
      const val = t.val !== undefined ? t.val : (t.total_value || 0);
      const method = (t.payment_method || '').toLowerCase();
      let acc: 'cash' | 'pix' | 'card' | 'bank' = 'cash';

      if (method.includes('pix')) acc = 'pix';
      else if (method.includes('cartão') || method.includes('cartao') || method.includes('crédito') || method.includes('débito')) acc = 'card';
      else if (method.includes('banco') || method.includes('transferência') || method.includes('conta')) acc = 'bank';
      else if (method.includes('dinheiro')) acc = 'cash';

      if (t.date < startStr) {
        starting[acc] += val;
      } else if (t.date <= endStr) {
        flow[acc] += val;
      }
    });

    const expected = {
      cash: starting.cash + flow.cash,
      pix: starting.pix + flow.pix,
      card: starting.card + flow.card,
      bank: starting.bank + flow.bank
    };

    const actual = {
      cash: parseFloat(actualBalances.cash.replace(',', '.')) || 0,
      pix: parseFloat(actualBalances.pix.replace(',', '.')) || 0,
      card: parseFloat(actualBalances.card.replace(',', '.')) || 0,
      bank: parseFloat(actualBalances.bank.replace(',', '.')) || 0
    };

    const diff = {
      cash: actual.cash - expected.cash,
      pix: actual.pix - expected.pix,
      card: actual.card - expected.card,
      bank: actual.bank - expected.bank
    };

    return { starting, flow, expected, actual, diff };
  }, [allTransactionsForBalance, dateRange, settings, actualBalances]);

  // --- CÁLCULO DE ESTATÍSTICAS SEMANAIS (5 SEMANAS) ---
  const weeklyStats = useMemo(() => {
    const weeks = [];
    const now = new Date();
    
    // Encontrar o domingo da semana atual (fim da semana)
    const currentSunday = new Date(now);
    const day = currentSunday.getDay();
    const diffToSunday = day === 0 ? 0 : 7 - day;
    currentSunday.setDate(currentSunday.getDate() + diffToSunday);
    currentSunday.setHours(23, 59, 59, 999);

    for (let i = 0; i < 5; i++) {
      const end = new Date(currentSunday);
      end.setDate(end.getDate() - (i * 7));
      
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const weekTransactions = weeklyTransactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        return tDate >= start && tDate <= end;
      });

      let income = 0;
      let expenses = 0;
      let commissions = 0;
      let cash = 0;
      let pix = 0;
      let card = 0;

      weekTransactions.forEach(t => {
        const isIncome = t.operation_type === 'ENTRADA' || t.operation === 'VENDA' || t.val > 0;
        const comm = calculateCommission(t);

        if (isIncome) {
          if (t.category !== 'Gorjeta' && t.type !== 'GORJETA') {
            income += t.val;
            commissions += comm;
            
            const method = (t.payment_method || '').toLowerCase();
            if (method.includes('pix')) pix += t.val;
            else if (method.includes('cartão') || method.includes('cartao') || method.includes('crédito') || method.includes('débito')) card += t.val;
            else if (method.includes('dinheiro')) cash += t.val;
            else cash += t.val;
          }
        } else {
          expenses += Math.abs(t.val);
        }
      });

      weeks.push({
        name: `S${5-i}`,
        label: `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
        netRevenue: income - commissions,
        details: {
          cash,
          pix,
          card,
          expenses,
          totalIncome: income,
          totalCommissions: commissions
        }
      });
    }

    return weeks.reverse();
  }, [weeklyTransactions, commissionConfigs, servicesMap, professionalsMap, adminPros]);

  // --- AÇÕES DO MODAL ---
  const handleOpenEdit = (t: Transaction) => {
    setEditingTx(t);
    setShowDeleteConfirm(false);
    setEditForm({
        item: t.item,
        val: Math.abs(t.val).toFixed(2).replace('.', ','),
        date: t.date
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    setSaving(true);
    try {
        const newVal = parseFloat(editForm.val.replace(',', '.')) || 0;
        // Mantém o sinal original (negativo para despesa, positivo para venda)
        const finalVal = editingTx.val < 0 ? -Math.abs(newVal) : Math.abs(newVal);

        await updateTransaction(editingTx.id, {
            item: editForm.item,
            val: finalVal,
            date: editForm.date
        });
        
        setEditingTx(null);
        loadData();
    } catch (err) {
        console.error(err);
    } finally {
        setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!editingTx) return;
    setSaving(true);
    try {
        await deleteTransaction(editingTx.id);
        setEditingTx(null);
        loadData();
    } catch (err) {
        console.error(err);
    } finally {
        setSaving(false);
    }
  };

  // --- AÇÕES GERENCIAIS ---
  const handleManagerAction = async (type: 'transfer' | 'sangria' | 'adjust') => {
    if (!settings) return;
    setSaving(true);
    try {
        const amount = parseFloat(managerForm.amount.replace(',', '.')) || 0;
        let txItem = '';
        let txVal = 0;
        let operation: 'VENDA' | 'COMPRA' = 'COMPRA';
        let paymentMethod = 'Sistema';

        if (type === 'transfer') {
            if (managerForm.target === 'bank') {
                // Saída do Caixa
                await addTransaction({
                    operation: 'COMPRA',
                    operation_type: 'SAÍDA',
                    type: 'OUTROS',
                    category: 'Gerencial',
                    item: `Transferência (Saída): Caixa -> Banco (${managerForm.description})`,
                    val: -amount,
                    date: new Date().toISOString().split('T')[0],
                    payment_method: 'Dinheiro',
                    payment_account: 'CASH',
                    status: 'Pago',
                    pro: 'Admin'
                });
                // Entrada no Banco
                await addTransaction({
                    operation: 'VENDA',
                    operation_type: 'ENTRADA',
                    type: 'OUTROS',
                    category: 'Gerencial',
                    item: `Transferência (Entrada): Caixa -> Banco (${managerForm.description})`,
                    val: amount,
                    date: new Date().toISOString().split('T')[0],
                    payment_method: 'Transferência (Banco)',
                    payment_account: 'BANK',
                    status: 'Pago',
                    pro: 'Admin'
                });
            } else {
                // Saída do Banco
                await addTransaction({
                    operation: 'COMPRA',
                    operation_type: 'SAÍDA',
                    type: 'OUTROS',
                    category: 'Gerencial',
                    item: `Transferência (Saída): Banco -> Caixa (${managerForm.description})`,
                    val: -amount,
                    date: new Date().toISOString().split('T')[0],
                    payment_method: 'Transferência (Banco)',
                    payment_account: 'BANK',
                    status: 'Pago',
                    pro: 'Admin'
                });
                // Entrada no Caixa
                await addTransaction({
                    operation: 'VENDA',
                    operation_type: 'ENTRADA',
                    type: 'OUTROS',
                    category: 'Gerencial',
                    item: `Transferência (Entrada): Banco -> Caixa (${managerForm.description})`,
                    val: amount,
                    date: new Date().toISOString().split('T')[0],
                    payment_method: 'Dinheiro',
                    payment_account: 'CASH',
                    status: 'Pago',
                    pro: 'Admin'
                });
            }
            txItem = ''; 
        } else if (type === 'sangria') {
            txItem = `Sangria: ${managerForm.description}`;
            txVal = -amount;
            paymentMethod = 'Dinheiro';
        } else if (type === 'adjust') {
            const accountName = 
                showAdjustModal.type === 'cash' ? 'Caixa (Dinheiro)' : 
                showAdjustModal.type === 'pix' ? 'Caixa (Pix)' :
                showAdjustModal.type === 'card' ? 'Caixa (Cartão)' : 'Conta Corrente';
            
            const opType = managerForm.operationType;
            let paymentAccount: 'CASH' | 'PIX' | 'CARD' | 'BANK' = 'CASH';
            
            // Define o método de pagamento para o trigger
            if (showAdjustModal.type === 'cash') { paymentMethod = 'Dinheiro'; paymentAccount = 'CASH'; }
            else if (showAdjustModal.type === 'pix') { paymentMethod = 'Pix'; paymentAccount = 'PIX'; }
            else if (showAdjustModal.type === 'card') { paymentMethod = 'Cartão'; paymentAccount = 'CARD'; }
            else { paymentMethod = 'Transferência (Banco)'; paymentAccount = 'BANK'; }

            if (opType === 'deposit') {
                txItem = `Depósito/Aporte em ${accountName}: ${managerForm.description}`;
                txVal = amount;
                operation = 'VENDA';
                await addTransaction({
                    operation: operation,
                    operation_type: 'ENTRADA',
                    type: 'OUTROS',
                    category: 'Gerencial',
                    item: txItem,
                    val: txVal,
                    date: new Date().toISOString().split('T')[0],
                    payment_method: paymentMethod,
                    payment_account: paymentAccount,
                    status: 'Pago',
                    pro: 'Admin'
                });
            } else if (opType === 'withdraw') {
                txItem = `Saque/Sangria de ${accountName}: ${managerForm.description}`;
                txVal = -amount;
                operation = 'COMPRA';
                await addTransaction({
                    operation: operation,
                    operation_type: 'SAÍDA',
                    type: 'OUTROS',
                    category: 'Gerencial',
                    item: txItem,
                    val: txVal,
                    date: new Date().toISOString().split('T')[0],
                    payment_method: paymentMethod,
                    payment_account: paymentAccount,
                    status: 'Pago',
                    pro: 'Admin'
                });
            } else if (opType === 'transfer') {
                const targetName = managerForm.target === 'bank' ? 'Conta Corrente' : 'Caixa (Dinheiro)';
                const targetMethod = managerForm.target === 'bank' ? 'Transferência (Banco)' : 'Dinheiro';
                const targetAccount = managerForm.target === 'bank' ? 'BANK' : 'CASH';

                // Saída da Origem
                await addTransaction({
                    operation: 'COMPRA',
                    operation_type: 'SAÍDA',
                    type: 'OUTROS',
                    category: 'Gerencial',
                    item: `Transferência (Saída): ${accountName} -> ${targetName} (${managerForm.description})`,
                    val: -amount,
                    date: new Date().toISOString().split('T')[0],
                    payment_method: paymentMethod,
                    payment_account: paymentAccount,
                    status: 'Pago',
                    pro: 'Admin'
                });

                // Entrada no Destino
                await addTransaction({
                    operation: 'VENDA',
                    operation_type: 'ENTRADA',
                    type: 'OUTROS',
                    category: 'Gerencial',
                    item: `Transferência (Entrada): ${accountName} -> ${targetName} (${managerForm.description})`,
                    val: amount,
                    date: new Date().toISOString().split('T')[0],
                    payment_method: targetMethod,
                    payment_account: targetAccount,
                    status: 'Pago',
                    pro: 'Admin'
                });
            }
            txItem = '';
        }
        
        if (txItem && type === 'sangria') {
            await addTransaction({
                operation: operation,
                operation_type: 'SAÍDA',
                type: 'OUTROS',
                category: 'Gerencial',
                item: txItem,
                val: txVal,
                date: new Date().toISOString().split('T')[0],
                payment_method: paymentMethod,
                payment_account: 'CASH',
                status: 'Pago',
                pro: 'Admin'
            });
        }

        setShowTransferModal(false);
        setShowSangriaModal(false);
        setShowAdjustModal({ show: false, type: null });
        setManagerForm({ amount: '', description: '', target: 'bank', operationType: 'deposit' });
        loadData();
        alert('Operação realizada com sucesso!');

    } catch (err: any) {
        console.error(err);
        alert('Erro ao realizar operação: ' + err.message);
    } finally {
        setSaving(false);
    }
  };

  // Navegar para detalhes do profissional
  const handleProClick = (proName: string) => {
    // Tenta encontrar o ID pelo mapa, senão usa o nome (o componente de destino terá que lidar com isso)
    const proId = professionalsMap[proName];
    if (proId) {
        navigate(`/financial/performance/${proId}`);
    } else {
        // Fallback se não encontrar o ID (provavelmente dados antigos ou 'Sistema')
        console.warn('ID do profissional não encontrado para:', proName);
    }
  };

  // Lista única de profissionais para o filtro
  const uniquePros = useMemo(() => {
    const pros = new Set(allTransactions.map(t => t.pro).filter(Boolean));
    // Filtra para não mostrar Admin/Sistema no dropdown de filtro
    return Array.from(pros).filter(p => {
      const name = String(p || '').toLowerCase();
      return !['admin', 'sistema', 'socios', 'sócio', 'sócios'].includes(name);
    });
  }, [allTransactions]);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      {/* HEADER */}
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/menu')} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold tracking-tight">Gestão Financeira</h1>
          <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold">Visão Administrativa</p>
        </div>
        <button 
            onClick={exportToExcel} 
            className="p-2 bg-blue-800 rounded-xl active:scale-90 border border-blue-700 shadow-sm transition-transform"
            title="Exportar Relatório"
        >
            <FileSpreadsheet size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        
        {/* CONTROLES DE DATA E FILTRO */}
        <div className="space-y-3">
            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                <button 
                    onClick={() => setViewMode('week')} 
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${viewMode === 'week' ? 'bg-blue-50 text-blue-900 shadow-inner' : 'text-gray-400'}`}
                >
                    Semana
                </button>
                <button 
                    onClick={() => setViewMode('month')} 
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all ${viewMode === 'month' ? 'bg-blue-50 text-blue-900 shadow-inner' : 'text-gray-400'}`}
                >
                    Mês
                </button>
            </div>

            <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                <button onClick={handlePrev} className="p-3 bg-gray-50 rounded-xl text-gray-600 active:bg-gray-200"><ChevronLeft size={20} /></button>
                <div className="text-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Período</span>
                    <span className="text-sm font-black text-blue-900">
                        {dateRange.start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} 
                        {' - '} 
                        {dateRange.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                </div>
                <button onClick={handleNext} className="p-3 bg-gray-50 rounded-xl text-gray-600 active:bg-gray-200"><ChevronRight size={20} /></button>
            </div>

            {/* Filtro de Barbeiro */}
            <div className="relative">
                <select 
                    value={selectedPro} 
                    onChange={e => setSelectedPro(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 outline-none font-bold text-gray-700 text-xs appearance-none shadow-sm"
                >
                    <option value="all">Todos os Profissionais</option>
                    {uniquePros.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
        </div>

        {/* CARDS DE RESUMO - NOVA VERSÃO GERENCIAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card A: SALDO EM CAIXA */}
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                        <Wallet2 size={20} />
                    </div>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => setShowTransferModal(true)}
                            className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Transferir"
                        >
                            <ArrowLeftRight size={14} />
                        </button>
                        <button 
                            onClick={() => setShowSangriaModal(true)}
                            className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Sangria"
                        >
                            <MinusCircle size={14} />
                        </button>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Saldo em Caixa</span>
                        <button 
                            onClick={() => document.getElementById('composicao-caixa')?.scrollIntoView({ behavior: 'smooth' })}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            Detalhar
                        </button>
                    </div>
                    <h2 className="text-2xl font-black text-blue-900">R$ {(globalBalances.cash + globalBalances.pix).toFixed(2)}</h2>
                    <p className="text-[9px] text-gray-400 font-medium mt-1">Soma de Dinheiro e Pix em caixa.</p>
                </div>
            </div>

            {/* Card B: FATURAMENTO BRUTO */}
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                <div className="bg-green-50 p-2 rounded-xl text-green-600 w-fit">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Faturamento Bruto</span>
                    <h2 className="text-2xl font-black text-green-600">R$ {stats.income.toFixed(2)}</h2>
                    <p className="text-[9px] text-gray-400 font-medium mt-1">Total de serviços + produtos no período.</p>
                </div>
            </div>

            {/* Card C: RESULTADO LÍQUIDO */}
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                <div className="bg-orange-50 p-2 rounded-xl text-orange-600 w-fit">
                    <DollarSign size={20} />
                </div>
                <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Resultado Líquido</span>
                    <h2 className="text-2xl font-black text-orange-600">R$ {stats.net.toFixed(2)}</h2>
                    <p className="text-[9px] text-gray-400 font-medium mt-1">Lucro bruto (Faturamento - Comissões).</p>
                </div>
            </div>
        </div>

        {/* NOVOS CARDS DE MOVIMENTAÇÃO POR CONTA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
                { id: 'CASH', name: 'Dinheiro', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
                { id: 'PIX', name: 'Pix', icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-50' },
                { id: 'CARD', name: 'Cartão', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
                { id: 'BANK', name: 'Banco', icon: Landmark, color: 'text-gray-600', bg: 'bg-gray-50' }
            ].map(acc => {
                const data = stats.accountStats[acc.id];
                const isExpanded = expandedAccount === acc.id;

                return (
                    <div key={acc.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className={`${acc.bg} ${acc.color} p-2 rounded-xl`}>
                                    <acc.icon size={20} />
                                </div>
                                <button 
                                    onClick={() => setExpandedAccount(isExpanded ? null : acc.id as any)}
                                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    {isExpanded ? 'Recolher' : 'Ver Origem'}
                                </button>
                            </div>
                            
                            <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{acc.name}</span>
                                <div className="mt-1">
                                    <span className="text-lg font-black text-gray-900">R$ {data.income.toFixed(2)}</span>
                                    <span className="text-[10px] font-bold text-green-600 block">Total Recebido</span>
                                </div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-gray-50 bg-gray-50/50 max-h-60 overflow-y-auto">
                                <div className="p-4 space-y-2">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Transações do Período</p>
                                    {data.transactions.length > 0 ? (
                                        data.transactions.map(t => {
                                            const isIncome = t.operation_type === 'ENTRADA' || t.operation === 'VENDA' || t.val > 0;
                                            return (
                                            <div key={t.id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-800 truncate max-w-[120px]">{t.item}</span>
                                                    <span className="text-[8px] text-gray-400">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                                </div>
                                                <span className={`text-[10px] font-black ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isIncome ? '+' : '-'} R$ {Math.abs(t.val).toFixed(2)}
                                                </span>
                                            </div>
                                        )})
                                    ) : (
                                        <p className="text-[10px] text-gray-400 text-center py-4 italic">Nenhuma movimentação</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* CONTROLE DE GASTOS MENSAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Gasto Previsto (Período)</span>
                        <h3 className="text-xl font-black text-blue-900">R$ {monthlyExpenses.predicted.toFixed(2)}</h3>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Status</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Planejado</span>
                </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-green-50 p-3 rounded-2xl text-green-600">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Gasto Pago (Período)</span>
                        <h3 className="text-xl font-black text-green-600">R$ {monthlyExpenses.paid.toFixed(2)}</h3>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <button 
                        onClick={() => setShowPaidDetailsModal(true)}
                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        Detalhar
                    </button>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Aproveitamento</span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                            {monthlyExpenses.predicted > 0 ? ((monthlyExpenses.paid / monthlyExpenses.predicted) * 100).toFixed(0) : 0}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* COMPOSIÇÃO DO CAIXA E OBRIGAÇÕES */}
        <div id="composicao-caixa" className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Landmark size={16} className="text-blue-900" /> Composição do Caixa
                    </h3>
                    {!isEditingBalances ? (
                        <button 
                            onClick={() => setIsEditingBalances(true)}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                            <Edit2 size={12} /> Editar Saldos
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleSaveBalances}
                                disabled={saving}
                                className="text-[10px] font-black text-white uppercase tracking-widest bg-green-600 px-3 py-1 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                            </button>
                            <button 
                                onClick={() => {
                                    setIsEditingBalances(false);
                                    setEditableBalances(globalBalances);
                                }}
                                className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>
                <button 
                    onClick={() => setShowReconciliation(!showReconciliation)}
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${showReconciliation ? 'bg-blue-900 text-white' : 'bg-blue-50 text-blue-900'}`}
                >
                    <ClipboardList size={14} />
                    {showReconciliation ? 'Fechar Reconciliação' : 'Reconciliar Período'}
                </button>
            </div>

            {showReconciliation && reconciliationData && (
                <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 space-y-6 animate-in fade-in slide-in-from-top-4">
                    <div className="text-center space-y-1">
                        <h4 className="text-sm font-black text-blue-900 uppercase">Reconciliação do Período</h4>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Confira se o saldo esperado bate com o real</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { id: 'cash', name: 'Dinheiro', icon: Banknote, color: 'text-green-600' },
                            { id: 'pix', name: 'Pix', icon: ArrowLeftRight, color: 'text-blue-500' },
                            { id: 'card', name: 'Cartão', icon: ShoppingBag, color: 'text-purple-600' },
                            { id: 'bank', name: 'Banco', icon: Landmark, color: 'text-gray-600' }
                        ].map(acc => {
                            const key = acc.id as keyof typeof reconciliationData.starting;
                            const start = reconciliationData.starting[key];
                            const flow = reconciliationData.flow[key];
                            const expected = reconciliationData.expected[key];
                            const diff = reconciliationData.diff[key];
                            const actual = actualBalances[key as keyof typeof actualBalances];

                            return (
                                <div key={acc.id} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <acc.icon size={16} className={acc.color} />
                                            <span className="text-xs font-black text-gray-800 uppercase">{acc.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-gray-400 uppercase block">Saldo Inicial</span>
                                            <span className="text-[10px] font-bold text-gray-600">R$ {start.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-black text-gray-400 uppercase block">Fluxo (Entradas - Saídas)</span>
                                            <span className={`text-xs font-black ${flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {flow >= 0 ? '+' : '-'} R$ {Math.abs(flow).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-black text-blue-400 uppercase block">Saldo Esperado</span>
                                            <span className="text-xs font-black text-blue-900">R$ {expected.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-50 flex items-end gap-4">
                                        <div className="flex-1">
                                            <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">Saldo Real (Físico/Extrato)</label>
                                            <input 
                                                type="text"
                                                placeholder="0,00"
                                                value={actual}
                                                onChange={e => setActualBalances({...actualBalances, [acc.id]: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-xs font-black text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="text-right min-w-[80px]">
                                            <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Diferença</span>
                                            <span className={`text-xs font-black ${diff === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {diff > 0 ? '+' : ''} R$ {diff.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {diff !== 0 && (
                                        <div className={`p-2 rounded-lg flex items-center gap-2 ${diff > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            <AlertCircle size={12} />
                                            <span className="text-[9px] font-bold">
                                                {diff > 0 ? 'Sobra identificada' : 'Falta identificada'} no valor de R$ {Math.abs(diff).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-blue-900 p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-blue-200">
                        <div>
                            <span className="text-[8px] font-black text-blue-300 uppercase block">Diferença Total</span>
                            <h5 className="text-sm font-black text-white">
                                R$ {(reconciliationData.diff.cash + reconciliationData.diff.pix + reconciliationData.diff.card + reconciliationData.diff.bank).toFixed(2)}
                            </h5>
                        </div>
                        <button 
                            onClick={() => {
                                // Aqui poderíamos salvar um log de fechamento
                                alert('Fechamento conferido! Para registrar formalmente, use o botão de Ajuste abaixo se necessário.');
                            }}
                            className="bg-white text-blue-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                            Conferido
                        </button>
                    </div>
                </div>
            )}
            
            <div className="space-y-4">
                {/* Dinheiro */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl text-green-600 shadow-sm">
                            <Banknote size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-800">Dinheiro</p>
                            <p className="text-[10px] text-gray-400">Espécie em mãos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEditingBalances ? (
                            <input 
                                type="number"
                                value={editableBalances.cash}
                                onChange={e => setEditableBalances({...editableBalances, cash: parseFloat(e.target.value) || 0})}
                                className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        ) : (
                            <span className="text-sm font-black text-gray-900">R$ {globalBalances.cash.toFixed(2)}</span>
                        )}
                    </div>
                </div>

                {/* Pix */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl text-blue-500 shadow-sm">
                            <ArrowLeftRight size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-800">Pix</p>
                            <p className="text-[10px] text-gray-400">Saldo recebido via Pix</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEditingBalances ? (
                            <input 
                                type="number"
                                value={editableBalances.pix}
                                onChange={e => setEditableBalances({...editableBalances, pix: parseFloat(e.target.value) || 0})}
                                className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        ) : (
                            <span className="text-sm font-black text-gray-900">R$ {globalBalances.pix.toFixed(2)}</span>
                        )}
                    </div>
                </div>

                {/* Cartão */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl text-purple-600 shadow-sm">
                            <ShoppingBag size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-800">Cartão</p>
                            <p className="text-[10px] text-gray-400">Crédito e Débito</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEditingBalances ? (
                            <input 
                                type="number"
                                value={editableBalances.card}
                                onChange={e => setEditableBalances({...editableBalances, card: parseFloat(e.target.value) || 0})}
                                className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        ) : (
                            <span className="text-sm font-black text-gray-900">R$ {globalBalances.card.toFixed(2)}</span>
                        )}
                    </div>
                </div>

                {/* Conta Corrente */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl text-gray-600 shadow-sm">
                            <Landmark size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-800">Conta Corrente</p>
                            <p className="text-[10px] text-gray-400">Saldo bancário</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEditingBalances ? (
                            <input 
                                type="number"
                                value={editableBalances.bank}
                                onChange={e => setEditableBalances({...editableBalances, bank: parseFloat(e.target.value) || 0})}
                                className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        ) : (
                            <span className="text-sm font-black text-gray-900">R$ {globalBalances.bank.toFixed(2)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Visual Separation for Commission Payments */}
            <div className="pt-6 border-t border-dashed border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Obrigações e Provisões</h4>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl text-red-600 shadow-sm">
                            <Users size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-red-900">Comissões a Pagar (Acerto de Contas)</p>
                            <p className="text-[10px] text-red-400">Comprometido com a equipe</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-sm font-black text-red-900 block">
                                R$ {pendingCommissionsSummary.totalPendingAllTime.toFixed(2)}
                            </span>
                            {pendingCommissionsSummary.totalPendingPrior > 0 && (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full inline-block">
                                    ⚠️ R$ {pendingCommissionsSummary.totalPendingPrior.toFixed(2)} anterior
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={() => {
                                setSettlementSelectedPro('all');
                                setSelectedSettlementIds([]);
                                setShowSettlementModal(true);
                            }}
                            className="text-[10px] font-black text-white bg-red-600 hover:bg-red-700 px-3.5 py-2 rounded-xl active:scale-95 transition-all shadow-sm uppercase tracking-wider"
                        >
                            Fazer Acerto
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl text-orange-600 shadow-sm">
                            <Clock size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-orange-900">A Receber (Futuro)</p>
                            <p className="text-[10px] text-orange-400">Vendas no cartão/prazo</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-orange-900">R$ {stats.futureReceivables.toFixed(2)}</span>
                        <button 
                            onClick={() => setShowFutureModal(true)}
                            className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-100/50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                        >
                            Ver
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* GRÁFICO DE RESULTADO LÍQUIDO DIÁRIO */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-900" /> Faturamento Diário por Colaborador
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                            cursor={{fill: '#f3f4f6'}}
                        />
                        {stats.prosData.map((pro, index) => {
                            const colors = ['#1e3a8a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'];
                            return (
                                <Bar 
                                    key={pro.name} 
                                    dataKey={pro.name} 
                                    name={pro.name} 
                                    stackId="a" 
                                    fill={colors[index % colors.length]} 
                                    radius={index === stats.prosData.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                />
                            );
                        })}
                        {/* Adiciona "Outros" caso haja vendas sem profissional vinculado */}
                        <Bar dataKey="Outros" name="Outros" stackId="a" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* NOVO GRÁFICO: RESULTADO LÍQUIDO SEMANAL (5 SEMANAS) */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-900" /> Resultado Líquido Semanal (Últimas 5 Semanas)
                </h3>
                <span className="text-[9px] text-gray-400 font-bold uppercase">Clique na barra para detalhes</span>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={weeklyStats}
                        onClick={(data) => {
                            if (data && data.activePayload && data.activePayload.length > 0) {
                                setSelectedWeek(data.activePayload[0].payload);
                            }
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 8, fill: '#9ca3af'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <Tooltip 
                            cursor={{fill: '#f3f4f6'}}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-50">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{data.label}</p>
                                            <p className="text-sm font-black text-blue-900">Líquido: R$ {data.netRevenue.toFixed(2)}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar 
                            dataKey="netRevenue" 
                            name="Resultado Líquido" 
                            fill="#1e3a8a" 
                            radius={[8, 8, 0, 0]}
                            className="cursor-pointer"
                        >
                            {weeklyStats.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={selectedWeek?.label === entry.label ? '#10b981' : '#1e3a8a'} 
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detalhes da Semana Selecionada */}
            {selectedWeek && (
                <div className="mt-6 p-4 bg-gray-50 rounded-[2rem] border border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
                            Detalhes: {selectedWeek.label}
                        </h4>
                        <button onClick={() => setSelectedWeek(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                            <span className="text-[8px] font-black text-gray-400 uppercase block">Dinheiro</span>
                            <span className="text-xs font-black text-green-600">R$ {selectedWeek.details.cash.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                            <span className="text-[8px] font-black text-gray-400 uppercase block">Pix</span>
                            <span className="text-xs font-black text-blue-500">R$ {selectedWeek.details.pix.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                            <span className="text-[8px] font-black text-gray-400 uppercase block">Cartões</span>
                            <span className="text-xs font-black text-purple-600">R$ {selectedWeek.details.card.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                            <span className="text-[8px] font-black text-gray-400 uppercase block">Gastos</span>
                            <span className="text-xs font-black text-red-500">R$ {selectedWeek.details.expenses.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-blue-900 rounded-2xl flex justify-between items-center">
                        <span className="text-[8px] font-black text-blue-200 uppercase">Resultado Líquido</span>
                        <span className="text-sm font-black text-white">R$ {selectedWeek.netRevenue.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>

        {/* PRODUÇÃO DA EQUIPE - DETALHADO */}
        {selectedPro === 'all' && (
            <div id="equipe-producao" className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Users size={16} className="text-blue-900" /> Produção da Equipe
                    </h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-4 py-2">Profissional</th>
                                <th className="px-4 py-2 text-right">Produção</th>
                                <th className="px-4 py-2 text-right">Comissão</th>
                                <th className="px-4 py-2 text-right">A Pagar</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.prosData.map((pro, idx) => (
                                <tr key={idx} className="bg-gray-50 rounded-2xl group hover:bg-blue-50/50 transition-colors">
                                    <td className="px-4 py-4 rounded-l-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {pro.name.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-gray-800">{pro.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right text-xs font-bold text-gray-600">
                                        R$ {pro.value.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 text-right text-xs font-medium text-gray-400">
                                        {((pro.commission / (pro.value || 1)) * 100).toFixed(0)}%
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <span className={`text-xs font-black ${(pro.pendingAllTime || pro.pending) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            R$ {(pro.pendingAllTime !== undefined ? pro.pendingAllTime : pro.pending).toFixed(2)}
                                        </span>
                                        {pro.pendingPrior > 0 && (
                                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full block mt-0.5 w-fit ml-auto">
                                                ⚠️ +R$ {pro.pendingPrior.toFixed(2)} ant.
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right rounded-r-2xl">
                                        <div className="flex items-center justify-end gap-1">
                                            {(pro.pendingAllTime || pro.pending) > 0 && (
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setSettlementSelectedPro(pro.name);
                                                        setSelectedSettlementIds([]);
                                                        setShowSettlementModal(true);
                                                    }}
                                                    className="p-2 text-green-600 hover:bg-white rounded-xl transition-colors"
                                                    title="Acerto de Contas / Pagar"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleProClick(pro.name)}
                                                className="p-2 text-blue-600 hover:bg-white rounded-xl transition-colors"
                                                title="Ver Detalhes"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="text-xs font-black text-gray-900">
                                <td className="px-4 py-4">TOTAIS</td>
                                <td className="px-4 py-4 text-right">R$ {stats.income.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right"></td>
                                <td className="px-4 py-4 text-right">
                                    <span className="text-red-600 block">
                                        R$ {pendingCommissionsSummary.totalPendingAllTime.toFixed(2)}
                                    </span>
                                    {pendingCommissionsSummary.totalPendingPrior > 0 && (
                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                                            ⚠️ R$ {pendingCommissionsSummary.totalPendingPrior.toFixed(2)} anterior
                                        </span>
                                    )}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        )}

        {/* AUDITORIA POR FORMA DE PAGAMENTO */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Filter size={16} className="text-blue-900" /> Auditoria por Forma de Pagamento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { id: 'CASH', name: 'Dinheiro', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
                    { id: 'PIX', name: 'Pix', icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { id: 'CARD', name: 'Cartão', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { id: 'BANK', name: 'Banco', icon: Landmark, color: 'text-gray-600', bg: 'bg-gray-50' }
                ].map(acc => {
                    const items = stats.auditByMethod[acc.id] as Record<string, { count: number, total: number }>;
                    const sortedItems = Object.entries(items).sort((a, b) => b[1].total - a[1].total);
                    
                    if (sortedItems.length === 0) return null;

                    return (
                        <div key={acc.id} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <div className={`${acc.bg} ${acc.color} p-1.5 rounded-lg`}>
                                    <acc.icon size={14} />
                                </div>
                                <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">{acc.name}</span>
                            </div>
                            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                                {sortedItems.map(([name, data], idx) => (
                                    <div key={name} className={`flex justify-between items-center p-3 ${idx !== sortedItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-700 truncate max-w-[150px]">{name}</span>
                                            <span className="text-[8px] text-gray-400 font-bold uppercase">{data.count} un</span>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-900">R$ {data.total.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* DISTRIBUIÇÃO DE GASTOS */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <TrendingDown size={16} className="text-red-600" /> Distribuição de Gastos por Categoria
            </h3>
            
            {Object.keys(stats.expenseDistribution).length === 0 ? (
                <p className="text-center text-[10px] text-gray-400 italic py-4">Nenhum gasto registrado no período.</p>
            ) : (
                <div className="space-y-4">
                    {Object.entries(stats.expenseDistribution as Record<string, number>)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, val]) => {
                            const percent = (val / (stats.expense || 1)) * 100;
                            return (
                                <div key={cat} className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{cat}</span>
                                        <span className="text-[10px] font-black text-red-600">R$ {val.toFixed(2)} ({percent.toFixed(0)}%)</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-red-500 rounded-full" 
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>

        {/* RANKINGS (LADO A LADO EM TELAS MAIORES, EMPILHADO NO MOBILE) */}
        <div className="grid grid-cols-1 gap-4">
            {/* TOP PRODUTOS */}
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShoppingBag size={16} /> Top 3 Produtos
                </h3>
                {stats.topProducts.length === 0 ? (
                    <p className="text-center text-[10px] text-gray-400 italic">Sem vendas de produtos.</p>
                ) : (
                    <div className="space-y-3">
                        {stats.topProducts.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                        {idx + 1}
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 line-clamp-1">{p.name}</span>
                                </div>
                                <span className="text-xs font-black text-orange-500">{p.count} un</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* TOP CLIENTES */}
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Users size={16} /> Top 5 Clientes (Frequência)
                </h3>
                {stats.topClients.length === 0 ? (
                    <p className="text-center text-[10px] text-gray-400 italic">Sem dados de clientes.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {stats.topClients.map((c, idx) => (
                            <div key={idx} className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-900">{c.name}</span>
                                <span className="bg-white px-1.5 rounded-md text-[9px] font-black text-blue-600">{c.count}x</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* LISTA DETALHADA PARA EDIÇÃO */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <ClipboardList className="text-blue-600" size={24} /> Auditoria de Lançamentos
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Conferência detalhada de entradas e saídas</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            value={auditRange.start} 
                            onChange={e => setAuditRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-white border-none rounded-xl text-[10px] font-black text-gray-600 py-2 px-3 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                        <span className="text-gray-300 font-bold">-</span>
                        <input 
                            type="date" 
                            value={auditRange.end} 
                            onChange={e => setAuditRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-white border-none rounded-xl text-[10px] font-black text-gray-600 py-2 px-3 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                    </div>
                    <button 
                        onClick={handleLoadAudit}
                        disabled={loadingAudit}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-md shadow-blue-200 active:scale-95 disabled:opacity-50"
                    >
                        {loadingAudit ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Confirmar e Carregar
                    </button>
                </div>
            </div>

            {!auditConfirmed ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <div className="bg-white p-4 rounded-full shadow-sm text-gray-300">
                        <Calendar size={40} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-gray-500">Selecione um período para auditoria</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Os dados serão carregados após a confirmação</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {auditTransactions.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 italic py-8">Nenhum registro encontrado.</p>
                    ) : (
                        auditTransactions.map((t) => (
                            <div 
                                key={t.id} 
                                onClick={() => handleOpenEdit(t)}
                                className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group active:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-1 h-8 rounded-full shrink-0 ${t.operation === 'VENDA' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-gray-800 truncate">{t.item}</p>
                                            {t.appointment_id && (
                                                <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                                                    ID: {t.appointment_id.slice(0, 8)}...
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-medium truncate">
                                            {new Date(t.date).toLocaleDateString('pt-BR')} • {t.pro || 'Admin'}
                                            {t.client_supplier && (
                                                <span className="ml-2 text-blue-500 font-bold">• {t.client_supplier}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-xs font-black ${t.operation === 'VENDA' ? 'text-green-600' : 'text-red-500'}`}>
                                        R$ {Math.abs(t.val).toFixed(2)}
                                    </span>
                                    <div className="bg-blue-50 text-blue-500 p-2 rounded-xl active:scale-90 transition-transform">
                                        <Eye size={14} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>

      </div>

      {/* MODAL DE TRANSFERÊNCIA */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-blue-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <ArrowLeftRight size={16} /> Transferir Entre Contas
                    </h3>
                    <button onClick={() => setShowTransferModal(false)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                        <button 
                            onClick={() => setManagerForm({...managerForm, target: 'bank'})}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${managerForm.target === 'bank' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                        >
                            Caixa → Banco
                        </button>
                        <button 
                            onClick={() => setManagerForm({...managerForm, target: 'cash'})}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${managerForm.target === 'cash' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                        >
                            Banco → Caixa
                        </button>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Valor (R$)</label>
                        <input 
                            type="text" 
                            placeholder="0,00"
                            value={managerForm.amount}
                            onChange={(e) => setManagerForm({...managerForm, amount: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-black text-gray-800 text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Motivo / Descrição</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Depósito do dia"
                            value={managerForm.description}
                            onChange={(e) => setManagerForm({...managerForm, description: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
                        />
                    </div>

                    <button 
                        onClick={() => handleManagerAction('transfer')}
                        disabled={saving}
                        className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Transferência'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE SANGRIA */}
      {showSangriaModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-red-600 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <MinusCircle size={16} /> Sangria de Caixa
                    </h3>
                    <button onClick={() => setShowSangriaModal(false)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 items-start">
                        <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-800 font-medium leading-relaxed">
                            A sangria retira dinheiro diretamente do <b>Caixa Físico</b>. Use para retiradas pessoais ou pagamentos à vista.
                        </p>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Valor da Retirada (R$)</label>
                        <input 
                            type="text" 
                            placeholder="0,00"
                            value={managerForm.amount}
                            onChange={(e) => setManagerForm({...managerForm, amount: e.target.value})}
                            className="w-full bg-red-50/30 border border-red-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-red-600 font-black text-red-600 text-sm placeholder:text-red-200"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Motivo da Sangria</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Pagamento Fornecedor"
                            value={managerForm.description}
                            onChange={(e) => setManagerForm({...managerForm, description: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-red-600 font-bold text-gray-700 text-sm"
                        />
                    </div>

                    <button 
                        onClick={() => handleManagerAction('sangria')}
                        disabled={saving}
                        className="w-full bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Sangria'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE AJUSTE DE SALDO (Depósito, Transferência, Saque) */}
      {showAdjustModal.show && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-blue-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Edit2 size={16} /> Movimentar {
                            showAdjustModal.type === 'cash' ? 'Caixa (Dinheiro)' : 
                            showAdjustModal.type === 'pix' ? 'Caixa (Pix)' :
                            showAdjustModal.type === 'card' ? 'Caixa (Cartão)' : 'Conta Corrente'
                        }
                    </h3>
                    <button onClick={() => setShowAdjustModal({ show: false, type: null })} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    {/* Abas de Tipo de Operação */}
                    <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                        <button 
                            onClick={() => setManagerForm({...managerForm, operationType: 'deposit'})}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${managerForm.operationType === 'deposit' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}
                        >
                            Depósito
                        </button>
                        <button 
                            onClick={() => setManagerForm({...managerForm, operationType: 'transfer'})}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${managerForm.operationType === 'transfer' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                        >
                            Transferir
                        </button>
                        <button 
                            onClick={() => setManagerForm({...managerForm, operationType: 'withdraw'})}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${managerForm.operationType === 'withdraw' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
                        >
                            Saque
                        </button>
                    </div>

                    {/* Conteúdo Dinâmico */}
                    <div className="space-y-3">
                        {managerForm.operationType === 'transfer' && (
                            <div className="space-y-3">
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-[10px] text-blue-800 font-medium">
                                    Transferindo de <b>{
                                        showAdjustModal.type === 'cash' ? 'Caixa (Dinheiro)' : 
                                        showAdjustModal.type === 'pix' ? 'Caixa (Pix)' :
                                        showAdjustModal.type === 'card' ? 'Caixa (Cartão)' : 'Conta Corrente'
                                    }</b> para:
                                </div>
                                <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                                    <button 
                                        onClick={() => setManagerForm({...managerForm, target: 'cash'})}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${managerForm.target === 'cash' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                                    >
                                        Caixa (Dinheiro)
                                    </button>
                                    <button 
                                        onClick={() => setManagerForm({...managerForm, target: 'bank'})}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${managerForm.target === 'bank' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
                                    >
                                        Conta Corrente
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Valor (R$)</label>
                            <input 
                                type="text" 
                                placeholder="0,00"
                                value={managerForm.amount}
                                onChange={(e) => setManagerForm({...managerForm, amount: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-black text-gray-800 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Justificativa / Motivo</label>
                            <input 
                                type="text" 
                                placeholder={managerForm.operationType === 'deposit' ? "Ex: Aporte inicial" : managerForm.operationType === 'withdraw' ? "Ex: Pagamento fornecedor" : "Ex: Sangria para banco"}
                                value={managerForm.description}
                                onChange={(e) => setManagerForm({...managerForm, description: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={() => handleManagerAction('adjust')}
                        disabled={saving}
                        className={`w-full text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                            managerForm.operationType === 'deposit' ? 'bg-green-600' : 
                            managerForm.operationType === 'withdraw' ? 'bg-red-600' : 'bg-blue-900'
                        }`}
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Operação'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DETALHES DE GASTOS PAGOS */}
      {showPaidDetailsModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1 mb-4 shrink-0">
                    <h3 className="text-blue-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <ClipboardList size={16} /> Detalhamento de Gastos Pagos
                    </h3>
                    <button onClick={() => setShowPaidDetailsModal(false)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                    {monthlyExpenses.paidTransactions.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-8">Nenhum gasto pago no período.</p>
                    ) : (
                        monthlyExpenses.paidTransactions.map(tx => (
                            <div key={tx.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-gray-800">{tx.item}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-gray-500">{new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-[10px] text-gray-500">{tx.category || tx.type}</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-red-600">
                                    R$ {Math.abs(tx.val).toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center shrink-0">
                    <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Total Pago</span>
                    <span className="text-xl font-black text-red-600">R$ {monthlyExpenses.paid.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE ACERTO DE CONTAS & QUITAÇÃO DE COMISSÕES */}
      {showSettlementModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-1 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-900 rounded-2xl">
                            <Users size={22} />
                        </div>
                        <div>
                            <h3 className="text-blue-900 font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                Acerto de Contas & Quitação
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                Quitação de comissões pendentes da equipe
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setShowSettlementModal(false); setSelectedSettlementIds([]); }} 
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Seletor de Colaborador */}
                <div className="shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => { setSettlementSelectedPro('all'); setSelectedSettlementIds([]); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                            settlementSelectedPro === 'all'
                                ? 'bg-blue-900 text-white shadow-md'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        Todos ({pendingCommissionsSummary.allPendingItems.length})
                    </button>
                    {uniquePros.map(p => {
                        const count = (pendingCommissionsSummary.byPro[p]?.items || []).length;
                        const isSelected = settlementSelectedPro === p;
                        return (
                            <button
                                key={p}
                                onClick={() => { setSettlementSelectedPro(p); setSelectedSettlementIds([]); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    isSelected
                                        ? 'bg-blue-900 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                <span>{p}</span>
                                {count > 0 && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isSelected ? 'bg-blue-800 text-white' : 'bg-gray-300 text-gray-700'}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Filtro de Escopo: Todas vs Anteriores vs Período */}
                <div className="flex bg-gray-100 p-1 rounded-2xl shrink-0">
                    <button
                        onClick={() => { setSettlementFilterScope('all'); setSelectedSettlementIds([]); }}
                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            settlementFilterScope === 'all' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Todas as Pendentes ({pendingCommissionsSummary.allPendingItems.length})
                    </button>
                    <button
                        onClick={() => { setSettlementFilterScope('prior'); setSelectedSettlementIds([]); }}
                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            settlementFilterScope === 'prior' ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Períodos Anteriores ({pendingCommissionsSummary.totalPendingPrior > 0 ? `⚠️ R$ ${pendingCommissionsSummary.totalPendingPrior.toFixed(0)}` : '0'})
                    </button>
                    <button
                        onClick={() => { setSettlementFilterScope('period'); setSelectedSettlementIds([]); }}
                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            settlementFilterScope === 'period' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Período Atual ({pendingCommissionsSummary.totalPendingInPeriod > 0 ? `R$ ${pendingCommissionsSummary.totalPendingInPeriod.toFixed(0)}` : '0'})
                    </button>
                </div>

                {/* Alerta de períodos anteriores se houver */}
                {pendingCommissionsSummary.totalPendingPrior > 0 && settlementFilterScope !== 'period' && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-2.5 text-amber-900 shrink-0 text-xs">
                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                        <div className="space-y-0.5">
                            <p className="font-black uppercase tracking-wider text-[10px] text-amber-800">
                                Comissões de Períodos Anteriores Detectadas
                            </p>
                            <p className="text-amber-700 text-[11px] leading-relaxed">
                                Há itens pendentes de datas anteriores ao filtro atual. Eles estão destacados abaixo com a tag &quot;Período Anterior&quot; para não ficarem esquecidos.
                            </p>
                        </div>
                    </div>
                )}

                {/* Cards de Resumo */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 block mb-0.5">Total Pendente</span>
                        <span className="text-lg font-black text-blue-900">
                            R$ {filteredPendingForModal.reduce((acc, t) => acc + t.commissionValue, 0).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-bold">{filteredPendingForModal.length} itens aguardando acerto</span>
                    </div>

                    <div className="bg-green-50 p-3.5 rounded-2xl border border-green-100">
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-600 block mb-0.5">Selecionado para Pagar</span>
                        <span className="text-lg font-black text-green-700">
                            R$ {settlementSelectedTotal.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] text-green-600 block font-bold">{selectedSettlementIds.length} itens marcados</span>
                    </div>
                </div>

                {/* Barra com Botão MARCAR TODAS e Campo de Busca */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            value={settlementSearchTerm} 
                            onChange={e => setSettlementSearchTerm(e.target.value)}
                            placeholder="Buscar por cliente, serviço ou barbeiro..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-900 shadow-sm"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                    </div>

                    {filteredPendingForModal.length > 0 && (
                        <button
                            type="button"
                            onClick={handleToggleSelectAllSettlement}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm ${
                                isAllSettlementSelected
                                    ? 'bg-blue-900 text-white'
                                    : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
                            }`}
                        >
                            {isAllSettlementSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            <span>{isAllSettlementSelected ? 'Desmarcar Todas' : 'Marcar Todas'}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isAllSettlementSelected ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-900'}`}>
                                {filteredPendingForModal.length}
                            </span>
                        </button>
                    )}
                </div>

                {/* Lista de Itens com Scroll */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px] max-h-[35vh]">
                    {filteredPendingForModal.length === 0 ? (
                        <div className="text-center py-10 text-gray-300 space-y-2">
                            <CheckCircle2 size={36} className="mx-auto opacity-30 text-green-600" />
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Nenhuma comissão pendente encontrada neste filtro.
                            </p>
                        </div>
                    ) : (
                        filteredPendingForModal.map((t) => {
                            const isSelected = selectedSettlementIds.includes(t.id);
                            return (
                                <div 
                                    key={t.id} 
                                    onClick={() => {
                                        setSelectedSettlementIds(prev => 
                                            prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                                        );
                                    }}
                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                        isSelected 
                                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 shadow-sm' 
                                            : t.isPrior
                                                ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                                                : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="shrink-0 text-blue-900">
                                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-black text-gray-900">{t.item}</span>
                                                    <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">
                                                        {t.pro}
                                                    </span>
                                                    {t.isPrior && (
                                                        <span className="text-[8px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                                                            Período Anterior ({new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                    <span>{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                    <span>•</span>
                                                    <span>{t.category || t.type}</span>
                                                    {t.client_supplier && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-blue-600 font-black">{t.client_supplier}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0 pl-2">
                                            <p className={`text-sm font-black ${t.type === 'VALE' ? 'text-red-500' : 'text-blue-900'}`}>
                                                {t.type === 'VALE' ? '-' : ''} R$ {Math.abs(t.commissionValue).toFixed(2).replace('.', ',')}
                                            </p>
                                            <span className="text-[9px] text-gray-400 block">Venda: R$ {Math.abs(t.val).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer de Pagamento */}
                <div className="pt-3 border-t border-gray-100 space-y-3 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                Origem do Pagamento
                            </label>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setSettlementPaymentAccount('cash')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                        settlementPaymentAccount === 'cash' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'
                                    }`}
                                >
                                    Caixa Físico
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettlementPaymentAccount('bank')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                        settlementPaymentAccount === 'bank' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'
                                    }`}
                                >
                                    Conta Bancária
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettlementPaymentAccount('pix')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                        settlementPaymentAccount === 'pix' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'
                                    }`}
                                >
                                    Pix
                                </button>
                            </div>
                        </div>

                        <div className="text-right sm:text-right">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Selecionado</span>
                            <span className="text-xl font-black text-green-600 block">
                                R$ {settlementSelectedTotal.toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleExecuteSettlementPayment}
                        disabled={saving || selectedSettlementIds.length === 0}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        Confirmar Quitação ({selectedSettlementIds.length} {selectedSettlementIds.length === 1 ? 'item' : 'itens'})
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO A RECEBER */}
      {showFutureModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center px-1 shrink-0">
                    <h3 className="text-orange-600 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <Clock size={16} /> Detalhes: A Receber (Futuro)
                    </h3>
                    <button onClick={() => setShowFutureModal(false)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shrink-0">
                    <p className="text-[10px] text-orange-800 font-medium leading-relaxed">
                        Estas são as vendas realizadas em <b>Cartão de Crédito</b> no período selecionado. O valor total ainda não está disponível em caixa.
                    </p>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    <div className="space-y-2">
                        {stats.futureTransactions.length > 0 ? (
                            stats.futureTransactions.map((t, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">{t.item}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')} • {t.payment_method}</p>
                                    </div>
                                    <span className="text-xs font-black text-orange-600">R$ {t.val.toFixed(2)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-xs font-medium">
                                Nenhuma transação futura encontrada.
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Futuro</span>
                    <span className="text-lg font-black text-orange-600">R$ {stats.futureReceivables.toFixed(2)}</span>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editingTx && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                        {showDeleteConfirm ? (
                             <AlertCircle size={18} className="text-red-600" />
                        ) : (
                             <Edit2 size={18} className="text-blue-900" />
                        )}
                        <h3 className={`font-black uppercase tracking-widest text-xs ${showDeleteConfirm ? 'text-red-600' : 'text-blue-900'}`}>
                            {showDeleteConfirm ? 'Confirmar Exclusão' : 'Editar Lançamento'}
                        </h3>
                    </div>
                    <button onClick={() => setEditingTx(null)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>

                {showDeleteConfirm ? (
                    <div className="text-center py-2 space-y-4">
                        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce-slow">
                            <Trash2 size={32} className="text-red-500" />
                        </div>
                        <div>
                            <p className="text-gray-800 font-bold text-sm">Tem certeza que deseja excluir?</p>
                            <p className="text-gray-500 text-xs mt-1">Essa ação é irreversível e o valor será removido do caixa.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button 
                                onClick={executeDelete}
                                disabled={saving}
                                className="bg-red-600 text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={14} /> : 'Sim, Excluir'}
                            </button>
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="bg-gray-100 text-gray-600 font-black py-3 rounded-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Descrição</label>
                                <input 
                                    type="text" 
                                    value={editForm.item}
                                    onChange={(e) => setEditForm({...editForm, item: e.target.value})}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Valor (R$)</label>
                                    <input 
                                        type="text" 
                                        value={editForm.val}
                                        onChange={(e) => setEditForm({...editForm, val: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-black text-gray-800 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Data</label>
                                    <input 
                                        type="date" 
                                        value={editForm.date}
                                        onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <button 
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar Alterações</>}
                            </button>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex-1 bg-red-50 text-red-600 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14} /> Excluir
                                </button>
                                <button 
                                    onClick={() => setEditingTx(null)}
                                    className="flex-1 bg-gray-50 text-gray-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default FinancialAdmin;
