
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Users, ShoppingBag, ClipboardList, Wallet, Star, Calendar, Filter, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../supabase';

// Mapeamento dos IDs Mockados para o exemplo visual funcionar
// Em produção, isso viria da relação do banco
const SERVICE_IDS_MAPPING: Record<string, string> = {
    'Corte + Barba': '6', 
    'Corte Máquina': '4',
    'Corte Tesoura': '3',
    'Barba': '2',
    'Sobrancelha': '1'
};

const ReportProfessionalPerformance: React.FC = () => {
  const navigate = useNavigate();
  const [expandedProId, setExpandedProId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2026-02-01', end: '2026-02-28' });
  
  const [configs, setConfigs] = useState<any[]>([]);
  const [calculatedData, setCalculatedData] = useState<any[]>([]);

  // 1. Carrega configs do banco ao montar
  useEffect(() => {
    const fetchConfigs = async () => {
        const { data } = await db.professionalServices().select('*');
        if (data) setConfigs(data);
    };
    fetchConfigs();
  }, []);

  // 2. Calcula os dados quando configs mudam (ou dados base)
  useEffect(() => {
    // Helper para pegar taxa do array carregado do banco
    const getCommissionRate = (proId: string, itemName: string) => {
        const serviceId = SERVICE_IDS_MAPPING[itemName];
        
        // Tenta achar a config específica
        const config = configs.find((c: any) => c.professional_id === proId && c.service_id === serviceId);
        
        if (config) {
            return { type: config.commission_type, value: config.commission_value };
        }
        
        return { type: 'percent', value: 40 }; // Padrão se não achar
    };

    // Dados Mockados para Exemplo (Substituir por query de vendas real depois)
    const baseData = [
      {
        id: '1', // ID do Profissional no Banco (Ex: Diego)
        name: 'Diego', 
        avatar: 'https://picsum.photos/seed/diego/100',
        totalAppointments: 42,
        grossProducts: 450.00,
        commProduct: 90.00,
        sales: [
          { id: 's1', client: 'Jhonny', date: '05/02', type: 'Serviço', item: 'Corte + Barba', gross: 60.00 },
          { id: 's2', client: 'Lauan', date: '05/02', type: 'Serviço', item: 'Corte Máquina', gross: 40.00 },
        ]
      },
      {
        id: '2', // Felipe
        name: 'Felipe',
        avatar: 'https://picsum.photos/seed/felipe/100',
        totalAppointments: 38,
        grossProducts: 200.00,
        commProduct: 40.00,
        sales: [
          { id: 's4', client: 'Fernando', date: '05/02', type: 'Serviço', item: 'Corte Tesoura', gross: 55.00 },
        ]
      }
    ];

    // Processamento
    const processed = baseData.map(pro => {
        let grossServices = 0;
        let commService = 0;
        
        const processedSales = pro.sales.map(sale => {
            const rate = getCommissionRate(pro.id, sale.item);
            const commVal = rate.type === 'percent' 
                ? (sale.gross * (rate.value / 100)) 
                : rate.value;
            
            grossServices += sale.gross;
            commService += commVal;

            return { ...sale, comm: commVal };
        });

        return {
            ...pro,
            grossServices,
            commService,
            sales: processedSales
        };
    });

    setCalculatedData(processed);
  }, [configs]);

  // Team Summary calculation
  const teamStats = useMemo(() => {
    return calculatedData.reduce((acc, curr) => ({
      gross: acc.gross + curr.grossServices + curr.grossProducts,
      commission: acc.commission + curr.commService + curr.commProduct,
      appointments: acc.appointments + curr.totalAppointments
    }), { gross: 0, commission: 0, appointments: 0 });
  }, [calculatedData]);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8 tracking-tight">Vendas por Profissional</h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        {/* Date Filter Section */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900">
              <Calendar size={18} />
              <span className="text-xs font-black uppercase tracking-wider">Período Selecionado</span>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-blue-50 text-blue-600 rounded-xl active:scale-95 transition-all"
            >
              <Filter size={18} />
            </button>
          </div>

          {showFilters ? (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Início</label>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2 text-xs font-bold text-gray-700 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Fim</label>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={e => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2 text-xs font-bold text-gray-700 outline-none" 
                />
              </div>
            </div>
          ) : (
            <p className="text-sm font-black text-gray-800 bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-2">
              <span className="text-blue-600">01/02/2026</span>
              <span className="text-gray-300">até</span>
              <span className="text-blue-600">28/02/2026</span>
            </p>
          )}
        </div>

        {/* Team Executive Summary */}
        <div className="bg-[#1e3a8a] p-6 rounded-[2.5rem] text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10"><Users size={120} /></div>
            <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Resumo da Equipe</p>
            <div className="space-y-5">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-blue-200 text-xs font-bold block mb-1">Venda Bruta Total</span>
                  <h2 className="text-3xl font-black">R$ {teamStats.gross.toFixed(2).replace('.', ',')}</h2>
                </div>
                <div className="text-right">
                  <span className="text-blue-200 text-[10px] font-black block mb-1">COMISSÕES (Calc.)</span>
                  <span className="text-lg font-bold text-green-300">R$ {teamStats.commission.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-blue-800/50">
                <div className="flex-1">
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Atendimentos</p>
                  <p className="text-xl font-black">{teamStats.appointments}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Ticket Médio</p>
                  <p className="text-xl font-black">R$ {teamStats.appointments > 0 ? (teamStats.gross / teamStats.appointments).toFixed(2).replace('.', ',') : '0,00'}</p>
                </div>
              </div>
            </div>
        </div>

        {/* Professionals Detailed List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Target size={18} className="text-blue-900" />
            <h3 className="text-gray-900 font-black text-xs uppercase tracking-[0.2em]">Ranking de Performance</h3>
          </div>

          {calculatedData.sort((a, b) => (b.grossServices + b.grossProducts) - (a.grossServices + a.grossProducts)).map((pro) => (
            <div key={pro.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all">
              {/* Pro Main Header */}
              <div 
                onClick={() => setExpandedProId(expandedProId === pro.id ? null : pro.id)}
                className="p-5 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-blue-50">
                    <img src={pro.avatar} alt={pro.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-base leading-tight">{pro.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star className="text-yellow-500 fill-yellow-500" size={10} />
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">{pro.totalAppointments} atendimentos</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 font-black text-lg">R$ {(pro.grossServices + pro.grossProducts).toFixed(2).replace('.', ',')}</p>
                  <p className="text-green-600 text-[9px] font-black uppercase tracking-widest">Venda Bruta</p>
                </div>
              </div>

              {/* Expansion Area */}
              {expandedProId === pro.id && (
                <div className="bg-gray-50/50 border-t border-gray-50 p-5 space-y-6 animate-in slide-in-from-top-2 duration-300">
                  
                  {/* Performance Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Services Column */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-blue-900 px-1">
                        <ClipboardList size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Serviços</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-blue-50 shadow-sm space-y-1">
                        <p className="text-xs text-gray-400 font-bold">Venda</p>
                        <p className="text-sm font-black text-gray-800">R$ {pro.grossServices.toFixed(2).replace('.', ',')}</p>
                        <div className="pt-2 border-t border-gray-50 mt-1">
                          <p className="text-[9px] text-green-600 font-black uppercase">Comis: R$ {pro.commService.toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Products Column */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-orange-600 px-1">
                        <ShoppingBag size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Produtos</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-orange-50 shadow-sm space-y-1">
                        <p className="text-xs text-gray-400 font-bold">Venda</p>
                        <p className="text-sm font-black text-gray-800">R$ {pro.grossProducts.toFixed(2).replace('.', ',')}</p>
                        <div className="pt-2 border-t border-gray-50 mt-1">
                          <p className="text-[9px] text-green-600 font-black uppercase">Comis: R$ {pro.commProduct.toFixed(2).replace('.', ',')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profit Summary for Pro */}
                  <div className="bg-blue-900 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-800 p-2 rounded-xl text-blue-200">
                        <Wallet size={18} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Comissão Total</span>
                    </div>
                    <span className="text-lg font-black">R$ {(pro.commService + pro.commProduct).toFixed(2).replace('.', ',')}</span>
                  </div>

                  {/* List of Sales */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Detalhes das Vendas</p>
                    {pro.sales.length === 0 ? (
                      <p className="text-center py-4 text-xs italic text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">Sem registros detalhados.</p>
                    ) : (
                      pro.sales.map((sale: any) => (
                        <div key={sale.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sale.type === 'Produto' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-600'}`}>
                              {sale.type === 'Produto' ? <ShoppingBag size={16} /> : <ClipboardList size={16} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-black uppercase">{sale.date}</span>
                                <h4 className="text-xs font-black text-gray-800 tracking-tight">{sale.client}</h4>
                              </div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[120px]">{sale.item}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-gray-900">R$ {sale.gross.toFixed(2).replace('.', ',')}</p>
                            <p className="text-green-600 text-[9px] font-bold">C: R$ {sale.comm.toFixed(2).replace('.', ',')}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportProfessionalPerformance;
