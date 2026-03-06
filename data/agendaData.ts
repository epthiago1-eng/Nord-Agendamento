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
    .select('primary_color, secondary_color, name, logo_url, slot_interval, cash_balance, bank_balance')
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
      primaryColor: data.primary_color || '#1e3a8a',
      secondaryColor: data.secondary_color || '#000000',
      name: data.name || 'Nord Barbershop',
      logoUrl: data.logo_url || '',
      slotInterval: data.slot_interval || 15,
      cash_balance: data.cash_balance || 0,
      bank_balance: data.bank_balance || 0
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
      slot_interval: settings.slotInterval,
      cash_balance: settings.cash_balance || 0,
      bank_balance: settings.bank_balance || 0
  };

  const { error } = await supabase.from('settings').upsert(payload);
  if (error) throw error;
};

// --- BLOQUEIOS ---

export const getBlocks = async (filters?: { date?: string, proId?: string }): Promise<AgendaBlock[]> => {
  let query = supabase.from('agenda_blocks').select('*');
  
  if (filters?.date) {
      query = query.gte('end_at', `${filters.date}T00:00:00`)
                   .lte('start_at', `${filters.date}T23:59:59`);
  }
  
  if (filters?.proId) {
      query = query.eq('professional_id', filters.proId);
  }

  const { data, error } = await query;
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
    others_value: data.others_value !== undefined ? data.others_value : data.othersValue,
    others_description: data.others_description !== undefined ? data.others_description : data.othersDescription,
    discount_value: data.discount_value !== undefined ? data.discount_value : data.discountValue,
    tip_value: data.tip_value !== undefined ? data.tip_value : data.tipValue,
    payment_method: data.payment_method || data.paymentMethod,
    observation: data.observation
});

export const getAppointments = async (filters?: { proId?: string, date?: string, startDate?: string, endDate?: string }): Promise<Appointment[]> => {
  let query = supabase.from('appointments').select('*');
  
  // Tenta filtrar por professionalId (camelCase como no banco, com aspas duplas implícitas pelo client)
  if (filters?.proId) query = query.eq('professionalId', filters.proId); 
  
  if (filters?.date) {
      query = query.eq('date', filters.date);
  } else if (filters?.startDate && filters?.endDate) {
      query = query.gte('date', filters.startDate).lte('date', filters.endDate);
  }

  const { data, error } = await query;
  
  // Fallback: Se der erro na query especifica (ex: coluna nao existe), tenta buscar tudo e filtrar no JS
  if (error && error.code === 'PGRST204') { // Column not found
      console.warn('Coluna não encontrada, tentando busca genérica...');
      const { data: allData } = await supabase.from('appointments').select('*');
      let result = allData ? allData.map(mapAppointmentFromDB) : [];
      
      if (filters?.date) result = result.filter(a => a.date === filters.date);
      if (filters?.startDate && filters?.endDate) {
          result = result.filter(a => a.date >= filters.startDate! && a.date <= filters.endDate!);
      }
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
    // .gte('date', new Date().toISOString().split('T')[0]) // REMOVIDO: Queremos todo o histórico
    .order('date', { ascending: false }); // Ordena do mais recente para o mais antigo

  if (error) throw error;
  
  // Filtragem no cliente para garantir match independente do nome da coluna
  const mapped = data ? data.map(mapAppointmentFromDB) : [];
  return mapped.filter(a => a.clientPhone === phone);
};

export const checkClientSpam = async (phone: string, date: string): Promise<{ allowed: boolean, reason?: string }> => {
    // 1. Verificar agendamentos no mesmo dia
    const { data: sameDay } = await supabase
        .from('appointments')
        .select('*')
        .eq('date', date)
        .neq('status', 'Cancelaram') // Ignora cancelados
        .neq('status', 'Desmarcou');

    const sameDayApps = sameDay ? sameDay.map(mapAppointmentFromDB).filter(a => a.clientPhone === phone) : [];
    
    if (sameDayApps.length > 0) {
        return { allowed: false, reason: 'Você já possui um agendamento para este dia.' };
    }

    // 2. Verificar agendamentos na mesma semana (Domingo a Sábado)
    const targetDate = new Date(date + 'T12:00:00');
    const day = targetDate.getDay(); // 0 (Dom) a 6 (Sab)
    
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - day);
    const startStr = startOfWeek.toISOString().split('T')[0];

    const endOfWeek = new Date(targetDate);
    endOfWeek.setDate(targetDate.getDate() + (6 - day));
    const endStr = endOfWeek.toISOString().split('T')[0];

    const { data: sameWeek } = await supabase
        .from('appointments')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .neq('status', 'Cancelaram')
        .neq('status', 'Desmarcou');

    const sameWeekApps = sameWeek ? sameWeek.map(mapAppointmentFromDB).filter(a => a.clientPhone === phone) : [];

    if (sameWeekApps.length >= 2) {
        return { allowed: false, reason: 'Limite de 2 agendamentos por semana atingido.' };
    }

    return { allowed: true };
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
      total_value: apt.totalValue || 0,
      others_value: (apt as any).others_value || 0,
      others_description: (apt as any).others_description || null,
      discount_value: (apt as any).discount_value || 0,
      tip_value: (apt as any).tip_value || 0,
      payment_method: apt.payment_method || null,
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
  // Se o usuário não estiver logado, tenta usar a função RPC pública (se tiver telefone)
  const { data: session } = await supabase.auth.getSession();
  const isAnon = !session?.session?.user;

  if (isAnon) {
      // O telefone DEVE vir no payload para validação de segurança
      const phone = data.clientPhone;
      
      if (phone) {
          // Converte o partial data para o formato esperado pelo RPC
          const rpcPayload = {
              ...data,
          };

          const { error } = await supabase.rpc('update_appointment_public', {
              p_appointment_id: id,
              p_client_phone: phone,
              p_data: rpcPayload
          });
          
          if (error) throw error;
          return;
      }
      // Se não tiver telefone no payload, cai no fluxo normal (que falhará no RLS para anon)
      // Isso é correto: obriga o front a enviar o telefone para provar propriedade
  }

  const payload: any = {};
  if (data.status) payload.status = data.status;
  if (data.professionalId) payload.professionalId = data.professionalId;
  if (data.professionalName) payload.professionalName = data.professionalName;
  if (data.date) payload.date = data.date;
  if (data.time) payload.time = data.time;
  if (data.duration) payload.duration = data.duration;
  if (data.observation) payload.observation = data.observation;
  if (data.totalValue !== undefined) payload.total_value = data.totalValue;
  if ((data as any).others_value !== undefined) payload.others_value = (data as any).others_value;
  if ((data as any).others_description !== undefined) payload.others_description = (data as any).others_description;
  if ((data as any).discount_value !== undefined) payload.discount_value = (data as any).discount_value;
  if ((data as any).tip_value !== undefined) payload.tip_value = (data as any).tip_value;
  if (data.payment_method !== undefined) payload.payment_method = data.payment_method;
  if (data.services) payload.services = data.services;
  if (data.products) payload.products = data.products;

  const { error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
};

export const cancelAppointmentPublic = async (id: string, phone: string) => {
    const { error } = await supabase.rpc('cancel_appointment_public', {
        p_appointment_id: id,
        p_client_phone: phone
    });
    if (error) throw error;
};

export const deleteAppointment = async (id: string, reason: string = 'Exclusão manual') => {
  const { data: rawApt } = await supabase.from('appointments').select('*').eq('id', id).single();
  
  if (rawApt) {
      const apt = mapAppointmentFromDB(rawApt);
      
      // 1. Remove transações financeiras associadas ao agendamento para não sobrar "lixo" financeiro
      const { error: transError } = await supabase.from('transactions').delete().eq('appointment_id', id);
      if (transError) {
          console.error('Erro ao excluir transações do agendamento:', transError);
          // Não interrompe o fluxo, mas loga o erro. 
          // Se houver constraint RESTRICT, o delete do appointment abaixo falhará de qualquer forma.
      }

      // 1.1. Estorna valor do caixa se foi pago em Dinheiro/Pix
      if (
          apt.status === 'Atendimento Realizado' &&
          apt.payment_method &&
          (apt.payment_method.toLowerCase().includes('dinheiro') || apt.payment_method.toLowerCase().includes('pix'))
      ) {
          try {
              // Estorna o valor (passa negativo)
              await supabase.rpc('update_cash_balance', { amount: -(apt.totalValue || 0) });
          } catch (e) {
              console.error("Erro ao estornar caixa na exclusão:", e);
          }
      }

      // 2. Remove o agendamento
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;

      await addNotification({
          type: 'SISTEMA',
          title: 'Agendamento Excluído',
          message: `Agendamento de ${apt.clientName} com ${apt.professionalName} em ${apt.date} às ${apt.time} foi apagado. Motivo: ${reason}`
      });

      // Coleta dados para o Log Detalhado
      const currentUser = localStorage.getItem('user_name') || 'Usuário Desconhecido';
      const deletionTime = new Date().toLocaleString('pt-BR');
      const servicesStr = apt.services?.length ? apt.services.join(', ') : 'Sem serviços';
      const productsStr = apt.products?.length ? apt.products.map((p: any) => `${p.name} (x${p.quantity})`).join(', ') : 'Sem produtos';
      
      const logDetails = `[EXCLUSÃO] Cliente: ${apt.clientName} | Agenda: ${apt.date} às ${apt.time} | Prof: ${apt.professionalName} | Svcs: ${servicesStr} | Prods: ${productsStr} | Pagto: ${apt.payment_method || 'Não Inf.'} | Excluído por: ${currentUser} em ${deletionTime}`;

      await addTransaction({
          operation: 'VENDA',
          type: 'OUTROS',
          category: 'Log Exclusão',
          item: logDetails,
          val: 0,
          date: new Date().toISOString().split('T')[0],
          payment_method: 'Sistema',
          status: 'Pago',
          pro: currentUser
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

    // if (proposedStart < now) {
    //     return { available: false, reason: 'Não é possível agendar em datas ou horários passados.' };
    // }

    const { data: blocks } = await supabase
        .from('agenda_blocks')
        .select('*')
        .eq('professional_id', proId)
        .gte('end_at', `${date}T00:00:00`)
        .lte('start_at', `${date}T23:59:59`);

    const hasBlock = blocks?.some(blk => {
        // Parse dates manually to ensure we are comparing local times as they appear visually
        // This avoids timezone issues where the DB might return UTC but the UI shows local
        const bStartStr = blk.start_at.split('T')[1].substring(0, 5);
        const bEndStr = blk.end_at.split('T')[1].substring(0, 5);
        
        // Construct Date objects using the APPOINTMENT date to ensure correct day comparison
        // We assume blocks are for the specific day being checked (or we check overlap with the block's full date if needed)
        // But since we query by day overlap, we need to be careful.
        
        // Better approach: Use the full ISO string but treat it as local time if possible, 
        // OR just trust the string comparison if we are sure about the format.
        
        // Let's stick to the robust full date comparison but correct for the timezone offset issue
        // by creating dates from the string parts explicitly.
        
        const bStartParts = blk.start_at.split(/[-T:]/);
        const bEndParts = blk.end_at.split(/[-T:]/);
        
        const bStart = new Date(Number(bStartParts[0]), Number(bStartParts[1])-1, Number(bStartParts[2]), Number(bStartParts[3]), Number(bStartParts[4]));
        const bEnd = new Date(Number(bEndParts[0]), Number(bEndParts[1])-1, Number(bEndParts[2]), Number(bEndParts[3]), Number(bEndParts[4]));

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

export const getAvailableSlotsForPro = async (proId: string, dateStr: string, serviceDuration: number, excludeAptId?: string): Promise<string[]> => {
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
      
    const appointments = appointmentsData ? appointmentsData
        .map(mapAppointmentFromDB)
        .filter(a => a.professionalId === proId && !['Desmarcou', 'Cancelaram'].includes(a.status) && a.id !== excludeAptId) 
        : [];

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
