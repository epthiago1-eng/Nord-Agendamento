
import { supabase, db } from '../supabase';
import { AppNotification } from '../types';

const getUserContext = () => {
  return {
    role: localStorage.getItem('user_role'),
    proId: localStorage.getItem('user_pro_id')
  };
};

export const getNotifications = async (): Promise<AppNotification[]> => {
  const { role, proId } = getUserContext();
  
  let query = db.notifications()
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  // Se for COLABORADOR, só vê o que for direcionado a ele (recipient_pro_id)
  if (role === 'COLLABORATOR' && proId) {
    query = query.eq('recipient_pro_id', proId);
  }
  // Se for ADMIN, não aplica filtro (vê tudo), garantindo a visão completa solicitada
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
};

export const getUnreadCount = async (): Promise<number> => {
  const { role, proId } = getUserContext();

  let query = db.notifications()
    .select('*', { count: 'exact', head: true })
    .eq('read', false);
  
  // Filtro de visibilidade para o colaborador
  if (role === 'COLLABORATOR' && proId) {
    query = query.eq('recipient_pro_id', proId);
  }

  const { count, error } = await query;
  
  if (error) return 0;
  return count || 0;
};

export const markAsRead = async (id: string) => {
  await db.notifications().update({ read: true }).eq('id', id);
};

export const markAllAsRead = async () => {
  const { role, proId } = getUserContext();
  
  let query = db.notifications().update({ read: true }).eq('read', false);
  
  if (role === 'COLLABORATOR' && proId) {
    query = query.eq('recipient_pro_id', proId);
  }

  await query;
};

export const addNotification = async (notification: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => {
  // recipient_pro_id nulo = visível apenas para Admin.
  // recipient_pro_id preenchido = visível para Admin e para o Colaborador dono do ID.
  await db.notifications().insert(notification);
};

export const checkOverdueBills = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: overdueBills } = await db.bills()
    .select('*')
    .eq('status', 'PENDING')
    .lt('due_date', today);

  if (!overdueBills || overdueBills.length === 0) return;

  for (const bill of overdueBills) {
    const { data: existing } = await db.notifications()
        .select('id')
        .eq('type', 'FINANCEIRO')
        .contains('metadata', { bill_id: bill.id })
        .limit(1);

    if (!existing || existing.length === 0) {
        await addNotification({
            type: 'FINANCEIRO',
            title: '⚠️ Conta em Atraso',
            message: `A conta "${bill.description}" de R$ ${bill.value.toFixed(2)} venceu em ${new Date(bill.due_date).toLocaleDateString('pt-BR')}.`,
            link: `/bills/edit/${bill.id}`,
            metadata: { bill_id: bill.id }
        });
    }
  }
};
