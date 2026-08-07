import { supabase } from '../supabase';
import { addTransaction, updateTransaction, deleteTransaction } from './transactions';

export interface Bill {
  id: string;
  description: string;
  value: number;
  due_date: string;
  recurring?: boolean;
  category: string;
  observation?: string;
  status: 'PENDING' | 'PAID';
  transaction_id?: string | null;
}

export interface PayForm {
  method: string;
  source: string; // 'cash' | 'bank' — string solto para casar com o useState das telas chamadoras
}

// Cria a ocorrência do mês seguinte para uma conta recorrente, se ainda não existir.
const createNextRecurrence = async (bill: Pick<Bill, 'description' | 'value' | 'due_date' | 'recurring' | 'category' | 'observation'>) => {
  const nextDate = new Date(bill.due_date);
  nextDate.setMonth(nextDate.getMonth() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  const { data: existingNext } = await supabase
    .from('bills')
    .select('id')
    .eq('description', bill.description)
    .eq('due_date', nextDateStr)
    .limit(1);

  if (!existingNext || existingNext.length === 0) {
    await supabase.from('bills').insert({
      description: bill.description,
      value: bill.value,
      due_date: nextDateStr,
      recurring: bill.recurring,
      category: bill.category,
      observation: bill.observation,
      status: 'PENDING'
    });
  }
};

// Paga uma conta de forma atômica: a atualização só é aplicada se o status
// ainda for PENDING (compare-and-swap via .eq('status','PENDING')), então
// dois cliques quase simultâneos (ou duas abas) nunca resultam em duas baixas
// e dois lançamentos de despesa para o mesmo pagamento real.
//
// A transação criada é vinculada de volta em bills.transaction_id, para que
// unpayBill() consiga identificar exatamente o lançamento certo (sem isso,
// contas recorrentes com a mesma descrição podiam ter o mês errado estornado).
export const payBill = async (bill: Bill, payForm: PayForm): Promise<{ paid: boolean }> => {
  const amount = Math.abs(Number(bill.value));

  const { data: updatedBill, error } = await supabase
    .from('bills')
    .update({
      status: 'PAID',
      description: bill.description,
      value: amount,
      due_date: bill.due_date,
      recurring: bill.recurring,
      category: bill.category,
      observation: bill.observation
    })
    .eq('id', bill.id)
    .eq('status', 'PENDING')
    .select()
    .single();

  if (error || !updatedBill) {
    // Outra requisição já pagou esta conta primeiro (ou ela não existe mais).
    return { paid: false };
  }

  const transaction = await addTransaction({
    type: 'DESPESA',
    category: bill.category,
    item: `Pgto: ${bill.description}`,
    val: -amount,
    payment_method: payForm.source === 'bank' ? `${payForm.method} (Banco)` : payForm.method,
    pro: 'Sistema',
    date: new Date().toISOString().split('T')[0],
    status: 'Pago'
  });

  await supabase.from('bills').update({ transaction_id: transaction.id }).eq('id', bill.id);

  if (bill.recurring) {
    await createNextRecurrence(bill);
  }

  return { paid: true };
};

// Desfaz o pagamento de uma conta e remove o lançamento financeiro correspondente.
export const unpayBill = async (bill: Bill): Promise<void> => {
  await supabase.from('bills').update({ status: 'PENDING', transaction_id: null }).eq('id', bill.id);

  if (bill.transaction_id) {
    await deleteTransaction(bill.transaction_id);
  } else {
    // Fallback para contas pagas antes de existir o vínculo direto (transaction_id).
    const amount = Math.abs(Number(bill.value));
    const { data: matchingTrans } = await supabase
      .from('transactions')
      .select('id')
      .eq('item', `Pgto: ${bill.description}`)
      .eq('val', -amount)
      .eq('type', 'DESPESA')
      .order('created_at', { ascending: false })
      .limit(1);

    if (matchingTrans && matchingTrans.length > 0) {
      await deleteTransaction(matchingTrans[0].id);
    }
  }

  if (bill.recurring) {
    const nextDate = new Date(bill.due_date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    await supabase
      .from('bills')
      .delete()
      .eq('description', bill.description)
      .eq('due_date', nextDateStr)
      .eq('status', 'PENDING');
  }
};

// Mantém o lançamento financeiro sincronizado quando uma conta já paga tem
// valor/descrição editados. Sem isso, o lançamento ficava com o valor antigo
// e um "desfazer pagamento" posterior não conseguia mais achá-lo certo.
export const syncPaidBillTransaction = async (bill: Pick<Bill, 'description' | 'value' | 'transaction_id'>): Promise<void> => {
  if (!bill.transaction_id) return;
  const amount = Math.abs(Number(bill.value));
  await updateTransaction(bill.transaction_id, {
    item: `Pgto: ${bill.description}`,
    val: -amount
  });
};
