
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
  showInPublic: boolean; // Novo campo
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  birthDate?: string;
  lastVisit?: string;
  daysAbsent?: number;
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
  showInPublic: boolean; // Novo campo
  imageUrl?: string;
}

export interface EstablishmentSettings {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  name: string;
  slotInterval: number; // Novo campo para intervalo da agenda
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
  clientName: string;
  clientPhone?: string;
  professionalId: string;
  professionalName: string;
  date: string;
  time: string;
  duration: number;
  status: 'Aberto' | 'Atendido' | 'Chegou' | 'Confirmado' | 'Desmarcou' | 'Faltou' | 'Particular' | 'Atendimento Realizado' | 'Cancelaram';
  observation?: string;
  services: string[];
  // Fix: Add totalValue property to Appointment interface to support checkout storage
  totalValue?: number;
}

export interface Transaction {
  id: string;
  type: 'Receita' | 'Despesa';
  costCenterId: string;
  status: 'Pendente' | 'Pago';
  description: string;
  value: number;
  discount: number;
  interest: number;
  tax: number;
  dueDate: string;
  paymentMethod: string;
  financialAccount: string;
  installments: number;
  recurrenceMonths: number;
  professionalId?: string;
  clientId?: string;
}
