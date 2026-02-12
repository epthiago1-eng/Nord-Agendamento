
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Credenciais configuradas para o projeto vnpqrmrgpgrlkddquald
export const supabaseUrl = 'https://vnpqrmrgpgrlkddquald.supabase.co';

// Chave pública (Anon Key) extraída do seu snapshot
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucHFybXJncGdybGtkZHF1YWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzYwNjIsImV4cCI6MjA4NjQxMjA2Mn0.Cjw6wUkGAWpbeTWp15wcBeAydHmloZoVHBxFXKFa9z0'; 

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
  profiles: () => supabase.from('profiles'),
  bills: () => supabase.from('bills'),
  paymentMethods: () => supabase.from('payment_methods'),
  costCenters: () => supabase.from('cost_centers'),
  professionalServices: () => supabase.from('professional_services') // Nova tabela
};
