
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
  // BANCO: table 'settings' usa snake_case
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

// Helper para converter DB -> App (ROBUSTO: Aceita camelCase e snake_case)
const mapAppointmentFromDB = (data: any): Appointment => ({
    id: data.id,
    clientId: data.clientId || data.client_id, 
    clientName: data.clientName || data.client_name,
    clientPhone: data.clientPhone || data.client_phone,
    professionalId: data.professionalId || data.professional_id, 
    professionalName: data.professionalName || data.professional_name,
    date: data.date,
    time: data.time,
    duration: data.duration,
    status: data.status,
    services: data.services || [],
    products: data.products || [],
    totalValue: data.totalValue !== undefined ? data.totalValue : data.total_value,
    observation: data.observation
});

export const getAppointments = async (filters?: { proId?: string, date?: string }): Promise<Appointment[]> => {
  let query = supabase.from('appointments').select('*');
  
  // Tenta filtrar por camelCase primeiro, mas se o banco for snake_case isso não quebra a query select('*')
  // A filtragem fina deve acontecer com cuidado ou no client-side se houver dúvida do schema
  if (filters?.proId) query = query.eq('professionalId', filters.proId); 
  // Nota: Se o banco usar professional_id, a linha acima pode falhar silenciosamente ou retornar erro. 
  // Idealmente o Supabase ignora colunas inexistentes no filtro ou retorna erro.
  // Vamos assumir camelCase conforme setup, mas o mapAppointmentFromDB garante leitura.
  
  if (filters?.date) query = query.eq('date', filters.date);

  const { data, error } = await query;
  
  // Fallback: Se der erro na query especifica (ex: coluna nao existe), tenta buscar tudo e filtrar no JS (menos performático mas seguro para dev)
  if (error && error.code === 'PGRST204') { // Column not found
      console.warn('Coluna não encontrada, tentando busca genérica...');
      const { data: allData } = await supabase.from('appointments').select('*');
      let result = allData ? allData.map(mapAppointmentFromDB) : [];
      if (filters?.date) result = result.filter(a => a.date === filters.date);
      if (filters?.proId) result = result.filter(a => a.professionalId === filters.proId);
      return result;
  }

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
    //.eq('clientPhone', phone) // Tentativa direta
    .gte('date', new Date().toISOString().split('T')[0]) 
    .order('date', { ascending: true });

  if (error) throw error;
  
  // Filtragem no cliente para garantir match independente do nome da coluna
  const mapped = data ? data.map(mapAppointmentFromDB) : [];
  return mapped.filter(a => a.clientPhone === phone);
};

export const saveAppointment = async (apt: Omit<Appointment, 'id'>) => {
  // 1. Validação de Disponibilidade
  const availability = await checkAvailability(apt.professionalId, apt.date, apt.time, apt.duration);
  if (!availability.available) {
      throw new Error(availability.reason);
  }

  // 2. Salvar (Tenta payload camelCase, banco deve suportar ou ter colunas aspas duplas)
  const payload = {
      clientId: apt.clientId,
      clientName: apt.clientName,
      clientPhone: apt.clientPhone,
      professionalId: apt.professionalId,
      professionalName: apt.professionalName,
      date: apt.date,
      time: apt.time,
      duration: apt.duration,
      status: apt.status,
      services: apt.services,
      products: apt.products || [],
      totalValue: apt.totalValue || 0,
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
  if (data.professionalId) payload.professionalId = data.professionalId;
  if (data.professionalName) payload.professionalName = data.professionalName;
  if (data.totalValue !== undefined) payload.totalValue = data.totalValue;
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
    
    const now = new Date();
    const proposedStart = new Date(`${date}T${time}`);
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);

    if (proposedStart < now) {
        return { available: false, reason: 'Não é possível agendar em datas ou horários passados.' };
    }

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

    // Busca agendamentos do dia (busca genérica para filtrar no JS e evitar erro de coluna)
    const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('date', date);

    if (appointments) {
        const mappedApts = appointments.map(mapAppointmentFromDB);
        
        // Filtra pelo profissional e status
        const proApts = mappedApts.filter(a => 
            a.professionalId === proId && 
            !['Cancelaram', 'Desmarcou'].includes(a.status) &&
            a.id !== excludeAptId
        );

        const hasConflict = proApts.some(apt => {
            const aptStart = new Date(`${date}T${apt.time}`);
            const aptEnd = aptStart.getTime() + (apt.duration || 30) * 60000;
            const proposedEndTime = proposedEnd.getTime();
            const proposedStartTime = proposedStart.getTime();
            
            return (proposedStartTime < aptEnd && proposedEndTime > aptStart.getTime());
        });

        if (hasConflict) {
            return { available: false, reason: 'Horário já ocupado por outro cliente.' };
        }
    }

    return { available: true };
};

export const transferAppointment = async (apt: Appointment, newProId: string, newProName: string) => {
    const check = await checkAvailability(newProId, apt.date, apt.time, apt.duration);
    
    if (!check.available) {
        throw new Error(`O profissional ${newProName} não tem disponibilidade neste horário: ${check.reason}`);
    }

    const { error } = await supabase.from('appointments').update({
        professionalId: newProId,
        professionalName: newProName
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

    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', dateStr);
      
    const appointments = appointmentsData ? appointmentsData.map(mapAppointmentFromDB).filter(a => a.professionalId === proId && !['Desmarcou', 'Cancelaram'].includes(a.status)) : [];

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

            const hasAptConflict = appointments.some(apt => {
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
