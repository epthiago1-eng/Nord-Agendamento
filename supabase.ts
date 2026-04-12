
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
  notifications: () => supabase.from('notifications'),
  appointmentServices: () => supabase.from('appointment_services')
};
