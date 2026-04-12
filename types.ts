
export type UserRole = 'ADMIN' | 'COLLABORATOR';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  professionalId?: string;
}

export interface Professional {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  status: 'Ativo' | 'Inativo';
  showInPublic: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  birthDate?: string;
  lastVisit?: string;
  daysAbsent?: number;
  referral_count?: number;
  free_haircuts_earned?: number;
  referred_by?: string;
  referral_rewarded?: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  reminderDays: number;
  groupId?: string;
  observation?: string;
  showInAgenda: boolean;
  showValueInAgenda: boolean;
  showInPublic: boolean;
  imageUrl?: string;
  code?: string; // Novo campo
}

export interface Product {
  id: string;
  name: string;
  code?: string; // Novo campo
  sale_price: number;
  current_stock: number;
}

export interface EstablishmentSettings {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  name: string;
  slotInterval: number;
  cash_balance?: number;
  bank_balance?: number;
  pix_balance?: number;
  card_balance?: number;
}

export interface ServiceGroup {
  id: string;
  name: string;
}

export interface Package {
  id: string;
  name: string;
  value: number;
  durationDays: number;
  reminderDays: number;
  saleId?: string;
  validDays: string[];
  procedures: string[];
}

export interface Appointment {
  id: string;
  clientId: string;
  client_id?: string; // Novo campo UUID
  clientName: string;
  clientPhone?: string;
  professionalId: string;
  professional_id?: string; // Novo campo UUID
  professionalName: string;
  date: string;
  time: string;
  appointment_time?: string; // Novo campo unificado
  duration: number;
  status: 'Aberto' | 'Atendido' | 'Chegou' | 'Confirmado' | 'Desmarcou' | 'Faltou' | 'Particular' | 'Atendimento Realizado' | 'Cancelaram';
  observation?: string;
  services: string[];
  products?: { id: string, name: string, price: number, quantity: number }[]; // Novo campo: Lista de produtos
  totalValue?: number;
  total_value?: number; // Compatibilidade
  others_value?: number;
  discount_value?: number;
  tip_value?: number;
  others_description?: string;
  payment_method?: string;
  payments?: { method: string, value: number }[];
}

export interface Transaction {
  id: string;
  date: string;
  operation: 'COMPRA' | 'VENDA'; // Excel Column: OPERAÇÃO
  type: 'PRODUTO' | 'SERVIÇO' | 'DESPESA' | 'OUTROS' | 'GORJETA' | 'VALE'; // Excel Column: TIPO
  code?: string; // Excel Column: CÓD
  item: string; // Excel Column: DESCRIÇÃO
  
  unit_price?: number; // VR VENDA (Unitário)
  cost_value?: number; // VR CUSTO
  quantity: number; // QTD.
  total_value: number; // TOTAL (Calculado)
  amount?: number; // Novo campo do banco
  
  client_supplier?: string; // CLIENTE / FORNEC
  payment_method: string; // FORMA PAG.
  pro?: string; // FUNCIONÁRIO
  
  status: 'Pendente' | 'Pago';
  
  // Novos Campos Organizados
  payment_account?: 'CASH' | 'PIX' | 'CARD' | 'BANK';
  operation_type?: 'ENTRADA' | 'SAÍDA';
  
  // Campos de Sistema
  category?: string; // Mantido para compatibilidade
  val: number; // Mantido para compatibilidade (é o total_value com sinal)
  professional_id?: string;
  appointment_id?: string; // Vínculo para evitar duplicidade
  commission_paid?: boolean;
  commission_amount?: number; // Valor final da comissão (calculado ou manual)
  commission_rate?: number; // Taxa usada (%)
  original_value?: number; // Valor original (sem desconto)
  discount_value?: number; // Valor do desconto
  appointment_total?: number; // Total pago pelo cliente (denormalizado)
  appointment_tip?: number; // Gorjeta do agendamento (denormalizado)
  
  // Campos de Override (mantidos para compatibilidade com lógica anterior)
  commission_value?: number; 
  commission_type?: 'percent' | 'fixed';
}

export interface AppNotification {
  id: string;
  type: 'AGENDAMENTO' | 'FINANCEIRO' | 'SISTEMA';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
  recipient_pro_id?: string; // Novo campo para filtro
  metadata?: any;
}
