
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, TrendingDown, Lightbulb, UserCheck, Settings, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, fetchAllPages } from '../supabase';

const ReportExpenseDetails: React.FC = () => {
  const navigate = useNavigate();
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // Despesas são gravadas com operation: 'COMPRA' (esse campo nunca vale
        // 'DESPESA' em lugar nenhum do app — o filtro antigo não batia com
        // nada e a tela ficava sempre vazia). Também pagina: um mês com muitas
        // despesas pode passar de 1000 linhas e ser cortado silenciosamente.
        const transactions = await fetchAllPages<any>((from, to) =>
          db.transactions()
            .select('*')
            .eq('operation', 'COMPRA')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth)
            .range(from, to)
        );

        if (!transactions) return;

        const catMap: Record<string, { name: string, icon: any, total: number, items: any[] }> = {
          'Fixo': { name: 'Contas Fixas', icon: Lightbulb, total: 0, items: [] },
          'Variável': { name: 'Contas Variáveis', icon: Settings, total: 0, items: [] },
          'Pessoal': { name: 'Pessoal / Comissões', icon: UserCheck, total: 0, items: [] },
          'Outros': { name: 'Outras Despesas', icon: FileText, total: 0, items: [] }
        };

        let total = 0;
        transactions.forEach(t => {
          const val = Math.abs(t.val);
          total += val;
          
          let catKey = t.category || 'Outros';
          if (!catMap[catKey]) {
            catMap[catKey] = { name: catKey, icon: FileText, total: 0, items: [] };
          }
          
          catMap[catKey].total += val;
          catMap[catKey].items.push({
            id: t.id,
            desc: t.item,
            date: t.date.split('-').reverse().slice(0, 2).join('/'),
            val: val
          });
        });

        const sortedCats = Object.entries(catMap)
          .filter(([_, data]) => data.items.length > 0)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.total - a.total);

        setCategories(sortedCats);
        setTotalExpense(total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#fcfaff]">
        <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
          <button onClick={() => navigate(-1)} className="p-1"><ChevronLeft size={24} /></button>
          <h1 className="flex-1 text-center text-lg font-medium mr-8">Relatório de Despesas</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-900" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Relatório de Despesas</h1>
      </header>

      <div className="p-4 space-y-4 overflow-y-auto pb-24">
        <div className="flex justify-center mb-4">
            <button className="bg-white px-5 py-2 rounded-full border border-gray-100 text-xs font-bold text-blue-900 shadow-sm uppercase tracking-wider">
                {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </button>
        </div>

        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex flex-col items-center mb-6">
            <TrendingDown className="text-red-500 mb-2" size={32} />
            <span className="text-red-800 text-[11px] font-bold uppercase tracking-widest">Gasto Total do Mês</span>
            <span className="text-3xl font-black text-red-600">R$ {totalExpense.toFixed(2).replace('.', ',')}</span>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-100 text-gray-400 text-xs font-bold uppercase">Nenhuma despesa registrada no mês</div>
        ) : categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
            <div 
              onClick={() => setExpandedCatId(expandedCatId === cat.id ? null : cat.id)}
              className="p-5 flex items-center justify-between cursor-pointer active:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600">
                  <cat.icon size={22} />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold text-sm tracking-tight">{cat.name}</h3>
                  <p className="text-gray-400 text-[10px] font-bold uppercase">{cat.items.length} lançamentos</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-500 font-black text-sm">R$ {cat.total.toFixed(2).replace('.', ',')}</span>
                <div className="text-gray-300">
                    {expandedCatId === cat.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>

            {expandedCatId === cat.id && (
              <div className="bg-gray-50/50 px-5 pb-5 pt-1 border-t border-gray-50 space-y-3">
                {cat.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                        <FileText size={14} className="text-gray-300" />
                        <div>
                            <p className="text-gray-700 font-bold text-xs">{item.desc}</p>
                            <p className="text-gray-400 text-[10px]">{item.date}</p>
                        </div>
                    </div>
                    <span className="text-gray-900 font-bold text-xs">R$ {item.val.toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportExpenseDetails;
