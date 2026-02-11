
import React, { useState } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const ProfessionalCommissionForm: React.FC = () => {
  const navigate = useNavigate();
  const { proId, serviceId } = useParams();

  const [formData, setFormData] = useState({
    commissionValue: '50',
    typeIsPercentage: true,
    isActive: true,
    costCenter: 'Comissão'
  });

  const handleSave = () => {
    alert('Configurações de comissão salvas!');
    navigate(-1);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header idêntico à Imagem 1 */}
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium tracking-tight pr-8">
          Configurar Comissão
        </h1>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pt-8">
        {/* Input Percentual da Comissão */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1 tracking-tight">
            Percentual da Comissão(%)
          </label>
          <input 
            type="text" 
            value={formData.commissionValue}
            onChange={(e) => setFormData({...formData, commissionValue: e.target.value})}
            placeholder="0" 
            className="w-full bg-white border border-gray-300 rounded-lg py-4 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm font-medium"
          />
        </div>

        {/* Toggles de %/R$ e Status */}
        <div className="flex items-center justify-around py-2">
            {/* Toggle % / R$ */}
            <div className="flex items-center gap-3">
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, typeIsPercentage: !formData.typeIsPercentage})}
                    className={`w-14 h-7 rounded-full relative transition-colors duration-200 shadow-inner ${formData.typeIsPercentage ? 'bg-gray-500' : 'bg-gray-400'}`}
                >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${formData.typeIsPercentage ? '' : 'translate-x-7'}`} />
                </button>
                <span className="text-gray-900 text-sm font-medium">% / R$</span>
            </div>

            {/* Toggle Status */}
            <div className="flex items-center gap-3">
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                    className={`w-14 h-7 rounded-full relative transition-colors duration-200 shadow-inner ${formData.isActive ? 'bg-[#56d683]' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${formData.isActive ? 'translate-x-7' : ''}`} />
                </button>
                <span className="text-gray-900 text-sm font-medium">Status</span>
            </div>
        </div>

        {/* Centro de Custo Select */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1 tracking-tight">Centro de Custo</label>
          <div className="relative">
            <select 
                value={formData.costCenter}
                onChange={(e) => setFormData({...formData, costCenter: e.target.value})}
                className="w-full bg-white border border-gray-300 rounded-lg py-4 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm font-medium appearance-none"
            >
                <option value="Comissão">Comissão</option>
                <option value="Outros">Outros</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={18} />
          </div>
        </div>

        {/* Botão Salvar Primário */}
        <div className="pt-4">
          <button 
            onClick={handleSave}
            className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-lg shadow-md active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalCommissionForm;
