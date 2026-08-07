
import { createClient } from '@supabase/supabase-js';

// Função auxiliar para obter variáveis de ambiente de forma segura
const getEnv = (key: string, fallback: string): string => {
  // Verifica se import.meta.env existe (Vite)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  // Fallback direto
  return fallback;
};

// Credenciais com fallback explícito
export const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://vnpqrmrgpgrlkddquald.supabase.co');
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucHFybXJncGdybGtkZHF1YWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzYwNjIsImV4cCI6MjA4NjQxMjA2Mn0.Cjw6wUkGAWpbeTWp15wcBeAydHmloZoVHBxFXKFa9z0');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// O PostgREST (Supabase) limita cada resposta a 1000 linhas por padrão. Uma
// query sem paginação nessas tabelas trunca silenciosamente — sem erro, sem
// aviso — assim que o total ultrapassa esse limite. Esse helper pagina com
// .range() até esgotar os resultados, para qualquer busca que precise trazer
// o conjunto inteiro (não apenas uma página) de uma tabela que pode crescer
// além de 1000 linhas (agendamentos e transações já passaram desse ponto).
export const fetchAllPages = async <T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> => {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
};

// Helpers para abstração de dados recorrentes
export const db = {
  professionals: () => supabase.from('professionals'),
  services: () => supabase.from('services'),
  clients: () => supabase.from('clients'),
  products: () => supabase.from('products'),
  appointments: () => supabase.from('appointments'),
  transactions: () => supabase.from('transactions'),
  settings: () => supabase.from('settings'),
  profiles: () => supabase.from('profiles'),
  bills: () => supabase.from('bills'),
  paymentMethods: () => supabase.from('payment_methods'),
  costCenters: () => supabase.from('cost_centers'),
  professionalServices: () => supabase.from('professional_services'),
  professionalHours: () => supabase.from('professional_hours'),
  notifications: () => supabase.from('notifications')
};
