import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, CheckCircle2, Clock, AlertCircle, XCircle, TrendingUp, 
  DollarSign, RefreshCw, Calendar, ChevronRight, User, Scissors,
  CreditCard, Wallet, Banknote, ShieldAlert, Award, ArrowUpRight,
  Sparkles, Check, Phone, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Appointment } from '../types';
import { supabase, db } from '../supabase';

interface AgendaDashboardProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  appointments: Appointment[];
  professionalsList: any[];
  userRole: string;
  userProId: string;
  userName: string;
  loading: boolean;
  onRefresh: () => void;
  onNavigateToGrid: (proId?: string) => void;
}

interface ProfessionalDayStats {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
  completedCount: number;
  totalCount: number;
  confirmedCount: number;
  cancelledCount: number;
  inProgressCount: number;
  totalBookedMinutes: number;
  totalWorkMinutes: number;
  occupancyRate: number;
  revenue: number;
  averageTicket: number;
  nextAppointment?: Appointment;
  appointments: Appointment[];
}

interface DayPaymentBreakdown {
  cash: number;
  pix: number;
  card: number;
  bank: number;
  other: number;
  total: number;
}

export const AgendaDashboard: React.FC<AgendaDashboardProps> = ({
  selectedDate,
  setSelectedDate,
  appointments,
  professionalsList,
  userRole,
  userProId,
  userName,
  loading: parentLoading,
  onRefresh,
  onNavigateToGrid,
}) => {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [proHours, setProHours] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [selectedProFilter, setSelectedProFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'metrics' | 'professionals' | 'timeline'>('metrics');

  const dateStr = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const isToday = useMemo(() => {
    const now = new Date();
    return selectedDate.toDateString() === now.toDateString();
  }, [selectedDate]);

  // Fetch transações do dia e horários de trabalho dos profissionais
  const fetchDashboardExtra = async () => {
    setLoadingData(true);
    try {
      const [txRes, hoursRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('date', dateStr),
        db.professionalHours()
          .select('*')
      ]);

      setTransactions(txRes.data || []);
      setProHours(hoursRes.data || []);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Erro ao buscar transações/horários para o dashboard:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchDashboardExtra();
  }, [dateStr]);

  const handleManualRefresh = () => {
    onRefresh();
    fetchDashboardExtra();
  };

  // Dia da semana em português para compatibilidade com a tabela professional_hours
  const dayOfWeekName = useMemo(() => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[selectedDate.getDay()];
  }, [selectedDate]);

  // Filtra agendamentos baseado no papel e no filtro selecionado
  const filteredAppointments = useMemo(() => {
    let list = appointments;
    if (userRole === 'COLLABORATOR' && userProId) {
      list = list.filter(a => a.professionalId === userProId);
    } else if (selectedProFilter !== 'all') {
      list = list.filter(a => a.professionalId === selectedProFilter);
    }
    return list;
  }, [appointments, userRole, userProId, selectedProFilter]);

  // 1. MÉTRICAS DE AGENDAMENTOS
  const appointmentStats = useMemo(() => {
    const total = filteredAppointments.length;
    let completed = 0;
    let inProgress = 0;
    let confirmed = 0;
    let cancelled = 0;

    filteredAppointments.forEach(apt => {
      const st = apt.status;
      if (st === 'Atendimento Realizado' || st === 'Atendido') {
        completed++;
      } else if (st === 'Chegou' || st === 'Aberto') {
        inProgress++;
      } else if (st === 'Confirmado') {
        confirmed++;
      } else if (st === 'Cancelaram' || st === 'Desmarcou' || st === 'Faltou') {
        cancelled++;
      } else {
        confirmed++;
      }
    });

    const activeAppointments = total - cancelled;
    const completionRate = activeAppointments > 0 ? Math.round((completed / activeAppointments) * 100) : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      confirmed,
      cancelled,
      activeAppointments,
      completionRate,
      cancellationRate
    };
  }, [filteredAppointments]);

  // 2. MÉTRICAS DE FATURAMENTO
  const revenueStats = useMemo(() => {
    // Faturamento realizado de agendamentos
    const completedApts = filteredAppointments.filter(
      a => a.status === 'Atendimento Realizado' || a.status === 'Atendido'
    );
    const appointmentRevenue = completedApts.reduce(
      (acc, a) => acc + (Number(a.totalValue) || 0), 
      0
    );

    // Faturamento realizado de transações (vendas de balcão ou adicionais)
    let extraSalesRevenue = 0;
    const relevantTxs = transactions.filter(t => {
      const isSale = t.operation === 'VENDA' || t.operation_type === 'ENTRADA';
      const isPaid = t.status === 'Pago' || !t.status;
      if (userRole === 'COLLABORATOR' && userProId) {
        return isSale && isPaid && t.professional_id === userProId;
      }
      if (selectedProFilter !== 'all') {
        return isSale && isPaid && t.professional_id === selectedProFilter;
      }
      return isSale && isPaid;
    });

    // Se temos transações com appointment_id já somadas no agendamento, evitamos duplicar
    const appointmentIdsWithTotal = new Set(
      completedApts.filter(a => (Number(a.totalValue) || 0) > 0).map(a => a.id)
    );

    relevantTxs.forEach(tx => {
      // Se for venda avulsa ou transação sem vínculo a agendamento que já somou o total
      if (!tx.appointment_id || !appointmentIdsWithTotal.has(tx.appointment_id)) {
        extraSalesRevenue += Number(tx.total_value || tx.val || 0);
      }
    });

    // Faturamento Total Realizado do dia
    const totalRealizedRevenue = appointmentRevenue + extraSalesRevenue;

    // Faturamento Previsto / Potencial (incluindo confirmados/em andamento)
    const pendingApts = filteredAppointments.filter(
      a => a.status !== 'Atendimento Realizado' && 
           a.status !== 'Atendido' && 
           a.status !== 'Cancelaram' && 
           a.status !== 'Desmarcou' && 
           a.status !== 'Faltou'
    );
    const pendingRevenue = pendingApts.reduce(
      (acc, a) => acc + (Number(a.totalValue) || 0), 
      0
    );

    const projectedTotalRevenue = totalRealizedRevenue + pendingRevenue;

    // Ticket Médio
    const completedCount = completedApts.length;
    const averageTicket = completedCount > 0 ? totalRealizedRevenue / completedCount : 0;

    // Detalhamento de formas de pagamento
    const paymentBreakdown: DayPaymentBreakdown = {
      cash: 0,
      pix: 0,
      card: 0,
      bank: 0,
      other: 0,
      total: totalRealizedRevenue
    };

    // Percorre agendamentos concluídos com detalhamento de pagamentos
    completedApts.forEach(apt => {
      if (Array.isArray(apt.payments) && apt.payments.length > 0) {
        apt.payments.forEach(p => {
          const method = (p.method || '').toLowerCase();
          const val = Number(p.value) || 0;
          if (method.includes('dinheiro')) paymentBreakdown.cash += val;
          else if (method.includes('pix')) paymentBreakdown.pix += val;
          else if (method.includes('cart') || method.includes('crédito') || method.includes('débito')) paymentBreakdown.card += val;
          else if (method.includes('banco') || method.includes('transf')) paymentBreakdown.bank += val;
          else paymentBreakdown.other += val;
        });
      } else if (apt.payment_method) {
        const method = apt.payment_method.toLowerCase();
        const val = Number(apt.totalValue) || 0;
        if (method.includes('dinheiro')) paymentBreakdown.cash += val;
        else if (method.includes('pix')) paymentBreakdown.pix += val;
        else if (method.includes('cart') || method.includes('crédito') || method.includes('débito')) paymentBreakdown.card += val;
        else if (method.includes('banco') || method.includes('transf')) paymentBreakdown.bank += val;
        else paymentBreakdown.other += val;
      }
    });

    // Se o breakdown ainda estiver zerado, tenta derivar das transações
    if (paymentBreakdown.cash === 0 && paymentBreakdown.pix === 0 && paymentBreakdown.card === 0 && paymentBreakdown.bank === 0) {
      relevantTxs.forEach(tx => {
        const acc = tx.payment_account;
        const method = (tx.payment_method || '').toLowerCase();
        const val = Number(tx.total_value || tx.val || 0);
        if (acc === 'CASH' || method.includes('dinheiro')) paymentBreakdown.cash += val;
        else if (acc === 'PIX' || method.includes('pix')) paymentBreakdown.pix += val;
        else if (acc === 'CARD' || method.includes('cart') || method.includes('crédito') || method.includes('débito')) paymentBreakdown.card += val;
        else if (acc === 'BANK' || method.includes('banco') || method.includes('transf')) paymentBreakdown.bank += val;
        else paymentBreakdown.other += val;
      });
    }

    return {
      totalRealizedRevenue,
      pendingRevenue,
      projectedTotalRevenue,
      averageTicket,
      paymentBreakdown
    };
  }, [filteredAppointments, transactions, userRole, userProId, selectedProFilter]);

  // 3. MÉTRICAS DE OCUPAÇÃO POR PROFISSIONAL
  const professionalsStats = useMemo<ProfessionalDayStats[]>(() => {
    // Lista de profissionais a considerar
    let targetPros = professionalsList;
    if (userRole === 'COLLABORATOR' && userProId) {
      targetPros = professionalsList.filter(p => p.id === userProId);
      if (targetPros.length === 0) {
        targetPros = [{ id: userProId, name: userName }];
      }
    }

    const nowTimeStr = new Date().toTimeString().substring(0, 5);

    return targetPros.map(pro => {
      // Agendamentos deste profissional no dia
      const proApts = appointments.filter(a => a.professionalId === pro.id);
      
      let completedCount = 0;
      let confirmedCount = 0;
      let cancelledCount = 0;
      let inProgressCount = 0;
      let totalBookedMinutes = 0;
      let revenue = 0;

      proApts.forEach(a => {
        const isCancelled = a.status === 'Cancelaram' || a.status === 'Desmarcou' || a.status === 'Faltou';
        if (isCancelled) {
          cancelledCount++;
        } else {
          totalBookedMinutes += Number(a.duration) || 30;
          if (a.status === 'Atendimento Realizado' || a.status === 'Atendido') {
            completedCount++;
            revenue += Number(a.totalValue) || 0;
          } else if (a.status === 'Chegou' || a.status === 'Aberto') {
            inProgressCount++;
          } else {
            confirmedCount++;
          }
        }
      });

      // Calcula jornada disponível do profissional para este dia da semana
      const proDaySlots = proHours.filter(
        h => h.professional_id === pro.id && 
             h.day_of_week?.toLowerCase().trim() === dayOfWeekName.toLowerCase().trim()
      );

      let totalWorkMinutes = 0;
      if (proDaySlots.length > 0) {
        proDaySlots.forEach(slot => {
          const [sh, sm] = (slot.start_time || '09:00').split(':').map(Number);
          const [eh, em] = (slot.end_time || '19:00').split(':').map(Number);
          const startM = (sh * 60) + (sm || 0);
          const endM = (eh * 60) + (em || 0);
          if (endM > startM) {
            totalWorkMinutes += (endM - startM);
          }
        });
      }

      // Se não houver horário específico cadastrado, usa jornada padrão de 10h (600min)
      if (totalWorkMinutes <= 0) {
        totalWorkMinutes = 600; // 09:00 às 19:00
      }

      // Taxa de ocupação percentual
      const occupancyRate = Math.min(100, Math.round((totalBookedMinutes / totalWorkMinutes) * 100));
      const averageTicket = completedCount > 0 ? revenue / completedCount : 0;

      // Próximo agendamento do dia
      const upcomingApts = proApts
        .filter(a => a.status !== 'Atendimento Realizado' && 
                     a.status !== 'Cancelaram' && 
                     a.status !== 'Desmarcou' && 
                     a.status !== 'Faltou')
        .sort((a, b) => a.time.localeCompare(b.time));
      
      const nextAppointment = isToday 
        ? upcomingApts.find(a => a.time >= nowTimeStr) || upcomingApts[0]
        : upcomingApts[0];

      return {
        id: pro.id,
        name: pro.name,
        avatar: pro.avatar,
        phone: pro.phone,
        completedCount,
        totalCount: proApts.length,
        confirmedCount,
        cancelledCount,
        inProgressCount,
        totalBookedMinutes,
        totalWorkMinutes,
        occupancyRate,
        revenue,
        averageTicket,
        nextAppointment,
        appointments: proApts
      };
    }).sort((a, b) => b.occupancyRate - a.occupancyRate);
  }, [professionalsList, appointments, proHours, dayOfWeekName, isToday, userRole, userProId, userName]);

  // Taxa de ocupação média global da barbearia
  const averageTeamOccupancy = useMemo(() => {
    if (professionalsStats.length === 0) return 0;
    const sum = professionalsStats.reduce((acc, p) => acc + p.occupancyRate, 0);
    return Math.round(sum / professionalsStats.length);
  }, [professionalsStats]);

  // Formatador BRL
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Helper para minutos em horas e minutos
  const formatMinutesToHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Alta Ocupação' };
    if (rate >= 50) return { bar: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Ocupação Ideal' };
    if (rate >= 20) return { bar: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Ocupação Moderada' };
    return { bar: 'bg-gray-400', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Horários Livres' };
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 space-y-6">
      {/* Top Banner de Status em Tempo Real */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute opacity-75" />
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#1e3a8a]">
                Visão em Tempo Real
              </span>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {isToday ? 'Hoje' : selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Sincronizado automaticamente com agendamentos e faturamento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-[11px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100 transition-colors"
            >
              Ir para Hoje
            </button>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={loadingData || parentLoading}
            className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 hover:text-blue-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
            title="Atualizar dados agora"
          >
            <RefreshCw size={13} className={loadingData || parentLoading ? 'animate-spin text-blue-900' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Tabs de Navegação Interna do Dashboard */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'metrics'
              ? 'bg-[#1e3a8a] text-white shadow-md'
              : 'text-gray-500 hover:text-gray-800 bg-white border border-gray-100'
          }`}
        >
          <TrendingUp size={15} />
          <span>Visão Geral</span>
        </button>

        <button
          onClick={() => setActiveTab('professionals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'professionals'
              ? 'bg-[#1e3a8a] text-white shadow-md'
              : 'text-gray-500 hover:text-gray-800 bg-white border border-gray-100'
          }`}
        >
          <Users size={15} />
          <span>Ocupação da Equipe</span>
          <span className="ml-1 bg-blue-100 text-blue-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
            {professionalsStats.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'timeline'
              ? 'bg-[#1e3a8a] text-white shadow-md'
              : 'text-gray-500 hover:text-gray-800 bg-white border border-gray-100'
          }`}
        >
          <Clock size={15} />
          <span>Fila do Dia</span>
          <span className="ml-1 bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
            {filteredAppointments.length}
          </span>
        </button>

        {userRole === 'ADMIN' && professionalsList.length > 1 && (
          <div className="ml-auto shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Filtrar:</span>
            <select
              value={selectedProFilter}
              onChange={(e) => setSelectedProFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-900"
            >
              <option value="all">Toda a Barbearia</option>
              {professionalsList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3 HERO METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: AGENDAMENTOS REALIZADOS HOJE */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Agendamentos do Dia
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-gray-900">
                  {appointmentStats.completed}
                </span>
                <span className="text-sm font-bold text-gray-400">
                  de {appointmentStats.activeAppointments} ativos
                </span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 size={24} />
            </div>
          </div>

          {/* Barra de progresso de conclusão */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-700">Taxa de Conclusão</span>
              <span className="text-gray-700">{appointmentStats.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${appointmentStats.completionRate}%` }} 
              />
            </div>
          </div>

          {/* Detalhamento de Status */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
            <div className="bg-emerald-50/60 rounded-xl p-2 border border-emerald-100/50">
              <p className="text-[9px] font-black uppercase text-emerald-700">Realizados</p>
              <p className="text-base font-black text-emerald-900">{appointmentStats.completed}</p>
            </div>
            <div className="bg-blue-50/60 rounded-xl p-2 border border-blue-100/50">
              <p className="text-[9px] font-black uppercase text-blue-700">Aguardando</p>
              <p className="text-base font-black text-blue-900">{appointmentStats.confirmed + appointmentStats.inProgress}</p>
            </div>
            <div className="bg-rose-50/60 rounded-xl p-2 border border-rose-100/50">
              <p className="text-[9px] font-black uppercase text-rose-700">Cancelados</p>
              <p className="text-base font-black text-rose-900">{appointmentStats.cancelled}</p>
            </div>
          </div>
        </div>

        {/* CARD 2: TOTAL DE FATURAMENTO DO DIA */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Faturamento Realizado
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-blue-950">
                  {formatBRL(revenueStats.totalRealizedRevenue)}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-800 border border-blue-100">
              <DollarSign size={24} />
            </div>
          </div>

          {/* Previsão & Ticket Médio */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Potencial do Dia (com pendentes):</span>
              <span className="font-bold text-gray-800">{formatBRL(revenueStats.projectedTotalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Ticket Médio por Atendimento:</span>
              <span className="font-black text-blue-900">{formatBRL(revenueStats.averageTicket)}</span>
            </div>
          </div>

          {/* Breakdown rápido de métodos de pagamento */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
              <div className="flex items-center justify-center gap-1 text-[9px] font-black text-gray-500 uppercase">
                <Banknote size={10} /> PIX
              </div>
              <p className="text-xs font-black text-gray-800 mt-0.5">
                {formatBRL(revenueStats.paymentBreakdown.pix)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
              <div className="flex items-center justify-center gap-1 text-[9px] font-black text-gray-500 uppercase">
                <CreditCard size={10} /> Cartão
              </div>
              <p className="text-xs font-black text-gray-800 mt-0.5">
                {formatBRL(revenueStats.paymentBreakdown.card)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
              <div className="flex items-center justify-center gap-1 text-[9px] font-black text-gray-500 uppercase">
                <Wallet size={10} /> Dinheiro
              </div>
              <p className="text-xs font-black text-gray-800 mt-0.5">
                {formatBRL(revenueStats.paymentBreakdown.cash)}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: OCUPAÇÃO GERAL DA EQUIPE */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Ocupação da Equipe
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-gray-900">
                  {averageTeamOccupancy}%
                </span>
                <span className="text-xs font-bold text-gray-400">
                  tempo ocupado
                </span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Users size={24} />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-indigo-900">Capacidade Operacional</span>
              <span className="text-gray-700">{averageTeamOccupancy}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${averageTeamOccupancy}%` }} 
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Profissionais Ativos:</span>
            <span className="font-black text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {professionalsStats.length} barbeiro{professionalsStats.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: OCUPAÇÃO DETALHADA POR PROFISSIONAL */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-blue-950 flex items-center gap-2">
              <Users size={18} className="text-blue-900" />
              Ocupação por Profissional
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Carga horária ocupada, taxa de produtividade e faturamento individual do dia
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-bold text-gray-400 uppercase">Jornada base:</span>
            <span className="text-[11px] font-black text-gray-700 bg-gray-100 px-2.5 py-1 rounded-xl">
              {dayOfWeekName}
            </span>
          </div>
        </div>

        {professionalsStats.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">Nenhum profissional encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {professionalsStats.map((pro) => {
              const colorInfo = getOccupancyColor(pro.occupancyRate);

              return (
                <div 
                  key={pro.id} 
                  className="bg-gray-50/70 hover:bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200/80 transition-all hover:border-blue-200 hover:shadow-sm space-y-4"
                >
                  {/* Cabeçalho do Card do Profissional */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-xs overflow-hidden shrink-0">
                        {pro.avatar ? (
                          <img src={pro.avatar} alt={pro.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-900 font-black text-sm">
                            {pro.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                          {pro.name}
                        </h3>
                        <p className="text-[11px] font-medium text-gray-500">
                          {pro.completedCount} de {pro.totalCount - pro.cancelledCount} atendimentos concluídos
                        </p>
                      </div>
                    </div>

                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colorInfo.badge}`}>
                      {pro.occupancyRate}% Ocupado
                    </div>
                  </div>

                  {/* Barra de Progresso de Ocupação */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-500">Horas Agendadas:</span>
                      <span className="text-gray-800 font-bold">
                        {formatMinutesToHours(pro.totalBookedMinutes)} / {formatMinutesToHours(pro.totalWorkMinutes)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${colorInfo.bar}`}
                        style={{ width: `${pro.occupancyRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Métricas Rápidas do Profissional */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-xs">
                      <p className="text-[9px] font-black uppercase text-gray-400">Faturado</p>
                      <p className="text-xs font-black text-blue-950 mt-0.5">
                        {formatBRL(pro.revenue)}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-xs">
                      <p className="text-[9px] font-black uppercase text-gray-400">Ticket Médio</p>
                      <p className="text-xs font-black text-gray-800 mt-0.5">
                        {formatBRL(pro.averageTicket)}
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-xs">
                      <p className="text-[9px] font-black uppercase text-gray-400">Cancelados</p>
                      <p className={`text-xs font-black mt-0.5 ${pro.cancelledCount > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                        {pro.cancelledCount}
                      </p>
                    </div>
                  </div>

                  {/* Próximo Atendimento / Status Atual */}
                  {pro.nextAppointment ? (
                    <div className="bg-blue-50/80 rounded-xl p-2.5 border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock size={13} className="text-blue-900 shrink-0" />
                        <div className="truncate">
                          <span className="text-[11px] font-black text-blue-950 uppercase mr-1">
                            {pro.nextAppointment.time}
                          </span>
                          <span className="text-[11px] text-blue-900 truncate font-semibold">
                            {pro.nextAppointment.clientName}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/appointment-checkout/${pro.nextAppointment?.id}`, { state: { appointment: pro.nextAppointment } })}
                        className="text-[10px] font-black uppercase text-blue-900 hover:underline shrink-0 flex items-center gap-0.5"
                      >
                        Ver <ChevronRight size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-2 border border-gray-100 text-center">
                      <span className="text-[11px] font-semibold text-gray-400 italic">
                        Sem agendamentos pendentes para hoje
                      </span>
                    </div>
                  )}

                  {/* Ação para ver na grade da agenda */}
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => onNavigateToGrid(pro.id)}
                      className="text-xs font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <span>Abrir na grade da agenda</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FILA / CRONOGRAMA DE ATENDIMENTOS DO DIA */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-blue-950 flex items-center gap-2">
              <Clock size={16} className="text-blue-900" />
              Atendimentos Programados para {selectedDate.toLocaleDateString('pt-BR')}
            </h3>
            <span className="text-xs font-bold text-gray-400">
              Total: {filteredAppointments.length}
            </span>
          </div>

          {filteredAppointments.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-6 text-center">
              Nenhum agendamento para esta data.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {filteredAppointments
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((apt) => {
                  const isCompleted = apt.status === 'Atendimento Realizado' || apt.status === 'Atendido';
                  const isCancelled = apt.status === 'Cancelaram' || apt.status === 'Desmarcou' || apt.status === 'Faltou';

                  return (
                    <div 
                      key={apt.id} 
                      onClick={() => navigate(`/appointment-checkout/${apt.id}`, { state: { appointment: apt } })}
                      className="py-3 px-2 flex items-center justify-between hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 text-center shrink-0">
                          <span className="text-xs font-black text-blue-950 block">{apt.time}</span>
                          <span className="text-[10px] text-gray-400">{apt.duration} min</span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-gray-900">{apt.clientName}</p>
                          <p className="text-[11px] text-gray-500 truncate max-w-xs">
                            {apt.services?.join(', ') || 'Serviço'} • <span className="font-semibold text-blue-900">{apt.professionalName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {apt.totalValue && (
                          <span className="text-xs font-black text-gray-900">
                            {formatBRL(apt.totalValue)}
                          </span>
                        )}

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isCompleted 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isCancelled 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
