
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, 
  CalendarPlus, Loader2, RotateCcw, Users, User, Trash2, Edit2, X, Clock,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBlocks, getAppointments, AgendaBlock, Appointment, deleteBlock, updateBlock } from '../data/agendaData';
import { getUnreadCount } from '../data/notifications';
import { supabase, db } from '../supabase';

const Agenda: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || 'ADMIN';
  const userProId = localStorage.getItem('user_pro_id') || '';
  const userName = localStorage.getItem('user_name') || 'Profissional';
  
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const dayStripRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [professionalsList, setProfessionalsList] = useState<any[]>([]);
  const [selectedPros, setSelectedPros] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [now, setNow] = useState(new Date());

  const [selectedBlock, setSelectedBlock] = useState<AgendaBlock | null>(null);
  const [editBlockDesc, setEditBlockDesc] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const HOUR_HEIGHT = 120;
  const START_HOUR = 8;
  const hours = Array.from({ length: 14 }, (_, i) => START_HOUR + i);

  // Formatação segura de data YYYY-MM-DD sem fuso horário
  const formatDateSafe = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
        if (dayStripRef.current) {
            const activeDayBtn = dayStripRef.current.querySelector('.bg-blue-900');
            if (activeDayBtn) {
                activeDayBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        if (isToday && gridContainerRef.current) {
            const pos = currentTimePosition;
            const containerHeight = gridContainerRef.current.clientHeight;
            gridContainerRef.current.scrollTo({
                top: pos - (containerHeight / 2),
                behavior: 'smooth'
            });
        }
    }
  }, [loading, selectedDate]);

  useEffect(() => {
    const fetchUnread = async () => {
        const count = await getUnreadCount();
        setUnreadNotifs(count);
    };
    fetchUnread();
    let filter = userRole === 'COLLABORATOR' && userProId ? `recipient_pro_id=eq.${userProId}` : undefined;
    const channel = supabase.channel('notif_badge')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter }, () => setUnreadNotifs(p => p + 1))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter }, fetchUnread)
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userRole, userProId]);

  useEffect(() => {
    const fetchPros = async () => {
        try {
            // 1. Busca todos os profissionais ativos
            const { data: allPros } = await db.professionals().select('*').eq('status', 'Ativo').order('name');
            const prosData = allPros || [];

            // 2. Busca Perfis ADMIN para filtrar da visualização da agenda
            // Quem é ADMIN (Gerente) não deve aparecer na lista de agendáveis visualmente
            const { data: adminProfiles } = await db.profiles().select('professional_id').eq('role', 'ADMIN');
            const adminIds = new Set(adminProfiles?.map(p => p.professional_id).filter(Boolean));

            let visiblePros: any[] = [];

            if (userRole === 'ADMIN') {
                // REGRA: Se for ADMIN, vê todos os profissionais que NÃO são Admins (Barbeiros)
                // Removemos a condição "|| p.id === userProId" para que o Admin não veja a si mesmo na lista
                visiblePros = prosData.filter(p => !adminIds.has(p.id));
            } else {
                // REGRA: Se for COLABORADOR, vê apenas a si mesmo
                visiblePros = prosData.filter(p => p.id === userProId);
            }
            
            setProfessionalsList(visiblePros);

            // Lógica de Seleção Inicial
            if (userRole === 'COLLABORATOR' && userProId) {
                // Colaborador já vem selecionado
                setSelectedPros([userProId]);
            } else {
                // Admin: Se não tiver ninguém selecionado, seleciona o primeiro da lista visível (Barbeiro)
                if (visiblePros.length > 0 && selectedPros.length === 0) {
                    setSelectedPros([visiblePros[0].id]);
                }
            }
        } catch (e) {
            console.error('Erro ao buscar profissionais:', e);
        }
    };
    fetchPros();
  }, [userRole, userProId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = formatDateSafe(selectedDate); // Uso da função segura
      const [apts, blks] = await Promise.all([
        getAppointments({ date: dateStr }),
        getBlocks({ date: dateStr })
      ]);
      setAppointments(apts || []);
      setBlocks(blks || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('agenda_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_blocks' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate]);

  const togglePro = (proId: string) => {
    if (selectedPros.includes(proId)) {
        if (selectedPros.length > 1) setSelectedPros(prev => prev.filter(id => id !== proId));
    } else {
        if (selectedPros.length < 2) setSelectedPros(prev => [...prev, proId]);
        else setSelectedPros(prev => [prev[1], proId]); 
    }
  };

  const getPosition = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutesSinceStart = (h - START_HOUR) * 60 + m;
    return (totalMinutesSinceStart / 60) * HOUR_HEIGHT;
  };

  const getHeight = (durationMin: number) => (durationMin / 60) * HOUR_HEIGHT;

  const isAppointmentOverdue = (apt: Appointment) => {
      const aptEnd = new Date(`${apt.date}T${apt.time}`);
      aptEnd.setMinutes(aptEnd.getMinutes() + apt.duration);
      return new Date() > aptEnd && apt.status !== 'Atendimento Realizado' && apt.status !== 'Cancelaram' && apt.status !== 'Desmarcou';
  };

  const dayStripItems = useMemo(() => {
    const items = [];
    for (let i = -15; i <= 15; i++) {
      const d = new Date(selectedDate);
      d.setDate(selectedDate.getDate() + i);
      items.push(d);
    }
    return items;
  }, [selectedDate]);

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
        const [year, month, day] = e.target.value.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
    }
  };

  const isToday = selectedDate.toDateString() === now.toDateString();
  const isPastDay = selectedDate < new Date(new Date().setHours(0,0,0,0));
  const currentTimePosition = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    return getPosition(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }, [now]);

  const handleDeleteBlock = async () => {
    if (!selectedBlock) return;
    
    setIsDeleting(true);
    try {
        await deleteBlock(selectedBlock.id);
        setSelectedBlock(null);
        fetchData();
    } catch (error) {
        console.error('Erro ao excluir bloqueio:', error);
        // alert('Erro ao excluir bloqueio. Tente novamente.');
    } finally {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff] relative overflow-hidden">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between z-[60] shadow-md shrink-0">
        <div className="flex items-center gap-2">
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth()-1)))} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
            <h1 className="text-base font-bold uppercase tracking-widest min-w-[140px] text-center">
                {selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h1>
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth()+1)))} className="p-1 active:scale-90 transition-transform"><ChevronRight size={24} /></button>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/notifications')} className="p-2 bg-blue-800 rounded-xl active:scale-90 border border-blue-700 shadow-sm relative">
                <Bell size={18} />
                {unreadNotifs > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />}
            </button>
            <button onClick={() => setSelectedDate(new Date())} className="p-2 bg-blue-800 rounded-xl active:scale-90 border border-blue-700 shadow-sm"><RotateCcw size={18} /></button>
            <div className="relative w-10 h-10">
                <input type="date" onChange={handleDatePick} value={formatDateSafe(selectedDate)} className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full" />
                <button className="absolute inset-0 flex items-center justify-center bg-blue-800 rounded-xl border border-blue-700 shadow-sm z-10 pointer-events-none"><CalendarIcon size={18} /></button>
            </div>
        </div>
      </header>

      <div ref={dayStripRef} className="bg-white border-b border-gray-100 flex py-3 px-4 gap-4 no-scrollbar overflow-x-auto shrink-0">
        {dayStripItems.map((date, idx) => (
          <button key={idx} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center min-w-[45px] active:scale-95 transition-transform ${date.toDateString() === selectedDate.toDateString() ? 'text-blue-900' : 'text-gray-400'}`}>
            <span className="text-[10px] font-bold uppercase">{date.toLocaleString('pt-BR', { weekday: 'short' })}</span>
            <div className={`w-9 h-9 flex items-center justify-center rounded-full mt-1 ${date.toDateString() === selectedDate.toDateString() ? 'bg-blue-900 text-white shadow-lg' : ''}`}>
              <span className="text-sm font-black">{date.getDate()}</span>
            </div>
          </button>
        ))}
      </div>

      {userRole === 'ADMIN' && (
        <div className="bg-gray-50 border-b border-gray-200 py-3 px-4 flex gap-4 overflow-x-auto no-scrollbar shrink-0 items-center">
            <div className="flex items-center gap-2 text-gray-400 mr-2 shrink-0">
                <Users size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Equipe</span>
            </div>
            {professionalsList.length === 0 ? (
                <span className="text-xs text-gray-400 italic">Nenhum barbeiro disponível</span>
            ) : (
                professionalsList.map(pro => {
                    const isSelected = selectedPros.includes(pro.id);
                    return (
                        <button key={pro.id} onClick={() => togglePro(pro.id)} className={`flex items-center gap-2 pr-4 pl-1 py-1 rounded-full border transition-all active:scale-95 shrink-0 ${isSelected ? 'bg-white border-blue-900 shadow-sm ring-1 ring-blue-900' : 'bg-white border-gray-200 opacity-60'}`}>
                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                {pro.avatar ? <img src={pro.avatar} alt={pro.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-900"><User size={14} /></div>}
                            </div>
                            <span className={`text-[11px] font-bold uppercase tracking-tight ${isSelected ? 'text-blue-900' : 'text-gray-500'}`}>{pro.name.split(' ')[0]}</span>
                        </button>
                    )
                })
            )}
        </div>
      )}

      <div ref={gridContainerRef} className="flex-1 overflow-y-auto relative bg-[#fcfaff]">
        {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-50"><Loader2 className="animate-spin text-blue-900" size={32} /></div>
        ) : (
          <div className="flex min-h-full">
            <div className="w-14 border-r border-gray-100 sticky left-0 bg-[#fcfaff] z-20 shrink-0">
              {hours.map((hour) => (
                <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="text-[10px] text-gray-400 font-medium text-center pt-2 relative">
                  <span className="bg-[#fcfaff] px-1 relative z-10">{hour.toString().padStart(2, '0')}:00</span>
                  <div className="absolute top-0 right-0 w-2 border-t border-gray-200"></div>
                </div>
              ))}
            </div>
            <div className="flex flex-1 relative min-w-0">
                {isPastDay ? <div className="absolute inset-0 bg-gray-900/[0.04] z-[5] pointer-events-none" /> : isToday ? <div className="absolute top-0 left-0 right-0 bg-gray-900/[0.04] z-[5] pointer-events-none" style={{ height: `${currentTimePosition}px` }} /> : null}
                {isToday && (
                    <div className="absolute left-0 right-0 h-[2px] bg-blue-500 z-[20] pointer-events-none flex items-center justify-end" style={{ top: `${currentTimePosition}px` }}>
                        <div className="absolute right-0 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg z-[21]">AGORA</div>
                    </div>
                )}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {hours.map((_, i) => <div key={i} className="absolute left-0 right-0 border-b border-gray-50" style={{ top: `${i * HOUR_HEIGHT}px`, height: '1px' }} />)}
                </div>
                
                {/* RENDERIZAÇÃO DAS COLUNAS DOS PROFISSIONAIS */}
                {selectedPros.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400 text-xs uppercase font-bold">
                        Nenhum profissional selecionado
                    </div>
                ) : (
                    selectedPros.map((proId, index) => {
                        // Tenta encontrar detalhes na lista, ou usa fallback se for colaborador que não carregou a lista
                        const proDetails = professionalsList.find(p => p.id === proId) || { name: userName };
                        const isLast = index === selectedPros.length - 1;
                        
                        // Filtra agendamentos para este ID
                        const proAppointments = appointments.filter(a => a.professionalId === proId);
                        const proBlocks = blocks.filter(b => b.professional_id === proId);
                        
                        return (
                            <div key={proId} className={`flex-1 relative ${!isLast ? 'border-r border-gray-200' : ''}`}>
                                {/* Header do Profissional (Sticky) */}
                                <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-2 text-center shadow-sm">
                                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest block truncate px-2">
                                        {proDetails.name || 'Agenda'}
                                    </span>
                                </div>
                                <div className="absolute inset-0 w-full h-full">
                                    {proAppointments.map((apt) => {
                                        const isLate = isAppointmentOverdue(apt);
                                        return (
                                        <div key={apt.id} onClick={() => navigate(`/appointment-checkout/${apt.id}`)} className={`absolute left-1 right-1 rounded-xl p-2 border-l-4 shadow-sm transition-all active:scale-[0.98] cursor-pointer z-10 overflow-hidden flex flex-col justify-center ${apt.status === 'Confirmado' ? (isLate ? 'bg-red-50 border-red-500 ring-1 ring-red-100' : 'bg-blue-50 border-blue-500') : apt.status === 'Atendimento Realizado' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-400 opacity-60'}`} style={{ top: `${getPosition(apt.time)}px`, height: `${Math.max(getHeight(apt.duration), 40)}px` }}>
                                            <div className="flex justify-between items-start w-full">
                                                <h4 className={`font-bold text-[12px] truncate leading-tight ${isLate ? 'text-red-700' : 'text-blue-950'}`}>{apt.clientName}</h4>
                                                {isLate && <Clock size={12} className="text-red-500 shrink-0 animate-pulse" />}
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <p className={`text-[10px] font-black uppercase ${isLate ? 'text-red-600' : 'text-blue-800'}`}>{apt.time}</p>
                                                <span className={`text-[10px] truncate max-w-[120px] font-medium ${isLate ? 'text-red-500' : 'text-blue-700/80'}`}>• {apt.services[0]}</span>
                                            </div>
                                        </div>
                                    )})}
                                    {proBlocks.map((blk) => {
                                        const startTime = blk.start_at.split('T')[1].substring(0, 5);
                                        const endTime = blk.end_at.split('T')[1].substring(0, 5);
                                        const startPos = getPosition(startTime);
                                        const endPos = getPosition(endTime);
                                        return (
                                            <div key={blk.id} onClick={() => { setSelectedBlock(blk); setEditBlockDesc(blk.description || ''); }} className="absolute left-0 right-0 bg-gray-100/80 border-y border-gray-200 z-10 flex items-center justify-center cursor-pointer hover:bg-red-50/80 transition-colors group" style={{ top: `${startPos}px`, height: `${Math.max(endPos - startPos, 20)}px`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)' }}>
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-white px-2 py-1 rounded-full text-[9px] font-bold text-gray-400 shadow-sm uppercase tracking-widest border border-gray-200 group-hover:text-red-500 transition-colors">{blk.description || 'Bloqueado'}</span>
                                                    <Edit2 size={12} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-24 right-6 z-[50] flex flex-col items-end gap-3">
          {isFabOpen && (
              <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
                  <button onClick={() => navigate('/agenda/block')} className="flex items-center gap-3 bg-white text-gray-700 px-5 py-4 rounded-2xl shadow-xl border border-gray-100 min-h-[64px]">
                    <span className="text-[11px] font-black uppercase tracking-widest">Bloquear Horário</span>
                    <div className="bg-red-100 text-red-600 p-2 rounded-xl"><CalendarPlus size={20} /></div>
                  </button>
                  <button onClick={() => navigate('/new-appointment')} className="flex items-center gap-3 bg-[#1e3a8a] text-white px-5 py-4 rounded-2xl shadow-xl min-h-[64px]">
                    <span className="text-[11px] font-black uppercase tracking-widest">Novo Agendamento</span>
                    <div className="bg-white/20 p-2 rounded-xl"><Plus size={20} /></div>
                  </button>
              </div>
          )}
          <button onClick={() => setIsFabOpen(!isFabOpen)} className={`text-white p-5 rounded-2xl shadow-xl active:scale-95 transition-all ring-4 ring-blue-50/50 min-h-[64px] min-w-[64px] flex items-center justify-center ${isFabOpen ? 'rotate-45 bg-red-600' : 'bg-[#1e3a8a]'}`}>
            <Plus size={32} />
          </button>
      </div>

      {selectedBlock && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2"><Clock size={18} className="text-red-500" /><h3 className="text-red-600 font-black uppercase tracking-widest text-xs">Gerenciar Bloqueio</h3></div>
                    <button onClick={() => setSelectedBlock(null)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Horário</p>
                    <p className="text-sm font-black text-gray-800">{new Date(selectedBlock.start_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedBlock.end_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">Descrição</label>
                    <input type="text" value={editBlockDesc} onChange={(e) => setEditBlockDesc(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-red-500 font-bold text-gray-700" />
                </div>
                <div className="flex flex-col gap-3 pt-2">
                    {!showDeleteConfirm ? (
                        <>
                            <button onClick={async () => { try { await updateBlock(selectedBlock.id, { description: editBlockDesc }); setSelectedBlock(null); fetchData(); } catch(e) { console.error(e); } }} className="w-full bg-blue-900 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all min-h-[64px]">Salvar Alterações</button>
                            <button onClick={() => setShowDeleteConfirm(true)} className="w-full bg-red-50 text-red-600 font-black py-5 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[64px]"><Trash2 size={16} /> Excluir Bloqueio</button>
                        </>
                    ) : (
                        <div className="flex gap-3">
                             <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-100 text-gray-600 font-black py-5 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all min-h-[64px]">Cancelar</button>
                             <button onClick={handleDeleteBlock} disabled={isDeleting} className="flex-1 bg-red-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[64px] disabled:opacity-50 disabled:pointer-events-none">
                                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                {isDeleting ? 'Excluindo...' : 'Confirmar'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
