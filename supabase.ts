
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Substitua estas variáveis pelas credenciais reais do seu painel Supabase (Settings > API)
const supabaseUrl = 'https://SUA_URL_AQUI.supabase.co';
const supabaseAnonKey = 'SUA_ANON_KEY_AQUI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helpers para abstração de dados recorrentes
export const db = {
  professionals: () => supabase.from('professionals'),
  services: () => supabase.from('services'),
  clients: () => supabase.from('clients'),
  products: () => supabase.from('products'),
  appointments: () => supabase.from('appointments'),
  transactions: () => supabase.from('transactions'),
  settings: () => supabase.from('settings'),
  profiles: () => supabase.from('profiles')
};
