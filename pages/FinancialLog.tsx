
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Search, Filter, FileSpreadsheet, X, 
  ShoppingBag, ClipboardList, Tag, User, ArrowUp, ArrowDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, Transaction, deleteTransaction } from '../data/transactions';

const FinancialLog: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    getTransactions().then(setTransactions);
    const handleUpdate = () => { getTransactions().then(setTransactions); };
    window.addEventListener('transaction_added', handleUpdate);
    return () => window.removeEventListener('transaction_added', handleUpdate);
  }, []);

  const filteredData = useMemo(() => {
    return transactions.filter(t => 
      (t.item || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.client_supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, transactions]);

  // Função para exportar CSV idêntico à planilha solicitada
  const exportToExcel = () => {
    const headers = ['DATA', 'OPERAÇÃO', 'TIPO', 'COD', 'DESCRIÇÃO', 'VR VENDA', 'VR CUSTO', 'QTD', 'TOTAL', 'CLIENTE/FORNEC', 'FORMA PAG.'];
    const csvContent = [
      headers.join(';'),
      ...filteredData.map(t => [
        t.date ? t.date.split('-').reverse().join('/') : '',
        t.operation,
        t.type,
        t.code || '',
        t.item,
        (t.unit_price || 0).toFixed(2).replace('.', ','),
        (t.cost_value || 0).toFixed(2).replace('.', ','),
        t.quantity || 1,
        (t.total_value || t.val).toFixed(2).replace('.', ','),
        t.client_supplier || '',
        t.payment_method
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `movimentacoes_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const formatDate = (dateStr?: string) => {
      if (!dateStr) return '--/--/----';
      return dateStr.split('-').reverse().join('/');
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform"><ChevronLeft size={24} /></button>
        <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-tight">Movimentações</h1>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Entradas e Saídas</span>
        </div>
        <button onClick={exportToExcel} className="p-2 bg-blue-800 rounded-xl active:scale-90 border border-blue-700">
          <FileSpreadsheet size={22} />
        </button>
      </header>

      <div className="p-2 space-y-4 overflow-y-auto flex-1 pb-24">
        {/* Search Bar */}
        <div className="px-2">
            <div className="relative">
                <input 
                type="text" 
                placeholder="Buscar por item, código ou cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-11 outline-none focus:ring-1 focus:ring-blue-900 text-sm font-medium shadow-sm"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
        </div>

        {/* Table View like Excel Rows */}
        <div className="space-y-2">
          {filteredData.map((t) => (
            <div key={t.id} className="bg-white mx-2 p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
              {/* Left Stripe Indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${t.operation_type === 'SAÍDA' ? 'bg-red-500' : 'bg-green-500'}`} />
              
              <div className="pl-3 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md uppercase tracking-tight">{t.code || '---'}</span>
                        <h4 className="text-xs font-black text-gray-900 uppercase truncate max-w-[180px]">{t.item}</h4>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                          t.payment_account === 'CASH' ? 'bg-green-100 text-green-700' :
                          t.payment_account === 'PIX' ? 'bg-blue-100 text-blue-700' :
                          t.payment_account === 'CARD' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {t.payment_account || '---'}
                        </span>
                    </div>
                    <p className="text-[10px] font-medium text-gray-400 uppercase flex items-center gap-1">
                        {formatDate(t.date)} • {t.type} • {t.client_supplier || 'Balcão'}
                    </p>
                </div>
                <div className="text-right">
                    <p className={`text-sm font-black ${t.operation_type === 'SAÍDA' ? 'text-red-500' : 'text-green-600'}`}>
                        {t.operation_type === 'SAÍDA' ? '-' : '+'} R$ {Math.abs(t.total_value || t.val).toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-[9px] font-bold text-gray-300 uppercase">{t.quantity} un.</p>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="pl-3 pt-2 border-t border-gray-50 flex justify-between items-center">
                 <span className="text-[9px] font-bold text-blue-900 uppercase bg-blue-50 px-2 py-0.5 rounded">{t.payment_method}</span>
                 <button onClick={() => { if(confirm('Excluir registro?')) deleteTransaction(t.id); }} className="text-[9px] font-black text-red-300 uppercase hover:text-red-500">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialLog;
