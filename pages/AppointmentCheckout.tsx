
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ShoppingBag, ClipboardList, Plus, Trash2, 
  DollarSign, CheckCircle2, User, Clock, Calendar, Scissors, Box,
  ArrowRightLeft, AlertTriangle, X, Loader2, UserX, XCircle, LogOut,
  MessageCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAppointments, updateAppointment, Appointment, deleteAppointment, transferAppointment } from '../data/agendaData';
import { syncAppointmentTransactions } from '../data/transactions'; 
import { db } from '../supabase';

const AppointmentCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Dados do Agendamento
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Listas do Banco de Dados
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbProfessionals, setDbProfessionals] = useState<any[]>([]);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [establishmentName, setEstablishmentName] = useState('Nord Barbershop');

  // Itens Selecionados
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{id: string, name: string, price: number, quantity: number, code?: string}[]>([]);
  
  // Controle de Pagamento
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Modais e UI
  const [showAddService, setShowAddService] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{
    show: boolean,
    title: string,
    message: string,
    action: () => void,
    type: 'danger' | 'info' | 'success',
    inputRequired?: boolean,
    inputValue?: string,
    onInputChange?: (val: string) => void
  }>({ show: false, title: '', message: '', action: () => {}, type: 'info' });

  // 1. Carregar Dados Iniciais
  useEffect(() => {
    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Carregar Listas Auxiliares
            const [servicesRes, productsRes, prosRes, payMethodsRes, profilesRes, settingsRes] = await Promise.all([
                db.services().select('*').order('name'),
                db.products().select('*').gt('current_stock', 0).order('name'),
                db.professionals().select('*').eq('status', 'Ativo'),
                db.paymentMethods().select('*').order('name'),
                db.profiles().select('professional_id').eq('role', 'ADMIN'),
                db.settings().select('name').single()
            ]);

            setDbServices(servicesRes.data || []);
            setDbProducts(productsRes.data || []);
            setDbProfessionals(prosRes.data || []);
            if (settingsRes.data?.name) setEstablishmentName(settingsRes.data.name);
            
            // Identificar IDs de Admins para filtrar da transferência
            const admins = new Set((profilesRes.data || []).map(p => p.professional_id).filter(Boolean));
            setAdminIds(admins as Set<string>);
            
            const methods = payMethodsRes.data || [];
            setDbPaymentMethods(methods);
            if (methods.length > 0) setPaymentMethod(methods[0].name);

            // Carregar Agendamento
            const appointments = await getAppointments();
            const apt = appointments.find(a => a.id === id);
            
            if (apt) {
                setAppointment(apt);
                
                // Mapear serviços do agendamento
                const initialServices = apt.services.map(sName => {
                    const found = servicesRes.data?.find(s => s.name === sName);
                    return found || { id: Math.random().toString(), name: sName, duration: 30, price: 0, code: 'S00' };
                });
                setSelectedServices(initialServices);

                // Mapear produtos
                if (apt.products && Array.isArray(apt.products)) {
                    setSelectedProducts(apt.products);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    fetchAllData();
  }, [id]);

  // Helper de Data Segura
  const formatDateSafe = (dateStr: string) => {
      if (!dateStr) return '--/--/----';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
  };

  // Cálculos de Totais
  const totals = useMemo(() => {
    const sTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const pTotal = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    return { services: sTotal, products: pTotal, total: sTotal + pTotal };
  }, [selectedServices, selectedProducts]);

  // Atualiza valor sugerido de pagamento quando total muda
  useEffect(() => {
    if (totals.total > 0) {
      setPaymentValue(totals.total.toFixed(2).replace('.', ','));
    }
  }, [totals.total]);

  const triggerConfirm = (title: string, message: string, action: () => void, type: 'danger' | 'info' | 'success' = 'info') => {
    setConfirmConfig({ show: true, title, message, action, type });
  };

  // --- Handlers de Status ---
  const handleChangeStatus = async (newStatus: 'Cancelaram' | 'Faltou') => {
      if (!appointment) return;
      
      triggerConfirm(
          `Marcar como ${newStatus}?`,
          'O horário será liberado na agenda.',
          async () => {
              setProcessing(true);
              try {
                  await updateAppointment(appointment.id, { status: newStatus });
                  alert(`Agendamento atualizado para ${newStatus}`);
                  navigate('/agenda');
              } catch (e) {
                  alert('Erro ao atualizar status.');
              } finally {
                  setProcessing(false);
              }
          },
          'danger'
      );
  };

  const handleDelete = async () => {
      if (!appointment) return;
      
      // Lógica com Justificativa (Simulada aqui com prompt nativo ou modal customizado)
      const reason = prompt('Motivo da exclusão (será registrado no log):');
      if (!reason) return;

      setProcessing(true);
      try {
          await deleteAppointment(appointment.id, reason);
          alert('Agendamento excluído e log registrado.');
          navigate('/agenda');
      } catch (e) {
          console.error(e);
          alert('Erro ao excluir agendamento.');
      } finally {
          setProcessing(false);
      }
  };

  const handleTransfer = async () => {
      if (!appointment || !transferTargetId) return;
      
      const targetPro = dbProfessionals.find(p => p.id === transferTargetId);
      if (!targetPro) return;

      setProcessing(true);
      try {
          await transferAppointment(appointment, targetPro.id, targetPro.name);
          setShowTransferModal(false);
          alert('Transferência realizada com sucesso!');
          navigate('/agenda');
      } catch (e: any) {
          alert('Não foi possível transferir: ' + e.message);
      } finally {
          setProcessing(false);
      }
  };

  const handleWhatsAppReminder = () => {
    if (!appointment || !appointment.clientPhone) {
        alert('Telefone do cliente não disponível.');
        return;
    }

    const cleanPhone = appointment.clientPhone.replace(/\D/g, '');
    // Adiciona código do país se necessário (assumindo Brasil +55 se tiver 10 ou 11 dígitos)
    const phoneParam = cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    
    // Pega o primeiro nome
    const firstName = appointment.clientName.split(' ')[0];
    const dateFormatted = formatDateSafe(appointment.date);
    const servicesText = selectedServices.map(s => s.name).join(' / ');

    const message = `💈 E aí, ${firstName}! Tudo bem?

Passando aqui pra dar aquele toque sobre seu horário amanhã:
📅 Data: ${dateFormatted}
⏰ Hora: ${appointment.time}
🪑 Serviço: ${servicesText || 'Corte'}
✂️ Profissional: ${appointment.professionalName}

Confirma pra gente que a cadeira já está separada? Se precisar remarcar, é só nos avisar. 😉

👊 ${establishmentName}`;

    const url = `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- Handlers de Adição ---
  const handleAddService = (service: any) => {
    const alreadyExists = selectedServices.some(s => s.id === service.id);
    if (alreadyExists) {
        alert(`O serviço "${service.name}" já foi adicionado a este atendimento.`);
        return;
    }
    setSelectedServices(prev => [...prev, service]);
    setShowAddService(false);
  };

  const handleAddProduct = (product: any) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { 
          id: product.id, 
          name: product.name, 
          price: product.sale_price || 0, 
          quantity: 1,
          code: product.code || 'P00'
      }];
    });
    setShowAddProduct(false);
  };

  const handleFinalize = () => {
    if (!appointment) return;

    triggerConfirm(
        'Finalizar Atendimento',
        'Confirmar recebimento e atualizar o financeiro?',
        async () => {
            setProcessing(true);
            try {
                const finalValue = parseFloat(paymentValue.replace(',', '.'));
                
                const aptUpdate: any = {
                  status: 'Atendimento Realizado',
                  services: selectedServices.map(s => s.name),
                  products: selectedProducts,
                  total_value: finalValue
                };
                
                await db.appointments().update(aptUpdate).eq('id', appointment.id);

                // Prepara transações
                const transactionsToSync = [];
                for (const s of selectedServices) {
                    transactionsToSync.push({
                        operation: 'VENDA' as any,
                        type: 'SERVIÇO' as any,
                        code: s.code || 'S999',
                        item: s.name,
                        unit_price: s.price,
                        quantity: 1,
                        val: s.price,
                        client_supplier: appointment.clientName,
                        payment_method: paymentMethod,
                        pro: appointment.professionalName,
                        professional_id: appointment.professionalId,
                        date: appointment.date,
                        status: 'Pago' as any
                    });
                }
                for (const p of selectedProducts) {
                    const totalP = p.price * p.quantity;
                    transactionsToSync.push({
                        operation: 'VENDA' as any,
                        type: 'PRODUTO' as any,
                        code: p.code || 'P999',
                        item: p.name,
                        unit_price: p.price,
                        quantity: p.quantity,
                        val: totalP,
                        client_supplier: appointment.clientName,
                        payment_method: paymentMethod,
                        pro: appointment.professionalName,
                        professional_id: appointment.professionalId,
                        date: appointment.date,
                        status: 'Pago' as any
                    });
                    // Baixa de Estoque
                    const { data: currentProd } = await db.products().select('current_stock').eq('id', p.id).single();
                    if (currentProd) {
                        await db.products()
                            .update({ current_stock: Math.max(0, currentProd.current_stock - p.quantity) })
                            .eq('id', p.id);
                    }
                }

                await syncAppointmentTransactions(appointment.id, transactionsToSync);

                if (appointment.clientId) {
                    await db.clients().update({ last_visit: new Date() }).eq('id', appointment.clientId);
                }

                setConfirmConfig({ ...confirmConfig, show: false });
                alert('Atendimento finalizado com sucesso!');
                navigate('/agenda');

            } catch (err) {
                console.error(err);
                alert('Erro ao finalizar atendimento.');
            } finally {
                setProcessing(false);
            }
        },
        'success'
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-900" size={40} /></div>;
  if (!appointment) return <div className="p-8 text-center">Agendamento não encontrado.</div>;

  // Verifica se está atrasado para mostrar alerta
  const isOverdue = new Date(`${appointment.date}T${appointment.time}`) < new Date() && appointment.status !== 'Atendimento Realizado' && appointment.status !== 'Cancelaram';

  return (
    <div className="flex flex-col h-full bg-[#fcfaff] relative">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Atendimento</h1>
        </div>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-32">
        {/* CABEÇALHO DO CLIENTE E STATUS */}
        <div className={`bg-white p-6 rounded-[2rem] border shadow-sm space-y-4 ${isOverdue ? 'border-red-200 ring-2 ring-red-100' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
                <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-blue-900" />
                <h2 className="text-lg font-black text-gray-900 leading-tight">{appointment.clientName}</h2>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase">{formatDateSafe(appointment.date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={12} className={isOverdue ? 'text-red-500' : ''} />
                    <span className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-red-500' : ''}`}>{appointment.time}</span>
                </div>
                </div>
            </div>
            <div className="text-right">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    appointment.status === 'Confirmado' ? 'bg-blue-50 text-blue-900' :
                    appointment.status === 'Atendimento Realizado' ? 'bg-green-50 text-green-900' : 'bg-gray-100 text-gray-400'
                }`}>
                    {appointment.status}
                </span>
                <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase">{appointment.professionalName}</p>
            </div>
          </div>
          {isOverdue && (
              <div className="bg-red-50 p-2 rounded-xl text-center text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center justify-center gap-2">
                  <Clock size={12} /> Atendimento Atrasado
              </div>
          )}
        </div>

        {/* AÇÕES DE GESTÃO DO AGENDAMENTO (Transferir, Cancelar, Apagar, WhatsApp) */}
        <div className="grid grid-cols-5 gap-2">
            <button onClick={handleWhatsAppReminder} className="bg-green-50 border border-green-100 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-green-100">
                <MessageCircle size={18} className="text-green-600" />
                <span className="text-[8px] font-bold uppercase text-green-700">Lembrete</span>
            </button>
            <button onClick={() => setShowTransferModal(true)} className="bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50">
                <ArrowRightLeft size={18} className="text-blue-900" />
                <span className="text-[8px] font-bold uppercase text-gray-600">Transferir</span>
            </button>
            <button onClick={() => handleChangeStatus('Faltou')} className="bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50">
                <UserX size={18} className="text-orange-500" />
                <span className="text-[8px] font-bold uppercase text-gray-600">Faltou</span>
            </button>
            <button onClick={() => handleChangeStatus('Cancelaram')} className="bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50">
                <XCircle size={18} className="text-red-500" />
                <span className="text-[8px] font-bold uppercase text-gray-600">Cancelar</span>
            </button>
            <button onClick={handleDelete} className="bg-red-50 border border-red-100 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-red-100">
                <Trash2 size={18} className="text-red-600" />
                <span className="text-[8px] font-bold uppercase text-red-700">Apagar</span>
            </button>
        </div>

        {/* LISTA DE SERVIÇOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-blue-900">
              <Scissors size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Serviços</h3>
            </div>
            <button onClick={() => setShowAddService(true)} className="bg-blue-900 text-white p-2 rounded-xl active:scale-90 transition-all"><Plus size={16} /></button>
          </div>
          <div className="space-y-2">
            {selectedServices.map((s, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">{s.name}</p>
                  <p className="text-[9px] text-gray-400 font-bold">Cod: {s.code || 'S--'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-blue-900">R$ {s.price.toFixed(2).replace('.', ',')}</span>
                  <button onClick={() => setSelectedServices(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 p-1"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LISTA DE PRODUTOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-orange-600">
              <Box size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Produtos</h3>
            </div>
            <button onClick={() => setShowAddProduct(true)} className="bg-orange-500 text-white p-2 rounded-xl active:scale-90 transition-all"><Plus size={16} /></button>
          </div>
          <div className="space-y-2">
            {selectedProducts.map((p, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">{p.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Qtd: {p.quantity}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-orange-600">R$ {(p.price * p.quantity).toFixed(2).replace('.', ',')}</span>
                  <button onClick={() => setSelectedProducts(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 p-1"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
             {selectedProducts.length === 0 && (
                <p className="text-center text-xs text-gray-400 italic py-2">Nenhum produto adicionado.</p>
            )}
          </div>
        </div>

        {/* RESUMO E PAGAMENTO */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-md space-y-3">
          <div className="flex justify-between items-center pt-2 px-1">
            <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Total Geral</span>
            <span className="text-2xl font-black text-blue-900">R$ {totals.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
              <label className="text-[9px] font-black text-blue-900 uppercase absolute -top-2 left-4 bg-white px-1 z-10">Valor Pago</label>
              <input type="text" value={paymentValue} onChange={e => setPaymentValue(e.target.value)} className="w-full bg-white border border-blue-100 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-blue-900 font-black text-xl text-blue-900"/>
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-900" size={24} />
          </div>
          <div className="relative">
              <label className="text-[9px] font-black text-gray-400 uppercase absolute -top-2 left-4 bg-white px-1 z-10">Forma de Pagamento</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl py-4 px-4 outline-none appearance-none font-bold text-gray-700">
                {dbPaymentMethods.map(pm => (<option key={pm.id} value={pm.name}>{pm.name}</option>))}
              </select>
          </div>
        </div>

        <button onClick={handleFinalize} disabled={processing} className="w-full bg-green-600 text-white font-black py-5 rounded-[2.5rem] shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 mt-6 mb-12 disabled:opacity-70">
          {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
          {processing ? 'Sincronizando...' : 'Finalizar e Salvar'}
        </button>
      </div>

      {/* MODAL TRANSFERÊNCIA */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-blue-900 font-black uppercase tracking-widest text-xs">Transferir Agendamento</h3>
                    <button onClick={() => setShowTransferModal(false)} className="text-gray-400 p-1"><X size={20} /></button>
                </div>
                
                <div>
                    <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Novo Profissional</label>
                    <select 
                        value={transferTargetId}
                        onChange={(e) => setTransferTargetId(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 font-bold"
                    >
                        <option value="">Selecione...</option>
                        {dbProfessionals
                            .filter(p => p.id !== appointment.professionalId) // Não mostra o atual
                            .filter(p => !adminIds.has(p.id)) // Não mostra Admins
                            .map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                    <AlertTriangle className="text-blue-600 shrink-0" size={18} />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        O sistema verificará se o novo profissional possui disponibilidade neste horário. A ação será registrada no log.
                    </p>
                </div>

                <button 
                    onClick={handleTransfer}
                    disabled={!transferTargetId || processing}
                    className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                    {processing ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Transferência'}
                </button>
            </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO */}
      {confirmConfig.show && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${confirmConfig.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
              <CheckCircle2 size={32} />
            </div>
            <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-2">{confirmConfig.title}</h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={confirmConfig.action} className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Confirmar</button>
                <button onClick={() => setConfirmConfig({...confirmConfig, show: false})} className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL ADD SERVICE */}
      {showAddService && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-xs">Adicionar Serviço</h3>
              <button onClick={() => setShowAddService(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
              {dbServices.length === 0 ? (
                  <p className="text-center text-gray-400 italic text-sm py-4">Nenhum serviço disponível.</p>
              ) : dbServices.map(s => (
                <button 
                    key={s.id} 
                    onClick={() => handleAddService(s)} 
                    className="w-full p-4 rounded-2xl border border-gray-200 bg-white hover:bg-blue-50 flex justify-between text-left transition-colors shadow-sm"
                >
                  <span className="text-sm font-bold text-gray-800">{s.name}</span>
                  <span className="text-xs font-black text-blue-900">R$ {s.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD PRODUCT */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-orange-600 font-black uppercase tracking-widest text-xs">Adicionar Produto</h3>
              <button onClick={() => setShowAddProduct(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
              {dbProducts.length === 0 ? (
                  <p className="text-center text-gray-400 italic text-sm py-4">Estoque vazio.</p>
              ) : dbProducts.map(p => (
                <button 
                    key={p.id} 
                    onClick={() => handleAddProduct(p)} 
                    className="w-full p-4 rounded-2xl border border-gray-200 bg-white hover:bg-orange-50 flex justify-between text-left transition-colors shadow-sm"
                >
                  <div>
                    <span className="text-sm font-bold text-gray-800 block">{p.name}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Estoque: {p.current_stock}</span>
                  </div>
                  <span className="text-xs font-black text-orange-600">R$ {p.sale_price?.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCheckout;
