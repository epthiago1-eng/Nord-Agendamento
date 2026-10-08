
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, DollarSign, Percent, Save, Loader2 } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../supabase';

const ProfessionalCommissionForm: React.FC = () => {
  const navigate = useNavigate();
  const { proId, serviceId } = useParams();
  const location = useLocation();
  const serviceName = location.state?.serviceName || 'Serviço Selecionado';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    commissionValue: '50',
    type: 'percent' as 'percent' | 'fixed',
    isActive: true,
    costCenter: 'Comissão'
  });

  useEffect(() => {
    const fetchConfig = async () => {
        if (!proId || !serviceId) return;
        
        const { data, error } = await db.professionalServices()
            .select('*')
            .eq('professional_id', proId)
            .eq('service_id', serviceId)
            .single();
            
        if (data) {
            setFormData(prev => ({
                ...prev,
                commissionValue: data.commission_value.toString(),
                type: data.commission_type,
                isActive: true
            }));
        }
    };
    fetchConfig();
  }, [proId, serviceId]);

  const handleSave = async () => {
    if (!proId || !serviceId) return;
    setLoading(true);

    try {
        // Upsert no banco de dados
        const { error } = await db.professionalServices().upsert({
            professional_id: proId,
            service_id: serviceId,
            commission_type: formData.type,
            commission_value: parseFloat(formData.commissionValue.replace(',', '.')) || 0
        }, { onConflict: 'professional_id, service_id' }); // Chave única composta

        if (error) throw error;
        
        alert('Comissão atualizada com sucesso!');
        navigate(-1);
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar configuração.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <div className="flex-1 text-center pr-8">
            <h1 className="text-lg font-medium tracking-tight">Configurar Comissão</h1>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">{serviceName}</p>
        </div>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pt-8">
        
        {/* Valor da Comissão */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1 tracking-tight">
            Valor da Comissão
          </label>
          <div className="relative">
            <input 
                type="text" 
                value={formData.commissionValue}
                onChange={(e) => setFormData({...formData, commissionValue: e.target.value})}
                className="w-full bg-white border border-gray-300 rounded-2xl py-6 px-4 pl-12 outline-none focus:ring-2 focus:ring-blue-900 text-3xl font-black text-blue-900 shadow-sm"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {formData.type === 'percent' ? <Percent size={24} /> : <DollarSign size={24} />}
            </div>
          </div>
        </div>

        {/* Tipo de Comissão Toggle */}
        <div className="bg-gray-50 p-1.5 rounded-2xl flex border border-gray-100">
            <button 
                onClick={() => setFormData({...formData, type: 'percent'})}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    formData.type === 'percent' ? 'bg-white text-blue-900 shadow-sm font-black' : 'text-gray-400 font-medium'
                }`}
            >
                <Percent size={16} /> Porcentagem
            </button>
            <button 
                onClick={() => setFormData({...formData, type: 'fixed'})}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    formData.type === 'fixed' ? 'bg-white text-green-600 shadow-sm font-black' : 'text-gray-400 font-medium'
                }`}
            >
                <DollarSign size={16} /> Valor Fixo
            </button>
        </div>

        {/* Centro de Custo */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1 tracking-tight">Centro de Custo</label>
          <div className="relative">
            <select 
                value={formData.costCenter}
                onChange={(e) => setFormData({...formData, costCenter: e.target.value})}
                className="w-full bg-white border border-gray-300 rounded-lg py-4 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm font-medium appearance-none"
            >
                <option value="Comissão">Comissão (Padrão)</option>
                <option value="Serviços Terceirizados">Serviços Terceirizados</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={18} />
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#1e3a8a] text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                    <Save size={20} />
                    Salvar Configuração
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalCommissionForm;
