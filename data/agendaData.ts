
import { Appointment, EstablishmentSettings } from '../types';
import { supabase } from '../supabase';

export type { Appointment };

export interface AgendaBlock {
  id: string;
  professional_id: string;
  start_at: string;
  end_at: string;
  description: string;
}

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
  return data;
};

export const saveSettings = async (settings: EstablishmentSettings) => {
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...settings });
    
  if (error) throw error;
};

export const getBlocks = async (): Promise<AgendaBlock[]> => {
  const { data, error } = await supabase
    .from('agenda_blocks')
    .select('*');
  return data || [];
};

export const saveBlock = async (block: Omit<AgendaBlock, 'id'>) => {
  const { data, error } = await supabase
    .from('agenda_blocks')
    .insert(block)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteBlock = async (id: string) => {
  const { error } = await supabase
    .from('agenda_blocks')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const getAppointments = async (filters?: { proId?: string, date?: string }): Promise<Appointment[]> => {
  let query = supabase.from('appointments').select('*');
  
  if (filters?.proId) query = query.eq('professional_id', filters.proId);
  if (filters?.date) query = query.eq('date', filters.date);

  const { data, error } = await query;
  return data || [];
};

export const saveAppointment = async (apt: Omit<Appointment, 'id'>) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert(apt)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAppointment = async (id: string, data: Partial<Appointment>) => {
  const { error } = await supabase
    .from('appointments')
    .update(data)
    .eq('id', id);
  if (error) throw error;
};

export const deleteAppointment = async (id: string) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

/**
 * Checks if a specific time slot is blocked for a professional.
 */
export const isSlotBlocked = async (proId: string, date: string, time: string, duration: number): Promise<boolean> => {
  const blocks = await getBlocks();
  const startDateTime = new Date(`${date}T${time}`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

  return blocks.some(block => {
    if (block.professional_id !== proId) return false;
    const bStart = new Date(block.start_at);
    const bEnd = new Date(block.end_at);
    return (startDateTime < bEnd && endDateTime > bStart);
  });
};

/**
 * Retrieves appointments for a specific client phone number.
 */
export const getAppointmentsByPhone = async (phone: string): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('clientPhone', phone);
  if (error) throw error;
  return data || [];
};

export const getAvailableSlotsForPro = async (proId: string, date: string, serviceDuration: number): Promise<string[]> => {
    const settings = await getSettings();
    const interval = settings.slotInterval || 15;
    
    // Obter agendamentos e bloqueios do dia para este pro no banco
    const { data: appointments } = await supabase
      .from('appointments')
      .select('time, duration')
      .eq('professional_id', proId)
      .eq('date', date)
      .not('status', 'in', '("Desmarcou", "Cancelaram")');

    const slots: string[] = [];
    const startHour = 8;
    const endHour = 20;

    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += interval) {
            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            
            // Lógica de conflito (simples)
            const hasConflict = appointments?.some(apt => {
                const [ah, am] = apt.time.split(':').map(Number);
                const aptStart = ah * 60 + am;
                const aptEnd = aptStart + apt.duration;
                const slotStart = h * 60 + m;
                const slotEnd = slotStart + serviceDuration;
                return (slotStart < aptEnd && slotEnd > aptStart);
            });

            if (!hasConflict) {
                slots.push(time);
            }
        }
    }
    return slots;
};
