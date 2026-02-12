
import { supabase } from '../supabase';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  item: string;
  val: number;
  method: string;
  pro: string;
  date: string;
  status: 'Pago' | 'Pendente';
  professional_id?: string;
  commission_paid?: boolean;
}

export const getTransactions = async (filters?: { proId?: string, month?: string }): Promise<Transaction[]> => {
  let query = supabase.from('transactions').select('*').order('date', { ascending: false });
  
  if (filters?.proId) query = query.eq('professional_id', filters.proId);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  const payload = {
    ...transaction,
    professional_id: (transaction.professional_id && transaction.professional_id.length > 20) ? transaction.professional_id : null
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  
  // Dispara evento para atualizar outras telas
  window.dispatchEvent(new Event('transaction_added'));
  return data;
};

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  if (error) throw error;
  window.dispatchEvent(new Event('transaction_added'));
};

/**
 * Realiza o pagamento de comissões selecionadas.
 */
export const payCommissions = async (transactionIds: string[], totalValue: number, proName: string, proId?: string) => {
    console.log("Processando baixa de comissão...", { transactionIds, totalValue });

    // 1. Atualizar status das vendas originais para 'pago' (commission_paid)
    const { data: updated, error: updateError } = await supabase
        .from('transactions')
        .update({ commission_paid: true })
        .in('id', transactionIds)
        .select();

    if (updateError) {
        console.error("Erro ao atualizar transações:", updateError);
        throw new Error(`Erro no banco: ${updateError.message}`);
    }

    if (!updated || updated.length === 0) {
        throw new Error("Nenhum registro foi atualizado no banco.");
    }

    // 2. Criar registro de despesa (Pagamento realizado ao profissional)
    const safeProId = (proId && proId.length > 20) ? proId : null;

    const { error: insertError } = await supabase.from('transactions').insert({
        type: 'expense',
        category: 'Comissão',
        item: `Pagamento Comissão - ${proName}`,
        val: -Math.abs(totalValue),
        method: 'Dinheiro', 
        pro: 'Sistema',
        professional_id: safeProId, 
        date: new Date().toISOString().split('T')[0],
        status: 'Pago'
    });

    if (insertError) {
        console.error("Erro ao inserir despesa:", insertError);
        // Reverte as marcas de pago se falhar ao criar a despesa
        await supabase.from('transactions').update({ commission_paid: false }).in('id', transactionIds);
        throw new Error(`Erro ao registrar saída financeira: ${insertError.message}`);
    }

    window.dispatchEvent(new Event('transaction_added'));
    return true;
};
