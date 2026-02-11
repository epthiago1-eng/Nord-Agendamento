
import React from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, Users, CheckCircle, Gift, Rocket, PieChart, BarChart2, TrendingDown, UserX, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const reports = [
  { id: 'financial-summary', label: 'Rendimentos e Pagamentos', sub: 'Bruto, Líquido e Formas de Pagto', icon: TrendingUp, color: 'text-green-500', path: '/reports/financial-summary' },
  { id: 'professionals', label: 'Desempenho de Profissionais', sub: 'Atendimentos e Comissões', icon: Rocket, color: 'text-orange-500', path: '/reports/professionals' },
  { id: 'expenses', label: 'Relatório de Despesas', sub: 'Luz, Comissões e Geral', icon: TrendingDown, color: 'text-red-500', path: '/reports/expenses' },
  { id: 'absent', label: 'Clientes ausentes', sub: 'Não retornou para mais atendimentos', icon: UserX, color: 'text-blue-500', path: '/reports/absent' },
  { id: 'birthdays', label: 'Aniversariantes', sub: 'Dia e mês', icon: Gift, color: 'text-purple-500', path: '/reports/birthdays' },
];

const dataPie = [
  { name: 'Aberto', value: 26, color: '#3b82f6' },
  { name: 'Atendido', value: 7, color: '#22c55e' },
  { name: 'Confirmado', value: 41, color: '#a855f7' },
  { name: 'Outros', value: 26, color: '#94a3b8' },
];

const Reports: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate('/menu')}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Relatórios</h1>
      </header>

      <div className="p-4 space-y-4 pb-24">
        {/* Reports List */}
        <div className="space-y-3">
            {reports.map((r) => (
                <button 
                  key={r.id} 
                  onClick={() => navigate(r.path)}
                  className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className={r.color}>
                            <r.icon size={24} />
                        </div>
                        <div>
                            <h4 className="text-gray-800 font-bold text-sm tracking-tight">{r.label}</h4>
                            <p className="text-gray-400 text-[11px] font-medium">{r.sub}</p>
                        </div>
                    </div>
                    <ChevronRight className="text-gray-300" size={18} />
                </button>
            ))}
        </div>

        {/* Charts Preview Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-4">
            <h3 className="text-center font-bold text-[#1e3a8a] mb-6 uppercase text-[11px] tracking-[0.2em]">Resumo de Atendimentos</h3>
            
            <div className="flex flex-col items-center">
                <div className="w-full h-48 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={dataPie}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {dataPie.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </RePieChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-6 w-full">
                    {dataPie.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-gray-500 text-[11px] font-semibold">{item.name}: <span className="text-gray-900">{item.value}%</span></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
