
import { supabase } from '../supabase';
import type { Transaction } from '../types';

export type { Transaction };

export const getTransactions = async (filters?: { proId?: string, month?: string }): Promise<Transaction[]> => {
  let query = supabase.from('transactions').select('*').order('date', { ascending: false });
  
  if (filters?.proId) query = query.eq('professional_id', filters.proId);
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Mapeia para garantir compatibilidade com o frontend
  return data?.map((t: any) => ({
    ...t,
    val: t.total_value || t.val, // Fallback
    item: t.item || t.description // Fallback para leitura
  })) || [];
};

export const addTransaction = async (transaction: Partial<Transaction> & { method?: string }) => {
  // Ajusta payload para corresponder às colunas do banco
  const payload: any = {
    date: transaction.date,
    operation: transaction.operation || (transaction.val && transaction.val < 0 ? 'COMPRA' : 'VENDA'),
    type: transaction.type || 'OUTROS',
    code: transaction.code || '',
    item: transaction.item,
    
    unit_price: transaction.unit_price || Math.abs(transaction.val || 0),
    cost_value: transaction.cost_value || 0,
    quantity: transaction.quantity || 1,
    total_value: transaction.val, 
    
    client_supplier: transaction.client_supplier,
    payment_method: transaction.method || transaction.payment_method,
    pro: transaction.pro,
    
    status: transaction.status,
    professional_id: (transaction.professional_id && transaction.professional_id.length > 20) ? transaction.professional_id : null,
    appointment_id: transaction.appointment_id,
    
    // Campos de Comissão Sobrescrita
    commission_value: transaction.commission_value,
    commission_type: transaction.commission_type,

    // Novos Campos Detalhados
    commission_amount: transaction.commission_amount,
    commission_rate: transaction.commission_rate,
    original_value: transaction.original_value,
    discount_value: transaction.discount_value,
    appointment_total: transaction.appointment_total,
    appointment_tip: transaction.appointment_tip,

    // Campos Legados mantidos apenas se existirem colunas no banco
    category: transaction.category || transaction.type,
    val: transaction.val,
  };

  // Remove chaves com valores undefined para evitar erros no Supabase
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  
  window.dispatchEvent(new Event('transaction_added'));
  return data;
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
  const payload: any = { ...updates };
  
  // Sincroniza campos de valor se houver atualização
  if (updates.val !== undefined) {
      payload.total_value = updates.val;
      payload.val = updates.val;
      // Atualiza unit_price apenas se for razoável (assumindo quantidade 1 para edições simples)
      payload.unit_price = Math.abs(updates.val);
  }
  
  if (updates.item !== undefined) {
      payload.item = updates.item;
  }

  // Remove undefined
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

  const { error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
  window.dispatchEvent(new Event('transaction_added'));
};

// Função crucial para corrigir o problema de duplicidade
export const syncAppointmentTransactions = async (appointmentId: string, transactions: (Partial<Transaction> & { method?: string })[]) => {
    // 1. Remove todas as transações anteriores deste agendamento
    const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('appointment_id', appointmentId);
    
    if (deleteError) throw deleteError;

    // 2. Insere as novas transações individualmente (linha por linha estilo Excel)
    for (const t of transactions) {
        await addTransaction({
            ...t,
            appointment_id: appointmentId
        });
    }
};

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  if (error) throw error;
  window.dispatchEvent(new Event('transaction_added'));
};

export const payCommissions = async (transactionIds: string[], totalValue: number, proName: string, proId?: string) => {
    const { data: updated, error: updateError } = await supabase
        .from('transactions')
        .update({ commission_paid: true })
        .in('id', transactionIds)
        .select();

    if (updateError) throw new Error(`Erro no banco: ${updateError.message}`);

    const safeProId = (proId && proId.length > 20) ? proId : null;

    try {
        await addTransaction({
            operation: 'COMPRA', // Saída de dinheiro
            type: 'DESPESA',
            category: 'Comissão',
            item: `Pagamento Comissão - ${proName}`,
            val: -Math.abs(totalValue),
            payment_method: 'Dinheiro', 
            pro: 'Sistema',
            professional_id: safeProId, 
            date: new Date().toISOString().split('T')[0],
            status: 'Pago'
        });
    } catch (insertError: any) {
        await supabase.from('transactions').update({ commission_paid: false }).in('id', transactionIds);
        throw new Error(`Erro ao registrar saída financeira: ${insertError.message}`);
    }

    return true;
};

// Nova Função para processar pagamento com método específico e detalhes (Solicitação atual)
export const processCommissionPayment = async (
    transactionIds: string[], 
    totalValue: number, 
    proName: string, 
    paymentMethod: string,
    details: {
        startDate: string,
        endDate: string,
        serviceCount: number,
        productCount: number
    },
    proId?: string
) => {
    // 1. Atualizar transações de origem (Vendas) para Pago
    const { error: updateError } = await supabase
        .from('transactions')
        .update({ commission_paid: true })
        .in('id', transactionIds);

    if (updateError) throw new Error(`Erro ao atualizar status: ${updateError.message}`);

    // 2. Criar a transação de Saída (Despesa)
    const safeProId = (proId && proId.length > 20) ? proId : null;
    
    // Descrição detalhada conforme solicitado
    const description = `Comissão - ${proName} (${details.serviceCount} Serv, ${details.productCount} Prod)`;

    try {
        await addTransaction({
            date: new Date().toISOString().split('T')[0],
            operation: 'COMPRA', // Saída
            type: 'DESPESA',
            category: 'Funcionário', // Categoria solicitada
            item: description,
            val: -Math.abs(totalValue), // Valor negativo
            client_supplier: proName,
            payment_method: paymentMethod,
            pro: 'Sistema',
            professional_id: safeProId,
            status: 'Pago'
        });
    } catch (insertError: any) {
        // Rollback manual simples se falhar a inserção
        await supabase.from('transactions').update({ commission_paid: false }).in('id', transactionIds);
        throw new Error(`Erro ao criar despesa: ${insertError.message}`);
    }

    return true;
};
