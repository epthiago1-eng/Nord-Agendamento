
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Search, Trash2, DollarSign, Plus, Percent, Settings2, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../supabase';

const ProfessionalServices: React.FC = () => {
  const navigate = useNavigate();
  const { id: proId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Lista mestra de serviços (vinda do banco)
  const [allServices, setAllServices] = useState<any[]>([]);
  // Configurações vinculadas a este profissional (vinda do banco professional_services)
  const [linkedConfigs, setLinkedConfigs] = useState<any[]>([]);

  // Carrega dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Busca todos os serviços disponíveis
        const { data: servicesData } = await db.services().select('*').order('name');
        setAllServices(servicesData || []);

        // 2. Busca as configurações já salvas para este profissional
        if (proId) {
          const { data: configData } = await db.professionalServices()
            .select('*')
            .eq('professional_id', proId);
          setLinkedConfigs(configData || []);
        }
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [proId]);

  // Filtra a lista master baseada na busca
  const filteredMasterList = useMemo(() => {
    return allServices.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, allServices]);

  // Separa em duas listas: Selecionados e Disponíveis
  const { selected, available } = useMemo(() => {
    const selectedIds = new Set(linkedConfigs.map(l => l.service_id));
    
    // Mapeia os serviços selecionados mesclando com a config do banco
    const selectedList = filteredMasterList
      .filter(s => selectedIds.has(s.id))
      .map(s => {
        const config = linkedConfigs.find(l => l.service_id === s.id);
        return { ...s, config };
      });

    // Mapeia os disponíveis (que não estão na lista de IDs selecionados)
    const availableList = filteredMasterList.filter(s => !selectedIds.has(s.id));

    return { selected: selectedList, available: availableList };
  }, [filteredMasterList, linkedConfigs]);

  const handleAddService = async (serviceId: string) => {
    if (!proId) return;

    // Verificação de Duplicidade no Estado Local
    if (linkedConfigs.some(lc => lc.service_id === serviceId)) {
        alert('Este serviço já está vinculado a este profissional.');
        return;
    }

    // Adiciona no banco com padrão (50%)
    const newConfig = { 
        professional_id: proId,
        service_id: serviceId, 
        commission_type: 'percent', 
        commission_value: 50 
    };

    try {
        const { data, error } = await db.professionalServices().insert(newConfig).select().single();
        if (error) throw error;
        
        // Atualiza estado local
        setLinkedConfigs(prev => [...prev, data]);
    } catch (err) {
        console.error('Erro ao adicionar serviço:', err);
        alert('Erro ao vincular serviço.');
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!proId) return;
    
    // Tenta encontrar o ID da linha de configuração para exclusão segura
    const configToDelete = linkedConfigs.find(l => l.service_id === serviceId);
    
    if (confirm('Remover este serviço do profissional?')) {
      try {
        let error;
        
        if (configToDelete && configToDelete.id) {
            // Delete by Primary Key (Safer)
            const res = await db.professionalServices().delete().eq('id', configToDelete.id);
            error = res.error;
        } else {
            // Fallback: Delete by Composite Key
            const res = await db.professionalServices()
                .delete()
                .eq('professional_id', proId)
                .eq('service_id', serviceId);
            error = res.error;
        }
        
        if (error) throw error;

        setLinkedConfigs(prev => prev.filter(l => l.service_id !== serviceId));
      } catch (err: any) {
        console.error('Erro ao remover:', err);
        alert('Erro ao remover serviço: ' + err.message);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium tracking-tight pr-8">
          Serviços do Profissional
        </h1>
      </header>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-24">
        {/* Barra de Busca */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 sticky top-0 z-10">
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar serviço..." 
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 pr-10 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 text-sm font-medium"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-900" /></div>
        ) : (
            <>
                {/* SEÇÃO 1: SERVIÇOS SELECIONADOS */}
                <div>
                    <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-3 pl-1 flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        Habilitados ({selected.length})
                    </h3>
                    
                    {selected.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-xs italic">Nenhum serviço vinculado.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selected.map((service) => (
                                <div key={service.id} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-[3rem] -mr-8 -mt-8 z-0"></div>
                                    
                                    <div className="flex justify-between items-start z-10">
                                        <div>
                                            <h4 className="text-gray-900 font-bold text-sm">{service.name}</h4>
                                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wide">Preço Base: R$ {service.price?.toFixed(2)},00</p>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveService(service.id)}
                                            className="text-red-400 p-1.5 bg-red-50 rounded-lg active:scale-90 transition-transform"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Área da Comissão - Destaque Visual */}
                                    <div className="flex items-center gap-2 mt-1 z-10">
                                        <div className="flex-1 bg-gray-50 rounded-xl p-2.5 flex items-center justify-between border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md ${service.config?.commission_type === 'percent' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                                    {service.config?.commission_type === 'percent' ? <Percent size={12} /> : <DollarSign size={12} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase leading-none">Comissão</span>
                                                    <span className="text-[10px] text-gray-800 font-black leading-tight">
                                                        {service.config?.commission_type === 'percent' 
                                                            ? `R$ ${(service.price * (service.config.commission_value / 100)).toFixed(2)}` 
                                                            : 'Fixo'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xl font-black text-blue-900 tracking-tight">
                                                {service.config?.commission_type === 'percent' ? `${service.config.commission_value}%` : `R$ ${service.config?.commission_value},00`}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => navigate(`/professionals/commission/${proId}/${service.id}`, { state: { serviceName: service.name } })}
                                            className="bg-blue-900 text-white p-3 rounded-xl active:scale-90 transition-transform shadow-md"
                                        >
                                            <Settings2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SEÇÃO 2: SERVIÇOS DISPONÍVEIS */}
                <div className="pt-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pl-1">
                        Disponíveis para Adicionar
                    </h3>
                    
                    <div className="space-y-2">
                        {available.map((service) => (
                            <div key={service.id} className="bg-white p-4 rounded-2xl border border-gray-50 flex items-center justify-between group active:bg-gray-50 transition-colors">
                                <div>
                                    <h4 className="text-gray-700 font-medium text-sm">{service.name}</h4>
                                    <p className="text-gray-400 text-[10px]">R$ {service.price?.toFixed(2)},00</p>
                                </div>
                                <button 
                                    onClick={() => handleAddService(service.id)}
                                    className="bg-gray-100 text-gray-400 p-2 rounded-xl group-hover:bg-green-50 group-hover:text-green-600 transition-colors shadow-sm"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ProfessionalServices;
