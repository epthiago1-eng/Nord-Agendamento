
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Search, Filter, FileSpreadsheet, X, 
  ShoppingBag, ClipboardList, Tag, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, Transaction, deleteTransaction } from '../data/transactions';

const FinancialLog: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions());
  
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'income' | 'expense',
    category: 'all' as string,
    pro: 'all' as string
  });

  useEffect(() => {
    const handleUpdate = () => setTransactions(getTransactions());
    window.addEventListener('transaction_added', handleUpdate);
    return () => window.removeEventListener('transaction_added', handleUpdate);
  }, []);

  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.item.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filters.type === 'all' || t.type === filters.type;
      const matchesCategory = filters.category === 'all' || t.category === filters.category;
      const matchesPro = filters.pro === 'all' || t.pro === filters.pro;
      return matchesSearch && matchesType && matchesCategory && matchesPro;
    });
  }, [searchTerm, filters, transactions]);

  const exportToExcel = () => {
    const headers = ['Data', 'Item', 'Categoria', 'Profissional', 'Valor', 'Meio', 'Status'];
    const csvContent = [
      headers.join(';'),
      ...filteredData.map(t => [t.date, t.item, t.category, t.pro, t.val.toFixed(2), t.method, t.status].join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_nord_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight">Log de Movimentações</h1>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Total: {filteredData.length} registros</span>
        </div>
        <button onClick={exportToExcel} className="p-2 bg-blue-800 rounded-xl active:scale-90 border border-blue-700">
          <FileSpreadsheet size={22} />
        </button>
      </header>

      <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-24">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Buscar item..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 px-11 outline-none focus:ring-2 focus:ring-blue-100 text-sm font-medium shadow-sm transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
          <button onClick={() => setShowFilterModal(true)} className="p-3.5 rounded-2xl border bg-white text-blue-900 border-gray-100 shadow-sm">
            <Filter size={22} />
          </button>
        </div>

        <div className="space-y-3">
          {filteredData.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl border border-gray-50 shadow-sm p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {t.category === 'Serviço' ? <ClipboardList size={18} /> : t.category === 'Produto' ? <ShoppingBag size={18} /> : <Tag size={18} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 truncate">{t.item}</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">{t.date} • {t.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>R$ {Math.abs(t.val).toFixed(2).replace('.', ',')}</p>
                  <p className="text-[8px] font-black uppercase text-gray-400">{t.method}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <User size={10} className="text-gray-300" />
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{t.pro}</span>
                </div>
                <button onClick={() => { if(confirm('Excluir?')) deleteTransaction(t.id); }} className="text-[8px] font-black text-red-400 uppercase underline">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialLog;
