
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, Wallet, TrendingUp, ShoppingBag, ClipboardList, 
  Star, User, Calendar, PlusCircle, ArrowRight, Lock, CheckCircle2,
  History, Loader2, BarChart3, Clock, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, Transaction } from '../data/transactions';
import { getAppointments, Appointment } from '../data/agendaData';
import { db } from '../supabase';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CollaboratorFinancial: React.FC = () => {
  const navigate = useNavigate();
  const proName = localStorage.getItem('user_name') || 'Colaborador';
  const proId = localStorage.getItem('user_pro_id') || '';
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [commConfigs, setCommConfigs] = useState<any[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<string, string>>({});

  // Estados dos Toggles dos Gráficos
  const [prodMetric, setProdMetric] = useState<'value' | 'count'>('value');
  const [peakMetric, setPeakMetric] = useState<'hour' | 'day'>('hour');

  // Estados de Navegação de Data
  const [referenceDate, setReferenceDate] = useState(new Date());

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        // Calcular intervalo do mês atual
        const year = referenceDate.getFullYear();
        const month = referenceDate.getMonth();
        const start = new Date(year, month, 1).toISOString().split('T')[0];
        const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

        // Buscar dados filtrados por data e profissional
        const [trans, apts] = await Promise.all([
            getTransactions({ proId: proId, startDate: start, endDate: end }),
            getAppointments({ proId: proId, startDate: start, endDate: end })
        ]);
        
        setTransactions(trans);
        setAppointments(apts);

        if (proId) {
          const [configsRes, servicesRes] = await Promise.all([
            db.professionalServices().select('*').eq('professional_id', proId),
            db.services().select('id, name')
          ]);
          
          if (configsRes.data) setCommConfigs(configsRes.data);
          if (servicesRes.data) {
            const map: Record<string, string> = {};
            servicesRes.data.forEach(s => map[s.name] = s.id);
            setServicesMap(map);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
    window.addEventListener('transaction_added', loadAll);
    return () => window.removeEventListener('transaction_added', loadAll);
  }, [proId, referenceDate]);

  // Funções de Navegação
  const changeMonth = (offset: number) => {
    const newDate = new Date(referenceDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setReferenceDate(newDate);
  };

  const changeWeek = (offset: number) => {
    const newDate = new Date(referenceDate);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setReferenceDate(newDate);
  };

  // --- LÓGICA DE DADOS PARA GRÁFICOS ---

  // 1. Produção Diária (Semana da Data de Referência)
  const chartDailyData = useMemo(() => {
    const data = [];
    const base = new Date(referenceDate);
    // Ajustar para o último domingo
    base.setDate(base.getDate() - base.getDay());
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const dayNum = d.getDate();

        const dayTrans = transactions.filter(t => 
            t.date === dateStr && 
            ((proId && t.professional_id === proId) || (!proId && t.pro === proName)) &&
            t.operation === 'VENDA'
        );

        const totalValue = dayTrans.reduce((acc, curr) => acc + curr.val, 0);
        const aptIds = new Set(dayTrans.map(t => t.appointment_id || t.id));

        data.push({
            name: `${dayLabel} ${dayNum}`,
            value: totalValue,
            count: aptIds.size,
            isToday: dateStr === new Date().toISOString().split('T')[0]
        });
    }
    return data;
  }, [transactions, proId, proName, referenceDate]);

  // 2. Análise de Pico (Filtra pelo mês de referência)
  const peakData = useMemo(() => {
    const refMonth = referenceDate.getMonth();
    const refYear = referenceDate.getFullYear();

    const hours = [
        { name: '08-12h', count: 0 },
        { name: '12-16h', count: 0 },
        { name: '16-20h', count: 0 },
        { name: '20-00h', count: 0 }
    ];

    const days = [
        { name: 'Seg', count: 0 },
        { name: 'Ter', count: 0 },
        { name: 'Qua', count: 0 },
        { name: 'Qui', count: 0 },
        { name: 'Sex', count: 0 },
        { name: 'Sáb', count: 0 }
    ];

    appointments.forEach(apt => {
        const d = new Date(apt.date + 'T12:00:00');
        if (d.getMonth() === refMonth && d.getFullYear() === refYear && (apt.status === 'Atendimento Realizado' || apt.status === 'Confirmado')) {
            const hour = parseInt(apt.time.split(':')[0]);
            if (hour >= 8 && hour < 12) hours[0].count++;
            else if (hour >= 12 && hour < 16) hours[1].count++;
            else if (hour >= 16 && hour < 20) hours[2].count++;
            else if (hour >= 20) hours[3].count++;

            const dayIdx = d.getDay(); 
            if (dayIdx >= 1 && dayIdx <= 6) {
                days[dayIdx - 1].count++;
            }
        }
    });

    return { hours, days };
  }, [appointments, referenceDate]);

  const myStats = useMemo(() => {
    const refMonth = referenceDate.getMonth();
    const refYear = referenceDate.getFullYear();
    const today = new Date().toISOString().split('T')[0];
    
    let daily = 0, dailyCount = 0, monthServ = 0, monthProd = 0, monthTips = 0;
    let pendingCommission = 0;
    let receivedCommission = 0;
    
    const myTrans = transactions.filter(t => 
        (proId && t.professional_id === proId) || (!proId && t.pro === proName)
    ).filter(t => t.operation === 'VENDA' || t.type === 'VALE');

    // Helper de Cálculo (Mesma lógica das outras telas)
    const calculateCommission = (t: Transaction) => {
        // 0. Se for VALE, retorna valor negativo (Dedução)
        if (t.type === 'VALE') {
            return -Math.abs(t.val);
        }
        // 1. Override
        if (t.commission_value !== undefined && t.commission_value !== null) {
            return t.commission_type === 'percent' 
                ? t.val * (t.commission_value / 100)
                : t.commission_value;
        }
        // 2. Frozen
        if (t.commission_amount !== undefined && t.commission_amount !== null) {
            return t.commission_amount;
        }
        // 3. Tip
        if (t.category === 'Gorjeta' || t.type === 'GORJETA') {
            return t.val;
        }
        // 4. Outros -> 0
        if (t.type === 'OUTROS') {
            return 0;
        }
        // 5. Config/Fallback
        const serviceId = servicesMap[t.item];
        const config = commConfigs.find(c => c.service_id === serviceId);
        
        if (config) {
            return config.commission_type === 'percent' 
                ? t.val * (config.commission_value / 100)
                : config.commission_value;
        } else {
            const rate = (t.category === 'Serviço' || t.type === 'SERVIÇO') ? 0.4 : 0.1;
            return t.val * rate;
        }
    };

    myTrans.forEach(t => {
        const d = new Date(t.date + 'T12:00:00');
        const inRefMonth = d.getMonth() === refMonth && d.getFullYear() === refYear;

        if (t.date === today) {
          daily += t.val;
          dailyCount++;
        }

        const commValue = calculateCommission(t);

        if (inRefMonth) {
            if (t.category === 'Gorjeta' || t.type === 'GORJETA') monthTips += t.val;
            else if (t.category === 'Serviço' || t.type === 'SERVIÇO') monthServ += t.val;
            else monthProd += t.val;

            if (t.commission_paid) receivedCommission += commValue;
            else pendingCommission += commValue;
        }
    });

    return { daily, dailyCount, monthServ, monthProd, monthTips, pendingCommission, receivedCommission };
  }, [transactions, commConfigs, servicesMap, proName, proId, referenceDate]);

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center bg-[#fcfaff]">
            <Loader2 className="animate-spin text-blue-900" size={40} />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate('/menu')}><ChevronLeft size={24} /></button>
        <div className="flex-1 flex items-center justify-center gap-4">
            <button onClick={() => changeMonth(-1)}><ChevronLeft size={20} className="text-blue-300" /></button>
            <h1 className="text-lg font-black tracking-widest uppercase">
                {referenceDate.toLocaleString('pt-BR', { month: 'long' })}
            </h1>
            <button onClick={() => changeMonth(1)}><ChevronRight size={20} className="text-blue-300" /></button>
        </div>
      </header>

      <div className="p-4 space-y-5 pb-24 overflow-y-auto">
        
        {/* BOTÃO DE ATENDIMENTOS */}
        <div className="grid grid-cols-1 gap-3">
            <button 
            onClick={() => navigate('/financial/my-attendance')}
            className="w-full bg-blue-50 p-5 rounded-[2rem] border border-blue-100 flex items-center justify-between active:scale-[0.98] transition-all group"
            >
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-sm">
                <History size={22} />
                </div>
                <div className="text-left">
                <h3 className="text-blue-900 font-black text-xs uppercase tracking-widest">Ver atendimentos</h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase">Histórico detalhado próprio</p>
                </div>
            </div>
            <ArrowRight size={20} className="text-blue-300" />
            </button>
        </div>

        {/* CARD PRINCIPAL DE SALDO */}
        <button 
            onClick={() => navigate('/financial/my-commissions')}
            className="w-full bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden text-left active:scale-[0.98] transition-transform"
        >
            <div className="absolute -right-4 -top-4 opacity-10 rotate-12"><Wallet size={120} /></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em]">Saldo a Receber ({referenceDate.toLocaleString('pt-BR', {month: 'short'})})</p>
                    <ArrowRight size={16} className="text-blue-200" />
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                    <h2 className="text-4xl font-black">R$ {myStats.pendingCommission.toFixed(2).replace('.', ',')}</h2>
                    <span className="bg-blue-800 text-blue-200 text-[9px] px-2 py-1 rounded-lg font-bold uppercase">Pendente</span>
                </div>

                <div className="pt-4 border-t border-blue-400/30 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold text-blue-300 uppercase tracking-widest mb-0.5">Recebido no Mês</p>
                        <p className="text-lg font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={16} className="text-green-400" />
                            R$ {myStats.receivedCommission.toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-blue-300 uppercase tracking-widest mb-0.5">Produção Total</p>
                        <p className="text-lg font-bold">R$ {(myStats.monthServ + myStats.monthProd + myStats.monthTips).toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
            </div>
        </button>

        {/* SEÇÃO DE GRÁFICOS DE PERFORMANCE */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            
            {/* Gráfico 1: Produção Semanal */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => changeWeek(-1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={16} className="text-gray-400" /></button>
                        <h3 className="text-gray-900 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 size={16} className="text-blue-900" /> Produção Semanal
                        </h3>
                        <button onClick={() => changeWeek(1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={16} className="text-gray-400" /></button>
                    </div>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg">
                        <button 
                            onClick={() => setProdMetric('value')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${prodMetric === 'value' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-400'}`}
                        >
                            R$
                        </button>
                        <button 
                            onClick={() => setProdMetric('count')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${prodMetric === 'count' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-400'}`}
                        >
                            Qtd
                        </button>
                    </div>
                </div>

                <div className="h-40 w-full min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#9ca3af' }} />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-[#1e3a8a] text-white p-2 rounded-xl text-[10px] font-bold shadow-xl border border-white/20">
                                                {prodMetric === 'value' ? `R$ ${Number(payload[0].value).toFixed(2)}` : `${payload[0].payload.count} atendimentos`}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey={prodMetric === 'value' ? 'value' : 'count'} radius={[6, 6, 0, 0]} barSize={24}>
                                {chartDailyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isToday ? '#1e3a8a' : '#bfdbfe'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="h-px bg-gray-50" />

            {/* Gráfico 2: Análise de Horários e Dias */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-gray-900 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                        <Clock size={16} className="text-blue-900" /> Fluxo de Trabalho ({referenceDate.toLocaleString('pt-BR', {month: 'short'})})
                    </h3>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg">
                        <button 
                            onClick={() => setPeakMetric('hour')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${peakMetric === 'hour' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-400'}`}
                        >
                            Horas
                        </button>
                        <button 
                            onClick={() => setPeakMetric('day')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${peakMetric === 'day' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-400'}`}
                        >
                            Dias
                        </button>
                    </div>
                </div>

                <div className="h-40 w-full min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={peakMetric === 'hour' ? peakData.hours : peakData.days} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#9ca3af' }} />
                            <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => (active && payload ? <div className="bg-gray-900 text-white p-2 rounded-lg text-[9px] font-bold">{payload[0].value} atendimentos</div> : null)} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 4, 4]} barSize={peakMetric === 'hour' ? 40 : 25} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-gray-400 text-center font-bold uppercase tracking-widest">Análise do faturamento bruto no período</p>
            </div>
        </div>

        {/* HOJE E VENDA BRUTA */}
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
                    <span className="text-[10px] font-black uppercase tracking-widest">Venda Bruta ({referenceDate.toLocaleString('pt-BR', {month: 'short'})})</span>
                </div>
                <p className="text-xl font-black text-gray-900">R$ {(myStats.monthServ + myStats.monthProd).toFixed(2).replace('.', ',')}</p>
            </div>
        </div>

        {/* DETALHES DE PRODUÇÃO */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-gray-900 font-black text-xs uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <Star size={14} className="text-yellow-500" /> Detalhes de Produção
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-50 p-2 rounded-xl text-green-500"><Wallet size={18} /></div>
                        <span className="text-sm font-bold text-gray-700 tracking-tight">Gorjetas</span>
                    </div>
                    <span className="font-black text-gray-900">R$ {myStats.monthTips.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorFinancial;
