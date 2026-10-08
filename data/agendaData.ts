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

export const getSettings = async (): Promise<EstablishmentSettings & { id?: number }> => {
  const { data, error } = await supabase
    .from('settings')
    .select('id, primary_color, secondary_color, name, logo_url, slot_interval, cash_balance, bank_balance, pix_balance, card_balance')
    .single();

  if (error || !data) {
    return {
      primaryColor: '#1e3a8a',
      secondaryColor: '#000000',
      name: 'Nord Barbershop',
      logoUrl: '',
      slotInterval: 15,
      cash_balance: 0,
      bank_balance: 0,
      pix_balance: 0,
      card_balance: 0
    };
  }

  return {
      id: data.id,
      primaryColor: data.primary_color || '#1e3a8a',
      secondaryColor: data.secondary_color || '#000000',
      name: data.name || 'Nord Barbershop',
      logoUrl: data.logo_url || '',
      slotInterval: data.slot_interval || 15,
      cash_balance: data.cash_balance || 0,
      bank_balance: data.bank_balance || 0,
      pix_balance: data.pix_balance || 0,
      card_balance: data.card_balance || 0
  };
};

export const saveSettings = async (settings: EstablishmentSettings & { id?: number }) => {
  // BANCO: table 'settings' usa snake_case
  const payload = {
      id: settings.id || 1, 
      primary_color: settings.primaryColor,
      secondary_color: settings.secondaryColor,
      name: settings.name,
      logo_url: settings.logoUrl,
      slot_interval: settings.slotInterval,
      cash_balance: settings.cash_balance || 0,
      bank_balance: settings.bank_balance || 0,
      pix_balance: settings.pix_balance || 0,
      card_balance: settings.card_balance || 0
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
const mapAppointmentFromDB = (data: any): Appointment => {
    let observation = data.observation;
    let payments = data.payments || [];
    let others_value = data.others_value !== undefined ? data.others_value : data.othersValue;
    let others_description = data.others_description !== undefined ? data.others_description : data.othersDescription;
    let discount_value = data.discount_value !== undefined ? data.discount_value : data.discountValue;
    let tip_value = data.tip_value !== undefined ? data.tip_value : data.tipValue;

    // Workaround para colunas ausentes: verifica se há metadados JSON na observação
    if (observation && observation.startsWith('{"_metadata":')) {
        try {
            const metadata = JSON.parse(observation);
            if (metadata.payments) payments = metadata.payments;
            if (metadata.others_value !== undefined) others_value = metadata.others_value;
            if (metadata.others_description !== undefined) others_description = metadata.others_description;
            if (metadata.discount_value !== undefined) discount_value = metadata.discount_value;
            if (metadata.tip_value !== undefined) tip_value = metadata.tip_value;
            observation = metadata.note || '';
        } catch (e) {
            console.error("Erro ao parsear metadados da observação:", e);
        }
    }

    return {
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
        others_value: others_value || 0,
        others_description: others_description || null,
        discount_value: discount_value || 0,
        tip_value: tip_value || 0,
        payment_method: data.payment_method || data.paymentMethod,
        payments: payments,
        observation: observation
    };
};

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
  // WORKAROUND: Empacota campos possivelmente ausentes na observação como JSON
  const metadata = {
      _metadata: true,
      payments: apt.payments || [],
      others_value: (apt as any).others_value || 0,
      others_description: (apt as any).others_description || null,
      discount_value: (apt as any).discount_value || 0,
      tip_value: (apt as any).tip_value || 0,
      note: apt.observation || ''
  };

  const payload: any = {
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
      payment_method: apt.payment_method || null,
      observation: JSON.stringify(metadata)
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
  // Validação de disponibilidade antes de qualquer alteração de data/hora/profissional
  if (data.date && data.time && data.professionalId) {
      const duration = data.duration || 30;
      const availability = await checkAvailability(data.professionalId, data.date, data.time, duration, id);
      if (!availability.available) {
          throw new Error(availability.reason || 'Horário indisponível para agendamento.');
      }
  }

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
  if (data.totalValue !== undefined) payload.total_value = data.totalValue;
  if (data.payment_method !== undefined) payload.payment_method = data.payment_method;
  if (data.services) payload.services = data.services;
  if (data.products) payload.products = data.products;

  // Se houver campos de checkout ou observação, precisamos atualizar o JSON na observação
  if (
      data.observation !== undefined || 
      data.payments !== undefined || 
      (data as any).others_value !== undefined || 
      (data as any).discount_value !== undefined || 
      (data as any).tip_value !== undefined
  ) {
      // Busca o agendamento atual para preservar outros campos do metadado
      const { data: current } = await supabase.from('appointments').select('observation, others_value, discount_value, tip_value, payments, others_description').eq('id', id).single();
      
      let currentMetadata: any = {
          _metadata: true,
          payments: [],
          others_value: 0,
          others_description: null,
          discount_value: 0,
          tip_value: 0,
          note: ''
      };

      if (current?.observation && current.observation.startsWith('{"_metadata":')) {
          try {
              currentMetadata = JSON.parse(current.observation);
          } catch(e) {}
      } else {
          // Fallback para colunas reais se existirem (caso o banco tenha sido atualizado parcialmente)
          currentMetadata.payments = current?.payments || [];
          currentMetadata.others_value = current?.others_value || 0;
          currentMetadata.others_description = current?.others_description || null;
          currentMetadata.discount_value = current?.discount_value || 0;
          currentMetadata.tip_value = current?.tip_value || 0;
          currentMetadata.note = current?.observation || '';
      }

      // Merge com novos dados
      if (data.payments !== undefined) currentMetadata.payments = data.payments;
      if ((data as any).others_value !== undefined) currentMetadata.others_value = (data as any).others_value;
      if ((data as any).others_description !== undefined) currentMetadata.others_description = (data as any).others_description;
      if ((data as any).discount_value !== undefined) currentMetadata.discount_value = (data as any).discount_value;
      if ((data as any).tip_value !== undefined) currentMetadata.tip_value = (data as any).tip_value;
      if (data.observation !== undefined) currentMetadata.note = data.observation;

      payload.observation = JSON.stringify(currentMetadata);
  }

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
      // Ao excluir as transações, o trigger no banco cuidará de estornar os saldos no settings
      const { error: transError } = await supabase.from('transactions').delete().eq('appointment_id', id);
      if (transError) {
          console.error('Erro ao excluir transações do agendamento:', transError);
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

// Helper para converter strings de data/hora mantendo a hora literal e evitando distorção de fuso horário (UTC vs Local)
export const parseVisualDateTime = (val: string): Date => {
  if (!val) return new Date();
  const clean = val.replace('Z', '');
  const parts = clean.split(/[-T:\s+]/);
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const hour = Number(parts[3] || 0);
  const minute = Number(parts[4] || 0);
  return new Date(year, month, day, hour, minute, 0, 0);
};

export const checkAvailability = async (
    proId: string, 
    date: string, 
    time: string, 
    duration: number, 
    excludeAptId?: string
): Promise<{ available: boolean, reason?: string }> => {
    
    const now = new Date();
    const proposedStart = parseVisualDateTime(`${date}T${time}`);
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);

    if (proposedStart < now) {
        return { available: false, reason: 'Não é possível agendar em datas ou horários passados.' };
    }

    // 1. Verificar bloqueios da agenda (busca ampla com margem de 1 dia para cobrir fusos e multi-dias)
    const [y, m, d] = date.split('-').map(Number);
    const prevDateObj = new Date(y, m - 1, d - 1);
    const nextDateObj = new Date(y, m - 1, d + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const prevDateStr = `${prevDateObj.getFullYear()}-${pad(prevDateObj.getMonth() + 1)}-${pad(prevDateObj.getDate())}`;
    const nextDateStr = `${nextDateObj.getFullYear()}-${pad(nextDateObj.getMonth() + 1)}-${pad(nextDateObj.getDate())}`;

    const { data: blocks } = await supabase
        .from('agenda_blocks')
        .select('*')
        .eq('professional_id', proId)
        .gte('end_at', `${prevDateStr}T00:00:00`)
        .lte('start_at', `${nextDateStr}T23:59:59`);

    const hasBlock = (blocks || []).some(blk => {
        const bStart = parseVisualDateTime(blk.start_at);
        const bEnd = parseVisualDateTime(blk.end_at);
        return (proposedStart < bEnd && proposedEnd > bStart);
    });

    if (hasBlock) {
        return { available: false, reason: 'Horário bloqueado pelo profissional.' };
    }

    // 2. Busca agendamentos do dia (busca genérica para filtrar no JS e evitar erro de coluna)
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
            const aptStart = parseVisualDateTime(`${apt.date}T${apt.time}`);
            const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000);
            
            return (proposedStart < aptEnd && proposedEnd > aptStart);
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
    
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
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

    const prevDateObj = new Date(y, m - 1, d - 1);
    const nextDateObj = new Date(y, m - 1, d + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const prevDateStr = `${prevDateObj.getFullYear()}-${pad(prevDateObj.getMonth() + 1)}-${pad(prevDateObj.getDate())}`;
    const nextDateStr = `${nextDateObj.getFullYear()}-${pad(nextDateObj.getMonth() + 1)}-${pad(nextDateObj.getDate())}`;

    const { data: blocks } = await supabase
      .from('agenda_blocks')
      .select('*')
      .eq('professional_id', proId)
      .gte('end_at', `${prevDateStr}T00:00:00`)
      .lte('start_at', `${nextDateStr}T23:59:59`);

    const parsedBlocks = (blocks || []).map(b => ({
      start: parseVisualDateTime(b.start_at),
      end: parseVisualDateTime(b.end_at)
    }));

    const parsedAppointments = appointments.map(apt => {
      const aptStart = parseVisualDateTime(`${apt.date}T${apt.time}`);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000);
      return { start: aptStart, end: aptEnd };
    });

    const now = new Date();
    const availableSlots: string[] = [];

    attendanceHours.forEach(range => {
        const [startH, startM] = range.start_time.split(':').map(Number);
        const [endH, endM] = range.end_time.split(':').map(Number);
        
        const rangeStartMinutes = startH * 60 + startM;
        const rangeEndMinutes = endH * 60 + endM;

        for (let currentMinutes = rangeStartMinutes; currentMinutes < rangeEndMinutes; currentMinutes += interval) {
            const h = Math.floor(currentMinutes / 60);
            const min = currentMinutes % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            
            const slotStart = parseVisualDateTime(`${dateStr}T${timeStr}`);
            const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

            // Não exibir horários que já passaram hoje
            if (slotStart <= now) continue;

            // Não permitir que o serviço termine após o horário de atendimento
            const slotEndMinutes = currentMinutes + serviceDuration;
            if (slotEndMinutes > rangeEndMinutes) continue;

            // Conflito com agendamentos
            const hasAptConflict = parsedAppointments.some(apt => 
                (slotStart < apt.end && slotEnd > apt.start)
            );
            if (hasAptConflict) continue;

            // Conflito com bloqueios da agenda (mesma regra do checkAvailability)
            const hasBlockConflict = parsedBlocks.some(blk => 
                (slotStart < blk.end && slotEnd > blk.start)
            );
            if (hasBlockConflict) continue;

            availableSlots.push(timeStr);
        }
    });

    return Array.from(new Set(availableSlots)).sort();
};
