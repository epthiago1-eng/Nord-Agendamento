
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, Search, Calendar, Filter, ArrowUpDown, 
  ChevronDown, ChevronUp, DollarSign, Scissors, Box, 
  Clipboard, Loader2, User, CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, Transaction } from '../data/transactions';
import { db } from '../supabase';

interface AttendanceGroup {
  appointmentId: string;
  clientName: string;
  date: string;
  totalValue: number;
  totalCommission: number;
  paymentMethod: string;
  observation?: string;
  services: { name: string; price: number; commission: number }[];
  products: { name: string; price: number; commission: number; quantity: number }[];
}

const CollaboratorAttendanceLog: React.FC = () => {
  const navigate = useNavigate();
  const proName = localStorage.getItem('user_name') || '';
  const proId = localStorage.getItem('user_pro_id') || '';

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [commissionConfigs, setCommissionConfigs] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'date' | 'commission'>('date');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Busca configurações de comissão para cálculo preciso
        if (proId) {
          const { data: configs } = await db.professionalServices().select('*').eq('professional_id', proId);
          if (configs) setCommissionConfigs(configs);
        }

        // 2. Busca todas as transações (Vendas) do profissional
        const allTrans = await getTransactions();
        const filtered = allTrans.filter(t => 
          t.operation === 'VENDA' && (t.pro === proName || t.professional_id === proId)
        );
        setTransactions(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [proName, proId]);

  const calculateCommission = (t: Transaction) => {
    // Busca config específica ou usa padrão 40% serviço / 10% produto
    // Nota: Como não temos o service_id aqui direto na transação, 
    // tentamos encontrar pela descrição ou usamos o padrão.
    // Para simplificar esta visualização, usaremos o padrão salvo no layout anterior
    const rate = (t.type === 'SERVIÇO' || t.category === 'Serviço') ? 0.4 : 0.1;
    return (t.total_value || t.val) * rate;
  };

  // Agrupa transações por Agendamento (appointment_id)
  const groupedAttendances = useMemo(() => {
    const groups: Record<string, AttendanceGroup> = {};

    transactions.forEach(t => {
      const id = t.appointment_id || `avulso-${t.id}`;
      const comm = calculateCommission(t);

      if (!groups[id]) {
        groups[id] = {
          appointmentId: id,
          clientName: t.client_supplier || 'Cliente Avulso',
          date: t.date,
          totalValue: 0,
          totalCommission: 0,
          paymentMethod: t.payment_method,
          services: [],
          products: []
        };
      }

      groups[id].totalValue += (t.total_value || t.val);
      groups[id].totalCommission += comm;

      if (t.type === 'SERVIÇO' || t.category === 'Serviço') {
        groups[id].services.push({ name: t.item, price: (t.total_value || t.val), commission: comm });
      } else {
        groups[id].products.push({ name: t.item, price: (t.total_value || t.val), commission: comm, quantity: t.quantity || 1 });
      }
    });

    return Object.values(groups);
  }, [transactions]);

  // Aplica Filtros e Ordenação
  const filteredList = useMemo(() => {
    let list = [...groupedAttendances];

    // Busca por Cliente
    if (searchTerm) {
      list = list.filter(a => a.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Data Única
    if (dateFilter) {
      list = list.filter(a => a.date === dateFilter);
    }

    // Range de Datas
    if (startDate && endDate) {
      list = list.filter(a => a.date >= startDate && a.date <= endDate);
    }

    // Ordenação
    if (sortOrder === 'commission') {
      list.sort((a, b) => b.totalCommission - a.totalCommission);
    } else {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return list;
  }, [groupedAttendances, searchTerm, dateFilter, startDate, endDate, sortOrder]);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight">Meus Atendimentos</h1>
            <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">{proName}</p>
        </div>
        <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl transition-all ${showFilters ? 'bg-white text-blue-900' : 'bg-blue-800 text-white border border-blue-700'}`}
        >
            <Filter size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        
        {/* Filtros Expansíveis */}
        {showFilters && (
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-lg space-y-4 animate-in slide-in-from-top-2">
                <div className="relative">
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por cliente..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-10 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-medium"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Início</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2 text-xs font-bold text-gray-700" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Fim</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2 text-xs font-bold text-gray-700" />
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        onClick={() => setSortOrder(sortOrder === 'date' ? 'commission' : 'date')}
                        className="w-full bg-blue-50 text-blue-900 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                    >
                        <ArrowUpDown size={14} />
                        {sortOrder === 'date' ? 'Ordenar por Maior Comissão' : 'Ordenar por Data Recente'}
                    </button>
                </div>
            </div>
        )}

        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-blue-900/30">
                <Loader2 className="animate-spin" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest">Buscando histórico...</span>
            </div>
        ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-300">
                <Clipboard size={48} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhum atendimento encontrado</p>
            </div>
        ) : (
            filteredList.map((att) => {
                const isExpanded = expandedId === att.appointmentId;
                return (
                    <div 
                        key={att.appointmentId}
                        className={`bg-white rounded-[2rem] border transition-all duration-300 ${isExpanded ? 'shadow-xl ring-2 ring-blue-100 border-blue-200' : 'shadow-sm border-gray-100'}`}
                    >
                        {/* CARD CABEÇALHO (REDUZIDO) */}
                        <div 
                            onClick={() => setExpandedId(isExpanded ? null : att.appointmentId)}
                            className="p-5 flex items-center justify-between cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 shadow-inner">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-800 leading-tight">{att.clientName}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(att.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <div>
                                    <p className="text-sm font-black text-gray-900">R$ {att.totalValue.toFixed(2).replace('.', ',')}</p>
                                    <p className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">+ R$ {att.totalCommission.toFixed(2).replace('.', ',')}</p>
                                </div>
                                {isExpanded ? <ChevronUp size={20} className="text-gray-300" /> : <ChevronDown size={20} className="text-gray-300" />}
                            </div>
                        </div>

                        {/* ÁREA EXPANSÍVEL */}
                        {isExpanded && (
                            <div className="px-5 pb-6 space-y-5 animate-in slide-in-from-top-2">
                                <div className="h-px bg-gray-100 w-full" />
                                
                                {/* Info Pagamento */}
                                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                    <CreditCard size={16} className="text-blue-900" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagamento:</span>
                                    <span className="text-xs font-bold text-blue-900 uppercase">{att.paymentMethod || 'Não informado'}</span>
                                </div>

                                {/* Serviços */}
                                {att.services.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-blue-900 pl-1">
                                            <Scissors size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Serviços Executados</span>
                                        </div>
                                        {att.services.map((s, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs font-medium text-gray-600 bg-white border border-gray-50 p-3 rounded-xl shadow-sm">
                                                <span>{s.name}</span>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">R$ {s.price.toFixed(2)}</p>
                                                    <p className="text-[8px] text-green-600 font-black">COM: R$ {s.commission.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Produtos */}
                                {att.products.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-orange-600 pl-1">
                                            <Box size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Produtos Vendidos</span>
                                        </div>
                                        {att.products.map((p, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs font-medium text-gray-600 bg-white border border-gray-50 p-3 rounded-xl shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-black">{p.quantity}x</span>
                                                    <span>{p.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">R$ {p.price.toFixed(2)}</p>
                                                    <p className="text-[8px] text-green-600 font-black">COM: R$ {p.commission.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Observações (Se existisse no agendamento consolidado) */}
                                {att.observation && (
                                    <div className="p-3 bg-yellow-50 rounded-2xl border border-yellow-100">
                                        <p className="text-[8px] font-black text-yellow-700 uppercase mb-1">Observação do Atendimento</p>
                                        <p className="text-[11px] text-yellow-800 italic">{att.observation}</p>
                                    </div>
                                )}

                                <button 
                                    onClick={() => navigate(`/client-history/${att.appointmentId.split('-')[1]}`)}
                                    className="w-full py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                                >
                                    Ver Ficha do Cliente
                                </button>
                            </div>
                        )}
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default CollaboratorAttendanceLog;
