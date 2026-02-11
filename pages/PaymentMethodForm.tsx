
import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

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

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        enableTax: editData.enableTax || false,
        taxValue: editData.taxValue || ''
      });
    }
  }, [editData]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('O nome da forma de pagamento é obrigatório.');
      return;
    }
    // Simulação de salvamento
    alert('Forma de pagamento salva com sucesso!');
    navigate('/payment-methods');
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Cadastro Forma de Pagamento</h1>
      </header>

      <div className="p-4 space-y-5 overflow-y-auto flex-1 bg-white">
        {/* Nome */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5 tracking-tight">Nome</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Digitar..." 
            className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm text-gray-700 transition-all"
          />
        </div>

        {/* Habilitar Taxa Toggle */}
        <div className="flex items-center gap-4 py-2">
            <button 
                type="button"
                onClick={() => setFormData({...formData, enableTax: !formData.enableTax})}
                className={`w-14 h-7 rounded-full relative transition-colors duration-200 shadow-inner ${formData.enableTax ? 'bg-gray-500' : 'bg-gray-300'}`}
            >
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${formData.enableTax ? 'translate-x-7' : ''}`} />
            </button>
            <span className="text-gray-700 text-sm font-medium">Habilitar taxa</span>
        </div>

        {/* Taxa Field (Always visible but styled disabled if toggle off as per reference image hint) */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5 tracking-tight">Taxa</label>
          <div className="relative">
            <input 
                type="text" 
                value={formData.taxValue}
                onChange={(e) => setFormData({...formData, taxValue: e.target.value})}
                placeholder="%" 
                disabled={!formData.enableTax}
                className={`w-full border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm transition-all text-gray-700 ${
                    !formData.enableTax ? 'bg-gray-100 opacity-50' : 'bg-white'
                }`}
            />
          </div>
        </div>

        {/* Save Button */}
        <button 
          type="button"
          onClick={handleSave}
          className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-sm mt-8 mb-6"
        >
            Salvar
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodForm;
