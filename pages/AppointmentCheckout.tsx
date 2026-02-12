
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ShoppingBag, ClipboardList, Plus, Trash2, 
  DollarSign, CheckCircle2, User, Clock, Calendar, Scissors, Box,
  ArrowRightLeft, AlertTriangle, X, Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAppointments, updateAppointment, Appointment, deleteAppointment } from '../data/agendaData';
import { addTransaction } from '../data/transactions';
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

  // Itens Selecionados
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{id: string, name: string, price: number, quantity: number}[]>([]);
  
  // Controle de Pagamento
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Modais e UI
  const [showAddService, setShowAddService] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Estado para Modal de Confirmação customizado
  const [confirmConfig, setConfirmConfig] = useState<{
    show: boolean,
    title: string,
    message: string,
    action: () => void,
    type: 'danger' | 'info' | 'success'
  }>({ show: false, title: '', message: '', action: () => {}, type: 'info' });

  // 1. Carregar Dados Iniciais
  useEffect(() => {
    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Carregar Listas Auxiliares
            const [servicesRes, productsRes, prosRes, payMethodsRes] = await Promise.all([
                db.services().select('*').order('name'),
                db.products().select('*').gt('current_stock', 0).order('name'),
                db.professionals().select('*').eq('status', 'Ativo'),
                db.paymentMethods().select('*').order('name')
            ]);

            setDbServices(servicesRes.data || []);
            setDbProducts(productsRes.data || []);
            setDbProfessionals(prosRes.data || []);
            
            const methods = payMethodsRes.data || [];
            setDbPaymentMethods(methods);
            if (methods.length > 0) setPaymentMethod(methods[0].name);

            // Carregar Agendamento
            const appointments = await getAppointments();
            const apt = appointments.find(a => a.id === id);
            
            if (apt) {
                setAppointment(apt);
                
                // Mapear serviços do agendamento com dados reais do banco (preço atualizado)
                const initialServices = apt.services.map(sName => {
                    const found = servicesRes.data?.find(s => s.name === sName);
                    return found || { id: Math.random().toString(), name: sName, duration: 30, price: 0 }; // Fallback
                });
                setSelectedServices(initialServices);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    fetchAllData();
  }, [id]);

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

  // --- Handlers de Adição ---
  const handleAddService = (service: any) => {
    // Verificação de Duplicidade
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
      return [...prev, { id: product.id, name: product.name, price: product.sale_price || 0, quantity: 1 }];
    });
    setShowAddProduct(false);
  };

  // --- Ações do Agendamento ---
  const handleChangeStatus = (newStatus: Appointment['status']) => {
    if (!appointment) return;
    triggerConfirm(
        'Alterar Status',
        `Deseja realmente alterar o status para "${newStatus}"?`,
        async () => {
            await updateAppointment(appointment.id, { status: newStatus });
            setAppointment({ ...appointment, status: newStatus });
            setConfirmConfig({ ...confirmConfig, show: false });
        }
    );
  };

  const handleTransfer = (pro: any) => {
    if (!appointment) return;
    triggerConfirm(
        'Transferir Agendamento',
        `Deseja transferir este agendamento para ${pro.name}?`,
        async () => {
            try {
                // CORREÇÃO: Usando camelCase (professionalId e professionalName) conforme esquema do banco mostrado no print
                const { error } = await db.appointments().update({ 
                    professionalId: pro.id, 
                    professionalName: pro.name 
                }).eq('id', appointment.id);

                if (error) throw error;
                
                setShowTransferModal(false);
                setConfirmConfig({ ...confirmConfig, show: false });
                
                alert('Transferência realizada com sucesso!');
                navigate('/agenda');
            } catch (err) {
                console.error(err);
                alert('Erro ao transferir agendamento. Verifique se o banco está acessível.');
            }
        }
    );
  }

  const handleDelete = () => {
    if (!appointment) return;
    triggerConfirm(
        'Apagar Agendamento',
        'Deseja apagar este agendamento permanentemente?',
        async () => {
            await deleteAppointment(appointment.id);
            setConfirmConfig({ ...confirmConfig, show: false });
            navigate('/agenda');
        },
        'danger'
    );
  };

  // --- Finalização ---
  const handleFinalize = () => {
    if (!appointment) return;

    triggerConfirm(
        'Finalizar Atendimento',
        'Confirmar recebimento e finalizar atendimento?',
        async () => {
            setProcessing(true);
            try {
                const finalValue = parseFloat(paymentValue.replace(',', '.'));
                
                // 1. Atualizar Agendamento (Status e Valor Total)
                const aptUpdate: any = {
                  status: 'Atendimento Realizado',
                  services: selectedServices.map(s => s.name),
                  total_value: finalValue
                };
                
                await db.appointments().update(aptUpdate).eq('id', appointment.id);

                // 2. Atualizar Cliente (Última Visita)
                if (appointment.clientId) {
                    await db.clients().update({ last_visit: new Date() }).eq('id', appointment.clientId);
                }

                // 3. Gerar Transações Financeiras (Separadas para cálculo de comissão correto)
                // Se houver serviços
                if (totals.services > 0) {
                    await addTransaction({
                        type: 'income',
                        category: 'Serviço',
                        item: `Serviços: ${appointment.clientName}`,
                        val: totals.services, // Valor proporcional dos serviços
                        method: paymentMethod,
                        pro: appointment.professionalName,
                        professional_id: appointment.professionalId, // Importante para vínculo
                        date: appointment.date,
                        status: 'Pago'
                    });
                }

                // Se houver produtos
                if (totals.products > 0) {
                    await addTransaction({
                        type: 'income',
                        category: 'Produto',
                        item: `Produtos: ${appointment.clientName}`,
                        val: totals.products, // Valor proporcional dos produtos
                        method: paymentMethod,
                        pro: appointment.professionalName,
                        professional_id: appointment.professionalId,
                        date: appointment.date,
                        status: 'Pago'
                    });

                    // 4. Baixar Estoque
                    for (const p of selectedProducts) {
                        // Busca estoque atual para garantir integridade
                        const { data: currentProd } = await db.products().select('current_stock').eq('id', p.id).single();
                        if (currentProd) {
                            await db.products()
                                .update({ current_stock: currentProd.current_stock - p.quantity })
                                .eq('id', p.id);
                        }
                    }
                }

                setConfirmConfig({ ...confirmConfig, show: false });
                alert('Atendimento finalizado com sucesso!');
                navigate('/agenda');

            } catch (err) {
                console.error(err);
                alert('Erro ao finalizar atendimento. Verifique os logs.');
            } finally {
                setProcessing(false);
            }
        },
        'success'
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-900" size={40} /></div>;
  if (!appointment) return <div className="p-8 text-center">Agendamento não encontrado.</div>;

  return (
    <div className="flex flex-col h-full bg-[#fcfaff] relative">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Atendimento</h1>
        </div>
        <button onClick={handleDelete} className="text-red-300 p-2 active:scale-90 transition-transform">
            <Trash2 size={24} />
        </button>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-32">
        {/* CABEÇALHO DO CLIENTE E STATUS */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
                <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-blue-900" />
                <h2 className="text-lg font-black text-gray-900 leading-tight">{appointment.clientName}</h2>
                </div>
                <div className="flex items-center gap-4 text-gray-400">
                <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase">{new Date(appointment.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold uppercase">{appointment.time}</span>
                </div>
                </div>
            </div>
            <div className="text-right">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    appointment.status === 'Confirmado' ? 'bg-blue-50 text-blue-900' :
                    appointment.status === 'Atendimento Realizado' ? 'bg-green-50 text-green-900' :
                    appointment.status === 'Cancelaram' ? 'bg-red-50 text-red-900' : 'bg-gray-100 text-gray-400'
                }`}>
                    {appointment.status}
                </span>
                <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase">{appointment.professionalName}</p>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
            <button 
                onClick={() => handleChangeStatus('Desmarcou')}
                className="bg-gray-50 text-gray-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 active:scale-95 transition-all"
            >
                Desmarcou
            </button>
            <button 
                onClick={() => handleChangeStatus('Cancelaram')}
                className="bg-red-50 text-red-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 active:scale-95 transition-all"
            >
                Cancelaram
            </button>
          </div>

          <button 
            onClick={() => setShowTransferModal(true)}
            className="w-full bg-blue-50 text-blue-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ArrowRightLeft size={14} />
            Transferir Profissional
          </button>
        </div>

        {/* LISTA DE SERVIÇOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-blue-900">
              <Scissors size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Serviços Prestados</h3>
            </div>
            <button 
              onClick={() => setShowAddService(true)}
              className="bg-blue-900 text-white p-2 rounded-xl active:scale-90 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {selectedServices.map((s, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">{s.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{s.duration} min</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-blue-900">R$ {s.price.toFixed(2).replace('.', ',')}</span>
                  <button 
                    onClick={() => setSelectedServices(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {selectedServices.length === 0 && (
                <p className="text-center text-xs text-gray-400 italic py-2">Nenhum serviço selecionado.</p>
            )}
          </div>
        </div>

        {/* VENDA DE PRODUTOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-orange-600">
              <Box size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Produtos Adicionais</h3>
            </div>
            <button 
              onClick={() => setShowAddProduct(true)}
              className="bg-orange-500 text-white p-2 rounded-xl active:scale-90 transition-all"
            >
              <Plus size={16} />
            </button>
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
                  <button 
                    onClick={() => setSelectedProducts(prev => prev.filter((_, i) => i !== idx))}
                    className="text-red-400 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
             {selectedProducts.length === 0 && (
                <p className="text-center text-xs text-gray-400 italic py-2">Nenhum produto adicionado.</p>
            )}
          </div>
        </div>

        {/* RESUMO DE VALORES */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-md space-y-3">
          <div className="flex justify-between items-center pt-2 px-1">
            <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Total Geral</span>
            <span className="text-2xl font-black text-blue-900">R$ {totals.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* PAGAMENTO */}
        <div className="space-y-4">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block px-1">Informações de Pagamento</label>
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <label className="text-[9px] font-black text-blue-900 uppercase absolute -top-2 left-4 bg-white px-1 z-10">Valor Pago</label>
              <input 
                type="text" 
                value={paymentValue}
                onChange={e => setPaymentValue(e.target.value)}
                className="w-full bg-white border border-blue-100 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-blue-900 font-black text-xl text-blue-900"
              />
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-900" size={24} />
            </div>

            <div className="relative">
              <label className="text-[9px] font-black text-gray-400 uppercase absolute -top-2 left-4 bg-white px-1 z-10">Forma de Pagamento</label>
              <select 
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-2xl py-4 px-4 outline-none appearance-none font-bold text-gray-700"
              >
                {dbPaymentMethods.map(pm => (
                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button 
          onClick={handleFinalize}
          disabled={processing}
          className="w-full bg-green-600 text-white font-black py-5 rounded-[2.5rem] shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 mt-6 mb-12 disabled:opacity-70"
        >
          {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
          {processing ? 'Processando...' : 'Finalizar Atendimento'}
        </button>
      </div>

      {/* MODAL DE TRANSFERÊNCIA */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-xs">Transferir para:</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 p-1"><X size={24} /></button>
            </div>
            <div className="space-y-2">
              {dbProfessionals.filter(p => p.id !== appointment.professionalId).map(pro => (
                <button 
                  key={pro.id}
                  onClick={() => handleTransfer(pro)}
                  className="w-full p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-blue-50 transition-all"
                >
                  <span className="text-sm font-bold text-gray-800">{pro.name}</span>
                  <ArrowRightLeft size={16} className="text-blue-200" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
      {confirmConfig.show && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                confirmConfig.type === 'danger' ? 'bg-red-50 text-red-500' : 
                confirmConfig.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'
            }`}>
              {confirmConfig.type === 'danger' ? <AlertTriangle size={32} /> : confirmConfig.type === 'success' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} className="rotate-180" />}
            </div>
            <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-2">{confirmConfig.title}</h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmConfig.action}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all ${
                    confirmConfig.type === 'danger' ? 'bg-red-600 text-white' : 
                    confirmConfig.type === 'success' ? 'bg-green-600 text-white' : 'bg-[#1e3a8a] text-white'
                  }`}
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setConfirmConfig({ ...confirmConfig, show: false })}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 bg-gray-50 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELEÇÃO DE SERVIÇO */}
      {showAddService && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-xs">Adicionar Serviço</h3>
              <button onClick={() => setShowAddService(false)} className="text-gray-400 p-1"><X size={24} /></button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {dbServices.map(s => (
                <button 
                  key={s.id}
                  onClick={() => handleAddService(s)}
                  className="w-full p-4 rounded-2xl border border-gray-50 flex items-center justify-between hover:bg-blue-50 transition-all text-left"
                >
                  <span className="text-sm font-bold text-gray-800">{s.name}</span>
                  <span className="text-xs font-black text-blue-900">R$ {s.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELEÇÃO DE PRODUTO */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-orange-600 font-black uppercase tracking-widest text-xs">Venda de Produto</h3>
              <button onClick={() => setShowAddProduct(false)} className="text-gray-400 p-1"><X size={24} /></button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {dbProducts.map(p => (
                <button 
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  className="w-full p-4 rounded-2xl border border-gray-50 flex items-center justify-between hover:bg-orange-50 transition-all text-left"
                >
                  <div>
                    <span className="text-sm font-bold text-gray-800 block">{p.name}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Estoque: {p.current_stock}</span>
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
