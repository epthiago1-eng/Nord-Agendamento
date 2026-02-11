
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Substitua estas variáveis pelas credenciais reais do seu painel Supabase (Settings > API)
const supabaseUrl = 'https://vnpqrmrgpgrlkddquald.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucHFybXJncGdybGtkZHF1YWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzYwNjIsImV4cCI6MjA4NjQxMjA2Mn0.Cjw6wUkGAWpbeTWp15wcBeAydHmloZoVHBxFXKFa9z0';

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
