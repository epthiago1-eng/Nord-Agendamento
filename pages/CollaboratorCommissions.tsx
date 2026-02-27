
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, Clock, CheckCircle2, DollarSign, 
  Calendar, Loader2, User, Wallet, Filter, Search, Scissors, Box
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, Transaction } from '../data/transactions';
import { db } from '../supabase';

const CollaboratorCommissions: React.FC = () => {
  const navigate = useNavigate();
  const proName = localStorage.getItem('user_name') || '';
  const proId = localStorage.getItem('user_pro_id') || '';

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [commissionConfigs, setCommissionConfigs] = useState<any[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Busca configurações reais e mapeamento de IDs
        if (proId) {
          const [configsRes, servicesRes] = await Promise.all([
            db.professionalServices().select('*').eq('professional_id', proId),
            db.services().select('id, name')
          ]);
          if (configsRes.data) setCommissionConfigs(configsRes.data);
          if (servicesRes.data) {
            const map: Record<string, string> = {};
            servicesRes.data.forEach(s => map[s.name] = s.id);
            setServicesMap(map);
          }
        }

        // 2. Busca transações vinculadas
        const allTrans = await getTransactions();
        const filtered = allTrans.filter(t => 
          t.operation === 'VENDA' && ((proId && t.professional_id === proId) || (!proId && t.pro === proName))
        );
        setTransactions(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [proName, proId]);

  // Cálculo de Comissão Idêntico ao do ADM
  const calculateCommission = (t: Transaction) => {
    // 1. Se houver comissão sobrescrita no banco, usa ela (prioridade máxima)
    if (t.commission_value !== undefined && t.commission_value !== null) {
        return t.commission_type === 'percent' 
            ? t.val * (t.commission_value / 100)
            : t.commission_value;
    }

    // 2. Se já tiver o valor calculado salvo na transação, usa ele (Novo Padrão)
    if (t.commission_amount !== undefined && t.commission_amount !== null) {
        return t.commission_amount;
    }

    // 3. Se for gorjeta, o colaborador recebe 100% integralmente
    if (t.category === 'Gorjeta' || t.type === 'GORJETA') {
        return t.val;
    }

    // 4. Se for OUTROS, retorna 0 (Pendente) a menos que tenha sido sobrescrito acima
    if (t.type === 'OUTROS') {
        return 0;
    }

    // 5. Busca regra específica do serviço/produto
    const serviceId = servicesMap[t.item];
    const config = commissionConfigs.find(c => c.service_id === serviceId);
    
    if (config) {
        return config.commission_type === 'percent' 
            ? t.val * (config.commission_value / 100)
            : config.commission_value;
    }
    
    // 6. Fallback padrão
    const rate = (t.type === 'SERVIÇO' || t.category === 'Serviço') ? 0.4 : 0.1;
    return t.val * rate;
  };

  const processedData = useMemo(() => {
    return transactions.map(t => ({
      ...t,
      commissionValue: calculateCommission(t)
    }));
  }, [transactions, commissionConfigs, servicesMap]);

  const stats = useMemo(() => {
    const pending = processedData.filter(t => !t.commission_paid).reduce((acc, t) => acc + t.commissionValue, 0);
    const paid = processedData.filter(t => t.commission_paid).reduce((acc, t) => acc + t.commissionValue, 0);
    return { pending, paid };
  }, [processedData]);

  const filteredList = useMemo(() => {
    return processedData
      .filter(t => {
        const matchesStatus = activeTab === 'paid' ? t.commission_paid : !t.commission_paid;
        const matchesSearch = t.client_supplier?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             t.item?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [processedData, activeTab, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center pr-8">
            <h1 className="text-lg font-bold tracking-tight">Extrato de Comissões</h1>
            <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">Transparência Garantida</p>
        </div>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pb-24">
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-sm text-center">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Pendente</p>
            <p className="text-xl font-black text-blue-900">R$ {stats.pending.toFixed(2).replace('.', ',')}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-3xl border border-green-100 shadow-sm text-center">
            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Total Recebido</p>
            <p className="text-xl font-black text-green-700">R$ {stats.paid.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>

        <div className="bg-white p-1 rounded-2xl border border-gray-100 flex shadow-sm">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-blue-900 text-white shadow-lg' : 'text-gray-400'}`}
          >
            <Clock size={14} /> Pendentes
          </button>
          <button 
            onClick={() => setActiveTab('paid')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'paid' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400'}`}
          >
            <CheckCircle2 size={14} /> Pagas
          </button>
        </div>

        <div className="relative">
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente ou serviço..."
            className="w-full bg-white border border-gray-100 rounded-2xl py-3 px-11 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-medium shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-blue-900/30">
              <Loader2 className="animate-spin" size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">Carregando dados...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
              <Wallet size={48} className="opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Nenhuma comissão aqui</p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div key={item.id} className={`bg-white p-5 rounded-[2rem] border transition-all ${item.commission_paid ? 'border-green-50' : 'border-gray-50 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${item.commission_paid ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      {item.type === 'PRODUTO' ? <Box size={18} /> : <Scissors size={18} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-800 leading-tight">{item.client_supplier || 'Cliente Avulso'}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                        <Calendar size={10} />
                        {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${item.commission_paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.commission_paid ? 'Paga' : 'Pendente'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-3 border-t border-gray-50">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.type}</p>
                    <p className="text-xs font-bold text-gray-700">{item.item}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Minha Comissão</p>
                    {item.commissionValue === 0 && !item.commission_paid ? (
                        <p className="text-xs font-black text-red-500 uppercase tracking-wider bg-red-50 px-2 py-1 rounded-lg">
                            Pendente (ADM)
                        </p>
                    ) : (
                        <p className={`text-lg font-black ${item.commission_paid ? 'text-green-600' : 'text-blue-900'}`}>
                          R$ {item.commissionValue.toFixed(2).replace('.', ',')}
                        </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorCommissions;
