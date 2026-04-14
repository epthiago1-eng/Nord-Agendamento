
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ShoppingBag, ClipboardList, Plus, Trash2, 
  DollarSign, CheckCircle2, User, Clock, Calendar, Scissors, Box,
  ArrowRightLeft, AlertTriangle, X, Loader2, UserX, XCircle, LogOut,
  MessageCircle, Coins, Tag, PlusCircle, Percent
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAppointments, updateAppointment, Appointment, deleteAppointment, transferAppointment, getSettings, saveSettings } from '../data/agendaData';
import { syncAppointmentTransactions } from '../data/transactions'; 
import { addNotification } from '../data/notifications';
import { db, supabase } from '../supabase';

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
  
  // Gorjetas, Outros e Descontos
  const [tipValue, setTipValue] = useState('');
  const [othersValue, setOthersValue] = useState('');
  const [othersDescription, setOthersDescription] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');

  // Controle de Pagamento
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [payments, setPayments] = useState<{ method: string, value: number }[]>([]);
  const [showMultiPayment, setShowMultiPayment] = useState(false);

  // Modais e UI
  const [showAddService, setShowAddService] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');

  // Custom Item (Outros)
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemType, setCustomItemType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

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
            // Removido auto-seleção para forçar escolha manual
            // if (methods.length > 0) setPaymentMethod(methods[0].name);

            // Carregar Agendamento
            const appointments = await getAppointments();
            const apt = appointments.find(a => a.id === id);
            
            if (apt) {
                setAppointment(apt);
                
                // Mapear serviços do agendamento
                const initialServices = apt.services.map(sName => {
                    // Verifica se é um serviço customizado com preço embutido (ex: "Corte Especial|50.00")
                    if (sName.includes('|')) {
                        const [name, priceStr] = sName.split('|');
                        const price = parseFloat(priceStr);
                        if (!isNaN(price)) {
                            return { 
                                id: `custom-${Math.random().toString(36).substr(2, 9)}`, 
                                name: name, 
                                duration: 30, 
                                price: price, 
                                code: 'S-OUT' 
                            };
                        }
                    }

                    const found = servicesRes.data?.find(s => s.name === sName);
                    return found || { id: Math.random().toString(), name: sName, duration: 30, price: 0, code: 'S00' };
                });
                setSelectedServices(initialServices);

                // Mapear produtos
                if (apt.products && Array.isArray(apt.products)) {
                    setSelectedProducts(apt.products);
                }

                // Inicializar valores de gorjeta, outros e descontos se existirem
                if (apt.tip_value) setTipValue(apt.tip_value.toString().replace('.', ','));
                if (apt.others_value) setOthersValue(apt.others_value.toString().replace('.', ','));
                if (apt.others_description) setOthersDescription(apt.others_description);
                if (apt.discount_value) {
                    setDiscountValue(apt.discount_value.toString().replace('.', ','));
                    setDiscountType('fixed'); // Assume fixo ao carregar, ou poderíamos salvar o tipo também
                }
                if (apt.payment_method) {
                    setPaymentMethod(apt.payment_method);
                }
                if (apt.payments && Array.isArray(apt.payments) && apt.payments.length > 0) {
                    setPayments(apt.payments);
                    setShowMultiPayment(true);
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
    const oTotal = parseFloat(othersValue.replace(',', '.')) || 0;
    
    const subtotal = sTotal + pTotal + oTotal;
    
    const dVal = parseFloat(discountValue.replace(',', '.')) || 0;
    let discountAmount = 0;
    if (discountType === 'fixed') {
        discountAmount = dVal;
    } else {
        discountAmount = subtotal * (dVal / 100);
    }
    
    const tip = parseFloat(tipValue.replace(',', '.')) || 0;
    
    return { 
        services: sTotal, 
        products: pTotal, 
        others: oTotal,
        subtotal,
        discount: discountAmount,
        tip,
        total: Math.max(0, subtotal - discountAmount) + tip 
    };
  }, [selectedServices, selectedProducts, othersValue, discountValue, discountType, tipValue]);

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
      
      // Abre o modal de confirmação em vez de usar prompt
      triggerConfirm(
          'Excluir Agendamento?',
          'Esta ação removerá permanentemente o registro e notificará a administração. Deseja continuar?',
          async () => {
              setProcessing(true);
              try {
                  const reason = "Cancelado via app pelo usuário";
                  await deleteAppointment(appointment.id, reason);

                  // Verifica se é Colaborador para enviar notificação extra aos Admins
                  const role = localStorage.getItem('user_role');
                  const userName = localStorage.getItem('user_name') || 'Colaborador';

                  if (role === 'COLLABORATOR') {
                      await addNotification({
                          type: 'SISTEMA',
                          title: '⚠️ Registro Apagado por Colaborador',
                          message: `O colaborador ${userName} apagou o agendamento de ${appointment.clientName} (Data: ${appointment.date}).`,
                          link: '/financial/log',
                          // recipient_pro_id nulo vai para Admins
                      });
                  }

                  alert('Agendamento excluído com sucesso.');
                  navigate('/agenda');
              } catch (e: any) {
                  console.error(e);
                  alert('Erro ao excluir: ' + e.message);
              } finally {
                  setProcessing(false);
                  setConfirmConfig(prev => ({ ...prev, show: false }));
              }
          },
          'danger'
      );
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

  const handleAddCustomItem = () => {
    if (!customItemName || !customItemPrice) {
        alert('Preencha o nome e o valor do item.');
        return;
    }

    // Corrige o parsing do preço: substitui vírgula por ponto
    const price = parseFloat(customItemPrice.replace(',', '.'));
    
    if (isNaN(price) || price < 0) {
        alert('Valor inválido.');
        return;
    }

    const newItem = {
        id: `custom-${Date.now()}`,
        name: customItemName,
        price: price,
        code: customItemType === 'SERVICE' ? 'S-OUT' : 'P-OUT',
        quantity: 1
    };

    if (customItemType === 'SERVICE') {
        setSelectedServices(prev => [...prev, newItem]);
    } else {
        setSelectedProducts(prev => [...prev, newItem]);
    }

    setShowCustomItemModal(false);
  };

  const handleAddPayment = () => {
    setPayments([...payments, { method: dbPaymentMethods[0]?.name || 'Dinheiro', value: 0 }]);
  };

  const handleRemovePayment = (index: number) => {
    const newPayments = payments.filter((_, i) => i !== index);
    setPayments(newPayments);
  };

  const handleUpdatePayment = (index: number, field: 'method' | 'value', value: string | number) => {
    const newPayments = [...payments];
    if (field === 'method') {
      newPayments[index].method = value as string;
    } else {
      newPayments[index].value = Number(value);
    }
    setPayments(newPayments);
  };

  const handleFinalize = () => {
    if (!appointment) return;

    if (!paymentMethod && !showMultiPayment) {
        alert('Por favor, selecione uma forma de pagamento.');
        return;
    }

    triggerConfirm(
        'Finalizar Atendimento',
        'Confirmar recebimento e atualizar o financeiro?',
        async () => {
            setProcessing(true);
            try {
                const finalValue = parseFloat(paymentValue.replace(',', '.'));
                
                const finalPayments = showMultiPayment ? payments : [{ method: paymentMethod, value: totals.total }];
                const totalPaid = finalPayments.reduce((acc, p) => acc + p.value, 0);

                if (Math.abs(totalPaid - totals.total) > 0.01) {
                    alert(`O total dos pagamentos (R$ ${totalPaid.toFixed(2)}) deve ser igual ao total do atendimento (R$ ${totals.total.toFixed(2)})`);
                    setProcessing(false);
                    return;
                }

                const aptUpdate: any = {
                  status: 'Atendimento Realizado',
                  services: selectedServices.map(s => {
                      // Se for item customizado, salva objeto completo ou string especial?
                      // O schema diz 'services ARRAY'. Normalmente array de strings (nomes).
                      // Se salvarmos apenas o nome, perdemos o preço customizado se ele diferir do cadastro (ou se não existir cadastro).
                      // O ideal seria salvar um JSONB ou ARRAY de objetos, mas o schema atual é ARRAY (text[] provavelmente).
                      // Como o usuário relatou que "ao clicar novamente para ver o valor estava constando zero",
                      // isso significa que ao recarregar o agendamento, o sistema busca o serviço pelo NOME na tabela de serviços.
                      // Se o serviço não existe (customizado), ele cai no fallback: { price: 0 }.
                      
                      // SOLUÇÃO: Precisamos salvar os detalhes dos serviços customizados em algum lugar.
                      // O campo 'products' é JSONB, mas 'services' é ARRAY.
                      // Podemos usar o campo 'others_description' para salvar metadados? Não, é gambiarra.
                      // O correto seria alterar o schema de services para JSONB, mas não posso alterar schema agora sem permissão explícita/migration complexa.
                      
                      // WORKAROUND: Vamos salvar os serviços customizados dentro do campo 'products' (que é JSONB) com uma flag is_service=true?
                      // Ou melhor: Vamos salvar no campo 'observation' ou criar um padrão de string: "NOME|PRECO".
                      // Mas isso quebraria a visualização em outros lugares.
                      
                      // Vamos verificar como 'products' é salvo. É um JSONB array.
                      // Se o usuário aceitar, podemos salvar serviços customizados como "Produtos" especiais no banco, mas classificados como serviço na UI.
                      
                      // Mas espere, o usuário disse: "quero saber como isso estpa sendo tratado e para onde está sendo armazenado no supabase. e quero o valor ficando salvo e persistente"
                      
                      // O problema é aqui:
                      // const initialServices = apt.services.map(sName => {
                      //    const found = servicesRes.data?.find(s => s.name === sName);
                      //    return found || { id: Math.random().toString(), name: sName, duration: 30, price: 0, code: 'S00' };
                      // });
                      
                      // Quando carregamos, se não acha no banco, põe preço 0.
                      // Como o serviço customizado não está no banco, ele fica com 0.
                      
                      // Solução Robusta sem alterar schema (se possível):
                      // Salvar o preço junto com o nome no array de strings? "Corte Especial|50.00"
                      // E no carregamento, fazer o parse.
                      
                      if (s.id.startsWith('custom-')) {
                          return `${s.name}|${s.price.toFixed(2)}`;
                      }
                      return s.name;
                  }),
                  products: selectedProducts,
                  total_value: totals.total,
                  payment_method: showMultiPayment ? finalPayments.map(p => p.method).join(' + ') : paymentMethod,
                  payments: finalPayments,
                  others_value: totals.others,
                  others_description: othersDescription,
                  discount_value: totals.discount,
                  tip_value: totals.tip
                };

                // Lógica para encurtar o card se finalizar antes do previsto (liberar agenda)
                try {
                    const now = new Date();
                    // Ajuste fuso horário simples para pegar YYYY-MM-DD local
                    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                    
                    if (appointment.date === localDate) {
                        const [h, m] = appointment.time.split(':').map(Number);
                        const startDate = new Date(now);
                        startDate.setHours(h, m, 0, 0);
                        
                        const diffMs = now.getTime() - startDate.getTime();
                        const diffMinutes = Math.floor(diffMs / 60000);
                        
                        // Se duração real for menor que a agendada (e positiva), atualiza
                        // Mínimo de 15 min para não sumir do grid
                        if (diffMinutes > 0 && diffMinutes < (appointment.duration || 30)) {
                            aptUpdate.duration = Math.max(15, diffMinutes);
                        }
                    }
                } catch (e) {
                    console.error("Erro ao calcular nova duração", e);
                }
                
                await updateAppointment(appointment.id, aptUpdate);

                // Busca configurações de comissão do profissional
                const { data: commissionConfigs } = await db.professionalServices()
                    .select('*')
                    .eq('professional_id', appointment.professionalId);

                // Prepara transações base (antes de dividir por método de pagamento)
                const baseTransactions = [];
                
                // Lógica de Distribuição de Desconto
                // O desconto deve ser aplicado proporcionalmente aos itens (Serviços, Produtos e Outros)
                // A Gorjeta NÃO sofre desconto.
                
                const grossTotalItems = totals.services + totals.products + totals.others;
                const netTotalItems = Math.max(0, grossTotalItems - totals.discount);
                
                // Fator de desconto (se houver itens para aplicar)
                const discountFactor = grossTotalItems > 0 ? (netTotalItems / grossTotalItems) : 1;

                for (const s of selectedServices) {
                    const originalPrice = s.price;
                    const netPrice = s.price * discountFactor;
                    const discountAmount = originalPrice - netPrice;

                    // Cálculo da Comissão
                    let commissionAmount = 0;
                    let commissionRate = 0;

                    // Verifica se é serviço customizado (Outros)
                    if (s.id.startsWith('custom-')) {
                        commissionAmount = 0; // Pendente (ADM)
                        commissionRate = 0;
                    } else {
                        // Busca configuração específica
                        const config = commissionConfigs?.find((c: any) => c.service_id === s.id);
                        if (config) {
                            if (config.commission_type === 'fixed') {
                                commissionAmount = Number(config.commission_value);
                                commissionRate = 0; // Fixo
                            } else {
                                commissionRate = Number(config.commission_value);
                                commissionAmount = netPrice * (commissionRate / 100);
                            }
                        } else {
                            // Fallback Padrão Serviço (40%)
                            commissionRate = 40;
                            commissionAmount = netPrice * 0.4;
                        }
                    }

                    baseTransactions.push({
                        operation: 'VENDA' as any,
                        type: 'SERVIÇO' as any,
                        category: 'Serviço',
                        code: s.code || 'S999',
                        item: s.name, // Nome limpo
                        unit_price: netPrice, // Valor líquido
                        quantity: 1,
                        val: netPrice, // Valor líquido para comissão correta
                        
                        // Novos Campos Detalhados
                        original_value: originalPrice,
                        discount_value: discountAmount,
                        commission_amount: commissionAmount,
                        commission_rate: commissionRate,
                        appointment_total: totals.total,
                        appointment_tip: totals.tip,

                        client_supplier: appointment.clientName,
                        pro: appointment.professionalName,
                        professional_id: appointment.professionalId,
                        date: appointment.date,
                        status: 'Pago' as any
                    });
                }
                for (const p of selectedProducts) {
                    const originalTotal = p.price * p.quantity;
                    const netTotalP = originalTotal * discountFactor;
                    const discountAmountP = originalTotal - netTotalP;
                    
                    // Comissão Produto (Padrão 10%)
                    const commissionRateP = 10;
                    const commissionAmountP = netTotalP * 0.1;

                    baseTransactions.push({
                        operation: 'VENDA' as any,
                        type: 'PRODUTO' as any,
                        category: 'Produto',
                        code: p.code || 'P999',
                        item: p.name,
                        unit_price: netTotalP / p.quantity, // Unitário líquido aproximado
                        quantity: p.quantity,
                        val: netTotalP, // Total líquido
                        
                        // Novos Campos Detalhados
                        original_value: originalTotal,
                        discount_value: discountAmountP,
                        commission_amount: commissionAmountP,
                        commission_rate: commissionRateP,
                        appointment_total: totals.total,
                        appointment_tip: totals.tip,

                        client_supplier: appointment.clientName,
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

                // Adiciona Outros Itens (Com desconto aplicado)
                if (totals.others > 0) {
                    const originalOthers = totals.others;
                    const netOthers = totals.others * discountFactor;
                    const discountOthers = originalOthers - netOthers;

                    baseTransactions.push({
                        operation: 'VENDA' as any,
                        type: 'OUTROS' as any,
                        category: 'Outros',
                        item: othersDescription || 'Outros Itens',
                        unit_price: netOthers,
                        quantity: 1,
                        val: netOthers,

                        // Novos Campos Detalhados
                        original_value: originalOthers,
                        discount_value: discountOthers,
                        commission_amount: 0, // Pendente (ADM)
                        commission_rate: 0,
                        appointment_total: totals.total,
                        appointment_tip: totals.tip,

                        client_supplier: appointment.clientName,
                        pro: appointment.professionalName,
                        professional_id: appointment.professionalId,
                        date: appointment.date,
                        status: 'Pago' as any
                    });
                }

                // Adiciona Gorjeta (SEM DESCONTO, TIPO ESPECÍFICO)
                if (totals.tip > 0) {
                    baseTransactions.push({
                        operation: 'VENDA' as any,
                        type: 'GORJETA' as any, // Tipo específico para fácil identificação
                        category: 'Gorjeta',
                        item: 'Gorjeta (100% Profissional)',
                        unit_price: totals.tip,
                        quantity: 1,
                        val: totals.tip,

                        // Novos Campos Detalhados
                        original_value: totals.tip,
                        discount_value: 0,
                        commission_amount: totals.tip, // 100% para o profissional
                        commission_rate: 100,
                        appointment_total: totals.total,
                        appointment_tip: totals.tip,

                        client_supplier: appointment.clientName,
                        pro: appointment.professionalName,
                        professional_id: appointment.professionalId,
                        date: appointment.date,
                        status: 'Pago' as any
                    });
                }

                // Divide as transações de acordo com os pagamentos
                const transactionsToSync = [];
                const availablePayments = finalPayments.map(p => ({ method: p.method, remaining: p.value }));

                const getPaymentAccount = (method: string): 'CASH' | 'PIX' | 'CARD' | 'BANK' => {
                    const m = method.toLowerCase();
                    if (m.includes('dinheiro')) return 'CASH';
                    if (m.includes('pix')) return 'PIX';
                    if (m.includes('cartão') || m.includes('cartao') || m.includes('crédito') || m.includes('débito')) return 'CARD';
                    if (m.includes('banco') || m.includes('transferência') || m.includes('conta')) return 'BANK';
                    return 'CASH';
                };

                for (const baseTx of baseTransactions) {
                    if (baseTx.val <= 0) {
                        const method = finalPayments[0]?.method || 'Dinheiro';
                        transactionsToSync.push({
                            ...baseTx,
                            payment_method: method,
                            payment_account: getPaymentAccount(method),
                            operation_type: 'ENTRADA'
                        });
                        continue;
                    }

                    let remainingTxValue = baseTx.val;
                    let originalTxValue = baseTx.original_value || 0;
                    let discountTxValue = baseTx.discount_value || 0;
                    let commissionTxValue = baseTx.commission_amount || 0;

                    for (let i = 0; i < availablePayments.length && remainingTxValue > 0; i++) {
                        let payment = availablePayments[i];
                        if (payment.remaining <= 0) continue;

                        let amountToTake = Math.min(remainingTxValue, payment.remaining);
                        let ratio = amountToTake / baseTx.val;

                        transactionsToSync.push({
                            ...baseTx,
                            val: amountToTake,
                            unit_price: amountToTake,
                            quantity: 1,
                            original_value: originalTxValue * ratio,
                            discount_value: discountTxValue * ratio,
                            commission_amount: commissionTxValue * ratio,
                            payment_method: payment.method,
                            payment_account: getPaymentAccount(payment.method),
                            operation_type: 'ENTRADA'
                        });

                        payment.remaining -= amountToTake;
                        remainingTxValue -= amountToTake;
                    }
                    
                    // Fallback se sobrar valor devido a arredondamentos
                    if (remainingTxValue > 0.01) {
                        let ratio = remainingTxValue / baseTx.val;
                        const method = finalPayments[0]?.method || 'Dinheiro';
                        transactionsToSync.push({
                            ...baseTx,
                            val: remainingTxValue,
                            unit_price: remainingTxValue,
                            quantity: 1,
                            original_value: originalTxValue * ratio,
                            discount_value: discountTxValue * ratio,
                            commission_amount: commissionTxValue * ratio,
                            payment_method: method,
                            payment_account: getPaymentAccount(method),
                            operation_type: 'ENTRADA'
                        });
                    }
                }

                await syncAppointmentTransactions(appointment.id, transactionsToSync);

                if (appointment.clientId) {
                    await db.clients().update({ last_visit: new Date() }).eq('id', appointment.clientId);
                    
                    // Lógica de Indicação (Referral)
                    if (appointment.status !== 'Atendimento Realizado') { // Se não estava finalizado antes
                        try {
                            const { data: clientData } = await db.clients().select('referred_by, referral_rewarded').eq('id', appointment.clientId).single();
                            if (clientData && clientData.referred_by && !clientData.referral_rewarded) {
                                // Marca que este cliente já gerou recompensa
                                await db.clients().update({ referral_rewarded: true }).eq('id', appointment.clientId);
                                
                                // Incrementa a contagem do indicador
                                const { data: referrerData } = await db.clients().select('referral_count, free_haircuts_earned').eq('id', clientData.referred_by).single();
                                if (referrerData) {
                                    const newCount = (referrerData.referral_count || 0) + 1;
                                    let newEarned = referrerData.free_haircuts_earned || 0;
                                    
                                    // A cada 3 indicações, ganha 1 corte
                                    if (newCount % 3 === 0) {
                                        newEarned += 1;
                                    }
                                    
                                    await db.clients().update({ 
                                        referral_count: newCount,
                                        free_haircuts_earned: newEarned
                                    }).eq('id', clientData.referred_by);
                                }
                            }
                        } catch (refErr) {
                            console.error("Erro ao processar indicação:", refErr);
                        }
                    }
                }

                setConfirmConfig({ ...confirmConfig, show: false });
                alert('Atendimento finalizado com sucesso!');
                navigate('/agenda');

            } catch (err: any) {
                console.error(err);
                alert(err.message || 'Erro ao finalizar atendimento.');
            } finally {
                setProcessing(false);
            }
        },
        'success'
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-900" size={40} /></div>;
  if (!appointment) return <div className="p-8 text-center">Agendamento não encontrado.</div>;

  const userRole = localStorage.getItem('user_role');
  const canDelete = localStorage.getItem('can_delete_appointments') === 'true';
  const canTransfer = localStorage.getItem('can_transfer_appointments') === 'true';

  const showDeleteButton = userRole === 'ADMIN' || canDelete;
  const showTransferButton = userRole === 'ADMIN' || canTransfer;

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
            {showTransferButton && (
                <button onClick={() => setShowTransferModal(true)} className="bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50">
                    <ArrowRightLeft size={18} className="text-blue-900" />
                    <span className="text-[8px] font-bold uppercase text-gray-600">Transferir</span>
                </button>
            )}
            <button onClick={() => handleChangeStatus('Faltou')} className="bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50">
                <UserX size={18} className="text-orange-500" />
                <span className="text-[8px] font-bold uppercase text-gray-600">Faltou</span>
            </button>
            <button onClick={() => handleChangeStatus('Cancelaram')} className="bg-white border border-gray-200 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-gray-50">
                <XCircle size={18} className="text-red-500" />
                <span className="text-[8px] font-bold uppercase text-gray-600">Cancelar</span>
            </button>
            {showDeleteButton && (
                <button onClick={handleDelete} className="bg-red-50 border border-red-100 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-red-100">
                    <Trash2 size={18} className="text-red-600" />
                    <span className="text-[8px] font-bold uppercase text-red-700">Apagar</span>
                </button>
            )}
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

        {/* OUTROS E GORJETAS */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-blue-900 mb-2">
            <PlusCircle size={18} />
            <h3 className="text-xs font-black uppercase tracking-widest">Outros e Gorjetas</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Outros (R$)</label>
              <input 
                type="text" 
                value={othersValue} 
                onChange={e => setOthersValue(e.target.value)}
                placeholder="0,00"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Gorjeta (R$)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={tipValue} 
                  onChange={e => setTipValue(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-8 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-gray-700"
                />
                <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 text-yellow-500" size={14} />
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Descrição do Item "Outros"</label>
            <input 
              type="text" 
              value={othersDescription} 
              onChange={e => setOthersDescription(e.target.value)}
              placeholder="Ex: Pomada, Cerveja, etc."
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-xs font-medium"
            />
          </div>
        </div>

        {/* DESCONTOS */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <Tag size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Desconto</h3>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setDiscountType('fixed')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${discountType === 'fixed' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
              >
                R$
              </button>
              <button 
                onClick={() => setDiscountType('percentage')}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${discountType === 'percentage' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-400'}`}
              >
                %
              </button>
            </div>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              value={discountValue} 
              onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === 'fixed' ? "0,00" : "0"}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-10 outline-none focus:ring-1 focus:ring-red-500 font-bold text-red-600"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400">
              {discountType === 'fixed' ? <DollarSign size={16} /> : <Percent size={16} />}
            </div>
          </div>
        </div>

        {/* RESUMO E PAGAMENTO */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-md space-y-3">
          <div className="space-y-2 border-b border-gray-50 pb-3">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
              <span>Subtotal</span>
              <span>R$ {totals.subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-[10px] font-bold text-red-500 uppercase tracking-widest px-1">
                <span>Desconto</span>
                <span>- R$ {totals.discount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {totals.tip > 0 && (
              <div className="flex justify-between text-[10px] font-bold text-yellow-600 uppercase tracking-widest px-1">
                <span>Gorjeta</span>
                <span>+ R$ {totals.tip.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 px-1">
            <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Total Geral</span>
            <span className="text-2xl font-black text-blue-900">R$ {totals.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="flex justify-between items-center px-1 mb-2">
          <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
            <DollarSign size={14} /> Recebimento
          </h3>
          <button 
            onClick={() => {
              setShowMultiPayment(!showMultiPayment);
              if (!showMultiPayment && payments.length === 0) {
                setPayments([{ method: paymentMethod || dbPaymentMethods[0]?.name || 'Dinheiro', value: totals.total }]);
              }
            }}
            className={`text-[9px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-full transition-all active:scale-95 ${showMultiPayment ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/20' : 'bg-gray-100 text-gray-400'}`}
          >
            {showMultiPayment ? 'Pagamento Único' : 'Múltiplos Pagamentos'}
          </button>
        </div>

        {!showMultiPayment ? (
          <div className="space-y-4">
            <div className="relative">
                <label className="text-[9px] font-black text-blue-900 uppercase absolute -top-2 left-4 bg-white px-1 z-10">Valor Pago</label>
                <input type="text" value={paymentValue} onChange={e => setPaymentValue(e.target.value)} className="w-full bg-white border border-blue-100 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-blue-900 font-black text-xl text-blue-900"/>
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-900" size={24} />
            </div>
            <div className="relative">
                <label className="text-[9px] font-black text-gray-400 uppercase absolute -top-2 left-4 bg-white px-1 z-10">Forma de Pagamento *</label>
                <select 
                  value={paymentMethod} 
                  onChange={e => setPaymentMethod(e.target.value)} 
                  className={`w-full bg-white border rounded-2xl py-4 px-4 outline-none appearance-none font-bold transition-colors ${!paymentMethod ? 'border-red-200 text-red-400 ring-2 ring-red-50' : 'border-gray-100 text-gray-700'}`}
                >
                  <option value="">Selecione o Meio de Pagamento...</option>
                  {dbPaymentMethods.map(pm => (<option key={pm.id} value={pm.name}>{pm.name}</option>))}
                </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
            {payments.map((p, index) => (
              <div key={index} className="flex gap-2 items-end animate-in slide-in-from-right-2">
                <div className="flex-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block px-1">Método</label>
                  <select 
                    value={p.method}
                    onChange={(e) => handleUpdatePayment(index, 'method', e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-bold text-sm text-gray-700"
                  >
                    {dbPaymentMethods.map(pm => (<option key={pm.id} value={pm.name}>{pm.name}</option>))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block px-1">Valor (R$)</label>
                  <input 
                    type="number"
                    value={p.value}
                    onChange={(e) => handleUpdatePayment(index, 'value', e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 font-black text-sm text-blue-900"
                    placeholder="0.00"
                  />
                </div>
                {payments.length > 1 && (
                  <button 
                    onClick={() => handleRemovePayment(index)}
                    className="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={handleAddPayment}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:border-blue-900/20 hover:text-blue-900 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Adicionar Pagamento
            </button>
            
            <div className="bg-white p-4 rounded-2xl flex justify-between items-center border border-gray-100 shadow-sm">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Informado</span>
              <span className={`font-black text-lg ${Math.abs(payments.reduce((acc, p) => acc + p.value, 0) - totals.total) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                R$ {payments.reduce((acc, p) => acc + p.value, 0).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}

        <button onClick={handleFinalize} disabled={processing} className="w-full bg-green-600 text-white font-black py-5 rounded-[2.5rem] shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 mt-6 mb-12 disabled:opacity-70">
          {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
          {processing 
            ? 'Sincronizando...' 
            : (appointment.status === 'Atendimento Realizado' ? 'Atualizar Atendimento' : 'Finalizar e Salvar')
          }
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
                <button 
                    onClick={confirmConfig.action} 
                    disabled={processing}
                    className={`w-full bg-blue-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${processing ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {processing ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar'}
                </button>
                <button 
                    onClick={() => !processing && setConfirmConfig({...confirmConfig, show: false})} 
                    disabled={processing}
                    className={`w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    Cancelar
                </button>
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
              <button 
                  onClick={() => {
                      setCustomItemType('SERVICE');
                      setCustomItemName('');
                      setCustomItemPrice('');
                      setShowCustomItemModal(true);
                      setShowAddService(false);
                  }} 
                  className="w-full p-4 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 flex justify-between text-left transition-colors shadow-sm mb-2"
              >
                  <span className="text-sm font-black text-blue-900 uppercase tracking-wide">Outros (Personalizado)</span>
                  <PlusCircle size={18} className="text-blue-900" />
              </button>

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
              <button 
                  onClick={() => {
                      setCustomItemType('PRODUCT');
                      setCustomItemName('');
                      setCustomItemPrice('');
                      setShowCustomItemModal(true);
                      setShowAddProduct(false);
                  }} 
                  className="w-full p-4 rounded-2xl border border-orange-200 bg-orange-50 hover:bg-orange-100 flex justify-between text-left transition-colors shadow-sm mb-2"
              >
                  <span className="text-sm font-black text-orange-600 uppercase tracking-wide">Outros (Personalizado)</span>
                  <PlusCircle size={18} className="text-orange-600" />
              </button>

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
      {/* MODAL CUSTOM ITEM (OUTROS) */}
      {showCustomItemModal && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center px-1">
              <h3 className={`font-black uppercase tracking-widest text-xs ${customItemType === 'SERVICE' ? 'text-blue-900' : 'text-orange-600'}`}>
                  Adicionar {customItemType === 'SERVICE' ? 'Serviço' : 'Produto'} (Outros)
              </h3>
              <button onClick={() => setShowCustomItemModal(false)} className="text-gray-400"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Descrição</label>
                    <input 
                        type="text" 
                        value={customItemName}
                        onChange={e => setCustomItemName(e.target.value)}
                        placeholder="Ex: Taxa de deslocamento"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-bold text-gray-700"
                        autoFocus
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Valor (R$)</label>
                    <input 
                        type="text" 
                        value={customItemPrice}
                        onChange={e => setCustomItemPrice(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-bold text-gray-700"
                    />
                </div>

                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex gap-2 items-start">
                    <AlertTriangle size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-yellow-800 leading-tight">
                        Este item será adicionado apenas a este atendimento e não será salvo no cadastro geral.
                    </p>
                </div>

                <button 
                    onClick={handleAddCustomItem}
                    className={`w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform ${customItemType === 'SERVICE' ? 'bg-blue-900' : 'bg-orange-500'}`}
                >
                    Adicionar Item
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCheckout;
