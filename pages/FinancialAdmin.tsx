
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Filter, 
  TrendingUp, TrendingDown, DollarSign, Users, 
  ShoppingBag, Trash2, Edit2, AlertCircle, BarChart3, Eye, X, Save, Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, deleteTransaction, updateTransaction, Transaction } from '../data/transactions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { db } from '../supabase'; // Import db to fetch professionals

const FinancialAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPro, setSelectedPro] = useState('all');
  const [loading, setLoading] = useState(true);
  const [professionalsMap, setProfessionalsMap] = useState<Record<string, string>>({}); // Name -> ID mapping

  // Estados do Modal
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ item: '', val: '', date: '' });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Carregar dados iniciais
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTransactions();
      setAllTransactions(data);
      
      // Carregar mapa de profissionais para navegação correta
      const { data: pros } = await db.professionals().select('id, name');
      if (pros) {
          const map: Record<string, string> = {};
          pros.forEach(p => map[p.name] = p.id);
          setProfessionalsMap(map);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('transaction_added', loadData);
    return () => window.removeEventListener('transaction_added', loadData);
  }, []);

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

  // --- CÁLCULOS ESTATÍSTICOS ---
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    // Dados para Gráfico Principal
    const chartMap: Record<string, { name: string, entrada: number, saida: number }> = {};
    
    // Dados para Produção de Barbeiros
    const proMap: Record<string, number> = {};

    // Dados para Top Produtos
    const productsMap: Record<string, number> = {};

    // Dados para Top Clientes
    const clientsMap: Record<string, number> = {};

    filteredData.forEach(t => {
      // Totais Gerais
      if (t.operation === 'VENDA') {
        income += t.val;
      } else {
        expense += Math.abs(t.val);
      }

      // Chart Data (Agrupado por dia)
      const dayLabel = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!chartMap[dayLabel]) chartMap[dayLabel] = { name: dayLabel, entrada: 0, saida: 0 };
      
      if (t.operation === 'VENDA') chartMap[dayLabel].entrada += t.val;
      else chartMap[dayLabel].saida += Math.abs(t.val);

      // Produção por Barbeiro (Apenas Vendas)
      if (t.operation === 'VENDA' && t.pro) {
        proMap[t.pro] = (proMap[t.pro] || 0) + t.val;
      }

      // Top Produtos
      if (t.type === 'PRODUTO' && t.operation === 'VENDA') {
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

    const prosData = Object.entries(proMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topProducts = Object.entries(productsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topClients = Object.entries(clientsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { income, expense, net: income - expense, chartData, prosData, topProducts, topClients };
  }, [filteredData]);

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
    return Array.from(pros);
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

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 p-3 rounded-2xl border border-green-100 text-center">
                <div className="flex justify-center text-green-600 mb-1"><TrendingUp size={18} /></div>
                <span className="text-[9px] font-black text-green-800 uppercase block">Entradas</span>
                <span className="text-sm font-black text-green-700">R$ {stats.income.toFixed(0)}</span>
            </div>
            <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
                <div className="flex justify-center text-red-500 mb-1"><TrendingDown size={18} /></div>
                <span className="text-[9px] font-black text-red-800 uppercase block">Saídas</span>
                <span className="text-sm font-black text-red-700">R$ {stats.expense.toFixed(0)}</span>
            </div>
            <div className={`p-3 rounded-2xl border text-center ${stats.net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                <div className={`flex justify-center mb-1 ${stats.net >= 0 ? 'text-blue-600' : 'text-orange-500'}`}><DollarSign size={18} /></div>
                <span className={`text-[9px] font-black uppercase block ${stats.net >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Saldo</span>
                <span className={`text-sm font-black ${stats.net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>R$ {stats.net.toFixed(0)}</span>
            </div>
        </div>

        {/* GRÁFICO DE ENTRADAS VS SAÍDAS */}
        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-900" /> Fluxo do Período
            </h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            cursor={{fill: '#f8fafc'}}
                        />
                        <Bar dataKey="entrada" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={8} />
                        <Bar dataKey="saida" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={8} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* PRODUÇÃO POR BARBEIRO - CLICÁVEL PARA DETALHES */}
        {selectedPro === 'all' && (
            <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={16} className="text-blue-900" /> Produção da Equipe
                </h3>
                <div className="space-y-3">
                    {stats.prosData.map((pro, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => handleProClick(pro.name)}
                            className="space-y-1 cursor-pointer group active:opacity-70 transition-opacity"
                        >
                            <div className="flex justify-between text-xs font-bold text-gray-700 group-hover:text-blue-900">
                                <span>{pro.name || 'Sem nome'}</span>
                                <span>R$ {pro.value.toFixed(2)}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-900 rounded-full group-hover:bg-blue-700 transition-colors" 
                                    style={{ width: `${(pro.value / (stats.income || 1)) * 100}%` }} 
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

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
        <div className="pt-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pl-2">
                Auditoria de Lançamentos
            </h3>
            <div className="space-y-2">
                {filteredData.map((t) => (
                    <div 
                        key={t.id} 
                        onClick={() => handleOpenEdit(t)}
                        className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group active:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-1 h-8 rounded-full shrink-0 ${t.operation === 'VENDA' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-800 truncate">{t.item}</p>
                                <p className="text-[10px] text-gray-400 font-medium truncate">
                                    {new Date(t.date).toLocaleDateString('pt-BR')} • {t.pro || 'Admin'}
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
                ))}
            </div>
        </div>

      </div>

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
