
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
}

export const getTransactions = async (filters?: { proId?: string, month?: string }): Promise<Transaction[]> => {
  let query = supabase.from('transactions').select('*').order('date', { ascending: false });
  
  if (filters?.proId) query = query.eq('professional_id', filters.proId);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  if (error) throw error;
};
