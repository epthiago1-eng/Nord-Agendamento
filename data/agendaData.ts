
import type { Appointment, EstablishmentSettings } from '../types';
import { supabase, db } from '../supabase';
import { addNotification } from './notifications';
import { addTransaction } from './transactions';

export type { Appointment };

export interface AgendaBlock {
  id: string;
  professional_id: string;
  start_at: string;
  end_at: string;
  description: string;
}

// --- CONFIGURAÇÕES ---

export const getSettings = async (): Promise<EstablishmentSettings> => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (error || !data) {
    return {
      primaryColor: '#1e3a8a',
      secondaryColor: '#000000',
      name: 'Nord Barbershop',
      logoUrl: '',
      slotInterval: 15
    };
  }

  return {
      primaryColor: data.primary_color || data.primaryColor || '#1e3a8a',
      secondaryColor: data.secondary_color || data.secondaryColor || '#000000',
      name: data.name || 'Nord Barbershop',
      logoUrl: data.logo_url || data.logoUrl || '',
      slotInterval: data.slot_interval || data.slotInterval || 15
  };
};

export const saveSettings = async (settings: EstablishmentSettings) => {
  const payload = {
      id: 1, 
      primary_color: settings.primaryColor,
      secondary_color: settings.secondaryColor,
      name: settings.name,
      logo_url: settings.logoUrl,
      slot_interval: settings.slotInterval
  };

  const { error } = await supabase.from('settings').upsert(payload);
  if (error) throw error;
};

// --- BLOQUEIOS ---

export const getBlocks = async (): Promise<AgendaBlock[]> => {
  const { data, error } = await supabase.from('agenda_blocks').select('*');
  return data || [];
};

export const saveBlock = async (block: Omit<AgendaBlock, 'id'>) => {
  const { data, error } = await supabase.from('agenda_blocks').insert(block).select().single();
  if (error) throw error;
  return data;
};

export const updateBlock = async (id: string, updates: Partial<AgendaBlock>) => {
  const { error } = await supabase.from('agenda_blocks').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteBlock = async (id: string) => {
  const { error } = await supabase.from('agenda_blocks').delete().eq('id', id);
  if (error) throw error;
};

// --- AGENDAMENTOS (CORE) ---

// Helper HÍBRIDO para converter DB -> App
// Verifica tanto snake_case quanto camelCase para garantir compatibilidade
const mapAppointmentFromDB = (data: any): Appointment => ({
    id: data.id,
    clientId: data.client_id || data.clientId,
    clientName: data.client_name || data.clientName,
    clientPhone: data.client_phone || data.clientPhone,
    professionalId: data.professional_id || data.professionalId,
    professionalName: data.professional_name || data.professionalName,
    date: data.date,
    time: data.time,
    duration: data.duration,
    status: data.status,
    services: data.services || [],
    products: data.products || [],
    totalValue: data.total_value || data.totalValue,
    observation: data.observation
});

export const getAppointments = async (filters?: { proId?: string, date?: string }): Promise<Appointment[]> => {
  let query = supabase.from('appointments').select('*');
  
  // Tenta filtrar pelas colunas snake_case (padrão)
  // Se o banco usar camelCase, o filtro pode falhar silenciosamente aqui, 
  // mas como select('*') traz tudo, o filtro manual no front resolve em último caso.
  if (filters?.proId) query = query.eq('professional_id', filters.proId);
  if (filters?.date) query = query.eq('date', filters.date);

  const { data, error } = await query;
  if (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return [];
  }
  return data ? data.map(mapAppointmentFromDB) : [];
};

export const getAppointmentsByPhone = async (phone: string): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_phone', phone)
    .gte('date', new Date().toISOString().split('T')[0]) 
    .order('date', { ascending: true });

  if (error) throw error;
  return data ? data.map(mapAppointmentFromDB) : [];
};

export const saveAppointment = async (apt: Omit<Appointment, 'id'>) => {
  // 1. Validação de Disponibilidade
  const availability = await checkAvailability(apt.professionalId, apt.date, apt.time, apt.duration);
  if (!availability.available) {
      throw new Error(availability.reason);
  }

  // 2. Tenta salvar usando snake_case (padrão Supabase)
  const payload = {
      client_id: apt.clientId,
      client_name: apt.clientName,
      client_phone: apt.clientPhone,
      professional_id: apt.professionalId,
      professional_name: apt.professionalName,
      date: apt.date,
      time: apt.time,
      duration: apt.duration,
      status: apt.status,
      services: apt.services,
      products: apt.products || [],
      total_value: apt.totalValue || 0,
      observation: apt.observation
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select()
    .single();

  if (error) {
      console.error("Erro ao salvar agendamento:", error);
      throw error;
  }
  return mapAppointmentFromDB(data);
};

export const updateAppointment = async (id: string, data: Partial<Appointment>) => {
  const payload: any = {};
  if (data.status) payload.status = data.status;
  if (data.professionalId) payload.professional_id = data.professionalId;
  if (data.professionalName) payload.professional_name = data.professionalName;
  if (data.totalValue !== undefined) payload.total_value = data.totalValue;
  if (data.services) payload.services = data.services;
  if (data.products) payload.products = data.products;

  const { error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
};

export const deleteAppointment = async (id: string, reason: string = 'Exclusão manual') => {
  const { data: rawApt } = await supabase.from('appointments').select('*').eq('id', id).single();
  
  if (rawApt) {
      const apt = mapAppointmentFromDB(rawApt);
      
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;

      await addNotification({
          type: 'SISTEMA',
          title: 'Agendamento Excluído',
          message: `Agendamento de ${apt.clientName} com ${apt.professionalName} em ${apt.date} às ${apt.time} foi apagado. Motivo: ${reason}`
      });

      await addTransaction({
          operation: 'VENDA',
          type: 'OUTROS',
          item: `LOG: Exclusão Agendamento - ${apt.clientName} (${apt.professionalName})`,
          val: 0,
          date: new Date().toISOString().split('T')[0],
          payment_method: 'Sistema',
          status: 'Pago',
          pro: 'Sistema'
      });
  }
};

export const checkAvailability = async (
    proId: string, 
    date: string, 
    time: string, 
    duration: number, 
    excludeAptId?: string
): Promise<{ available: boolean, reason?: string }> => {
    
    // 1. Verificar Passado
    const now = new Date();
    const proposedStart = new Date(`${date}T${time}`);
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);

    if (proposedStart < now) {
        return { available: false, reason: 'Não é possível agendar em datas ou horários passados.' };
    }

    // 2. Verificar Bloqueios Manuais
    const { data: blocks } = await supabase
        .from('agenda_blocks')
        .select('*')
        .eq('professional_id', proId)
        .gte('end_at', `${date}T00:00:00`)
        .lte('start_at', `${date}T23:59:59`);

    const hasBlock = blocks?.some(blk => {
        const bStart = new Date(blk.start_at);
        const bEnd = new Date(blk.end_at);
        return (proposedStart < bEnd && proposedEnd > bStart);
    });

    if (hasBlock) {
        return { available: false, reason: 'Horário bloqueado pelo profissional.' };
    }

    // 3. Verificar Conflito com Outros Agendamentos
    let query = supabase
        .from('appointments')
        .select('id, time, duration, status')
        .eq('professional_id', proId)
        .eq('date', date)
        .not('status', 'in', '("Cancelaram","Desmarcou")');

    if (excludeAptId) {
        query = query.neq('id', excludeAptId);
    }

    const { data: appointments } = await query;

    const hasConflict = appointments?.some(apt => {
        const aptStart = new Date(`${date}T${apt.time}`);
        const aptEnd = aptStart.getTime() + (apt.duration || 30) * 60000;
        const proposedEndTime = proposedEnd.getTime();
        const proposedStartTime = proposedStart.getTime();
        
        return (proposedStartTime < aptEnd && proposedEndTime > aptStart.getTime());
    });

    if (hasConflict) {
        return { available: false, reason: 'Horário já ocupado por outro cliente.' };
    }

    return { available: true };
};

export const transferAppointment = async (apt: Appointment, newProId: string, newProName: string) => {
    const check = await checkAvailability(newProId, apt.date, apt.time, apt.duration);
    
    if (!check.available) {
        throw new Error(`O profissional ${newProName} não tem disponibilidade neste horário: ${check.reason}`);
    }

    const { error } = await supabase.from('appointments').update({
        professional_id: newProId,
        professional_name: newProName
    }).eq('id', apt.id);

    if (error) throw error;

    await addNotification({
        type: 'SISTEMA',
        title: 'Agendamento Transferido',
        message: `Cliente ${apt.clientName} transferido de ${apt.professionalName} para ${newProName}.`,
        recipient_pro_id: newProId 
    });
    
    await addNotification({
        type: 'SISTEMA',
        title: 'Agendamento Transferido',
        message: `Seu agendamento com ${apt.clientName} foi transferido para ${newProName}.`,
        recipient_pro_id: apt.professionalId 
    });
};

export const isSlotBlocked = async (proId: string, date: string, time: string, duration: number): Promise<boolean> => {
  const result = await checkAvailability(proId, date, time, duration);
  return !result.available;
};

export const getAvailableSlotsForPro = async (proId: string, dateStr: string, serviceDuration: number): Promise<string[]> => {
    const settings = await getSettings();
    const interval = settings.slotInterval || 15;
    
    const dateObj = new Date(dateStr + 'T12:00:00');
    const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const currentDayName = daysMap[dateObj.getDay()];

    const { data: attendanceHours } = await db.professionalHours()
      .select('start_time, end_time')
      .eq('professional_id', proId)
      .eq('day_of_week', currentDayName);

    if (!attendanceHours || attendanceHours.length === 0) {
      return [];
    }

    const { data: appointments } = await supabase
      .from('appointments')
      .select('time, duration')
      .eq('professional_id', proId)
      .eq('date', dateStr)
      .not('status', 'in', '("Desmarcou", "Cancelaram")');

    const { data: blocks } = await supabase
      .from('agenda_blocks')
      .select('start_at, end_at')
      .eq('professional_id', proId)
      .filter('start_at', 'gte', `${dateStr}T00:00:00`)
      .filter('start_at', 'lte', `${dateStr}T23:59:59`);

    const availableSlots: string[] = [];

    attendanceHours.forEach(range => {
        const [startH, startM] = range.start_time.split(':').map(Number);
        const [endH, endM] = range.end_time.split(':').map(Number);
        
        const rangeStartMinutes = startH * 60 + startM;
        const rangeEndMinutes = endH * 60 + endM;

        for (let currentMinutes = rangeStartMinutes; currentMinutes < rangeEndMinutes; currentMinutes += interval) {
            const h = Math.floor(currentMinutes / 60);
            const m = currentMinutes % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            
            const slotStart = currentMinutes;
            const slotEnd = currentMinutes + serviceDuration;

            const slotDateTime = new Date(`${dateStr}T${timeStr}`);
            if (slotDateTime < new Date()) continue;

            if (slotEnd > rangeEndMinutes) continue;

            const hasAptConflict = appointments?.some(apt => {
                const [ah, am] = apt.time.split(':').map(Number);
                const aptStart = ah * 60 + am;
                const aptEnd = aptStart + apt.duration;
                return (slotStart < aptEnd && slotEnd > aptStart);
            });

            const hasBlockConflict = blocks?.some(blk => {
                const bStart = new Date(blk.start_at);
                const bEnd = new Date(blk.end_at);
                const bStartMin = bStart.getHours() * 60 + bStart.getMinutes();
                const bEndMin = bEnd.getHours() * 60 + bEnd.getMinutes();
                return (slotStart < bEndMin && slotEnd > bStartMin);
            });

            if (!hasAptConflict && !hasBlockConflict) {
                availableSlots.push(timeStr);
            }
        }
    });

    return Array.from(new Set(availableSlots)).sort();
};
