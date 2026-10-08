
import { supabase } from '../supabase';
import type { Transaction } from '../types';

export type { Transaction };

export const getTransactions = async (filters?: { proId?: string, month?: string, startDate?: string, endDate?: string }): Promise<Transaction[]> => {
  let query = supabase.from('transactions').select('*').order('date', { ascending: false });
  
  if (filters?.proId) query = query.eq('professional_id', filters.proId);
  
  if (filters?.startDate && filters?.endDate) {
      query = query.gte('date', filters.startDate).lte('date', filters.endDate);
  } else if (filters?.month) {
      // Fallback para filtro de mês YYYY-MM
      const [year, month] = filters.month.split('-');
      const start = `${year}-${month}-01`;
      const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      query = query.gte('date', start).lte('date', end);
  }
  
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
  // Mapeamento automático para as novas colunas organizadas
  const method = transaction.method || transaction.payment_method || '';
  const val = transaction.val || 0;
  const operation = transaction.operation || (val < 0 ? 'COMPRA' : 'VENDA');

  const payment_account = transaction.payment_account || ((): any => {
    const m = method.toLowerCase();
    if (m.includes('dinheiro')) return 'CASH';
    if (m.includes('pix')) return 'PIX';
    if (m.includes('cartão') || m.includes('cartao') || m.includes('crédito') || m.includes('débito')) return 'CARD';
    if (m.includes('banco') || m.includes('transferência') || m.includes('conta')) return 'BANK';
    return 'CASH'; // Default
  })();

  const operation_type = transaction.operation_type || (operation === 'VENDA' || val > 0 ? 'ENTRADA' : 'SAÍDA');

  // Ajusta payload para corresponder às colunas do banco
  const payload: any = {
    date: transaction.date,
    operation: operation,
    operation_type: operation_type,
    payment_account: payment_account,
    type: transaction.type || 'OUTROS',
    code: transaction.code || '',
    item: transaction.item,
    
    unit_price: transaction.unit_price || Math.abs(val),
    cost_value: transaction.cost_value || 0,
    quantity: transaction.quantity || 1,
    total_value: val, 
    
    client_supplier: transaction.client_supplier,
    payment_method: method,
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
    val: val,
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
      payload.unit_price = Math.abs(updates.val);
      
      // Atualiza operation_type se o valor mudar de sinal
      if (!updates.operation_type) {
        payload.operation_type = updates.val >= 0 ? 'ENTRADA' : 'SAÍDA';
      }
  }

  // Sincroniza payment_account se payment_method mudar
  if (updates.payment_method && !updates.payment_account) {
    const m = updates.payment_method.toLowerCase();
    if (m.includes('dinheiro')) payload.payment_account = 'CASH';
    else if (m.includes('pix')) payload.payment_account = 'PIX';
    else if (m.includes('cartão') || m.includes('cartao') || m.includes('crédito') || m.includes('débito')) payload.payment_account = 'CARD';
    else if (m.includes('banco') || m.includes('transferência') || m.includes('conta')) payload.payment_account = 'BANK';
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
    // Usa a função RPC para garantir atomicidade (Delete + Insert na mesma transação)
    // Isso previne condições de corrida onde múltiplas requisições criam duplicatas
    const { error } = await supabase.rpc('sync_appointment_transactions', {
        p_appointment_id: appointmentId,
        p_transactions: transactions
    });

    if (error) {
        console.error("Erro ao sincronizar transações (RPC):", error);
        
        // Fallback para o método antigo se a RPC não existir ou não for encontrada
        // PGRST202: Could not find the function ... in the schema cache
        const isFunctionMissing = 
            (error.message && (
                error.message.includes('function') && 
                (error.message.includes('does not exist') || error.message.includes('Could not find'))
            )) ||
            (error.code === 'PGRST202');

        if (isFunctionMissing) {
             console.warn("RPC não encontrada (PGRST202), usando fallback manual...");
             const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('appointment_id', appointmentId);
            
            if (deleteError) throw deleteError;

            for (const t of transactions) {
                await addTransaction({
                    ...t,
                    appointment_id: appointmentId
                });
            }
            return;
        }
        throw error;
    }
    
    window.dispatchEvent(new Event('transaction_added'));
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
    // 1. Atualizar transações de origem
    const { error: updateError } = await supabase
        .from('transactions')
        .update({ commission_paid: true })
        .in('id', transactionIds);

    if (updateError) throw new Error(`Erro no banco: ${updateError.message}`);

    const safeProId = (proId && proId.length > 20) ? proId : null;
    const amount = Math.abs(totalValue);

    try {
        // 2. Registrar a saída financeira
        await addTransaction({
            operation: 'COMPRA',
            type: 'DESPESA',
            category: 'Comissão',
            item: `Pagamento Comissão - ${proName}`,
            val: -amount,
            payment_method: 'Dinheiro', 
            pro: 'Sistema',
            professional_id: safeProId, 
            date: new Date().toISOString().split('T')[0],
            status: 'Pago'
        });

        // 3. Atualizar o saldo em dinheiro (Default para payCommissions)
        // REMOVIDO: Agora tratado por trigger no banco de dados
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
    const amount = Math.abs(totalValue);
    
    // Descrição detalhada conforme solicitado
    const description = `Comissão - ${proName} (${details.serviceCount} Serv, ${details.productCount} Prod)`;

    try {
        await addTransaction({
            date: new Date().toISOString().split('T')[0],
            operation: 'COMPRA', // Saída
            type: 'DESPESA',
            category: 'Funcionário', // Categoria solicitada
            item: description,
            val: -amount, // Valor negativo
            client_supplier: proName,
            payment_method: paymentMethod,
            pro: 'Sistema',
            professional_id: safeProId,
            status: 'Pago'
        });

        // 3. Atualizar o saldo correspondente no settings
        // REMOVIDO: Agora tratado por trigger no banco de dados
    } catch (insertError: any) {
        // Rollback manual simples se falhar a inserção
        await supabase.from('transactions').update({ commission_paid: false }).in('id', transactionIds);
        throw new Error(`Erro ao criar despesa: ${insertError.message}`);
    }

    return true;
};
