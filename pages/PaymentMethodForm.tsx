
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { db } from '../supabase';

const PaymentMethodForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const editData = location.state?.method;

  const [formData, setFormData] = useState({
    name: '',
    enableTax: false,
    taxValue: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        // Mapeia colunas snake_case do banco para camelCase do form
        enableTax: editData.enable_tax || false, 
        taxValue: editData.tax_rate ? String(editData.tax_rate).replace('.', ',') : ''
      });
    }
  }, [editData]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('O nome da forma de pagamento é obrigatório.');
      return;
    }

    setLoading(true);

    const payload = {
        name: formData.name,
        enable_tax: formData.enableTax,
        tax_rate: formData.enableTax ? (parseFloat(formData.taxValue.replace(',', '.')) || 0) : 0
    };

    try {
        if (id) {
            const { error } = await db.paymentMethods().update(payload).eq('id', id);
            if(error) throw error;
        } else {
            const { error } = await db.paymentMethods().insert(payload);
            if(error) throw error;
        }

        alert('Forma de pagamento salva com sucesso!');
        navigate('/payment-methods');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar no banco de dados.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">
            {id ? 'Editar Pagamento' : 'Novo Pagamento'}
        </h1>
      </header>

      <div className="p-4 space-y-5 overflow-y-auto flex-1 bg-white">
        {/* Nome */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5 tracking-tight">Nome da Forma</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Ex: Cartão Master Crédito" 
            className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm text-gray-700 font-bold transition-all"
          />
        </div>

        {/* Habilitar Taxa Toggle */}
        <div className="flex items-center gap-4 py-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <button 
                type="button"
                onClick={() => setFormData({...formData, enableTax: !formData.enableTax})}
                className={`w-14 h-7 rounded-full relative transition-colors duration-200 shadow-inner ${formData.enableTax ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${formData.enableTax ? 'translate-x-7' : ''}`} />
            </button>
            <span className="text-gray-700 text-sm font-bold">Habilitar taxa administrativa</span>
        </div>

        {/* Taxa Field */}
        <div className={`transition-all duration-300 ${formData.enableTax ? 'opacity-100 max-h-40' : 'opacity-50 max-h-40 grayscale'}`}>
          <label className="text-sm font-medium text-gray-700 block mb-1.5 tracking-tight">Valor da Taxa (%)</label>
          <div className="relative">
            <input 
                type="text" 
                value={formData.taxValue}
                onChange={(e) => setFormData({...formData, taxValue: e.target.value})}
                placeholder="Ex: 4,5" 
                disabled={!formData.enableTax}
                className={`w-full border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm transition-all text-gray-700 font-black text-lg ${
                    !formData.enableTax ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                }`}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 px-1">Esta taxa será descontada apenas nos relatórios de faturamento líquido.</p>
        </div>

        {/* Save Button */}
        <button 
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-[#1e3a8a] text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-sm mt-8 mb-6 flex items-center justify-center gap-2"
        >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                    <Save size={18} />
                    Salvar Dados
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodForm;
