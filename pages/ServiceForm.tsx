
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Camera, X, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../supabase';

const ServiceForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.service;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    value: '0,00',
    reminders: '0',
    group: '',
    observation: '',
    showInPublic: true
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        duration: String(editData.duration || '45'),
        value: `${String(editData.price || '0,00').replace('.', ',')}`,
        // Verifica variações de nome da coluna (reminder_days é o padrão do banco)
        reminders: String(editData.reminder_days || editData.reminder || '0'),
        group: editData.group_name || 'Barber',
        observation: editData.observation || '',
        showInPublic: editData.show_in_public !== undefined ? editData.show_in_public : true
      });
      if (editData.image_url) setImagePreview(editData.image_url);
    }
  }, [editData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
        alert('Nome do serviço é obrigatório');
        return;
    }

    const payload = {
        name: formData.name,
        duration: parseInt(formData.duration) || 30,
        price: parseFloat(formData.value.replace('R$ ', '').replace(',', '.')) || 0,
        show_in_public: formData.showInPublic,
        image_url: imagePreview,
        group_name: formData.group,
        reminder_days: parseInt(formData.reminders) || 0, // Salva na coluna correta
        observation: formData.observation
    };

    try {
        if (editData?.id) {
            await db.services().update(payload).eq('id', editData.id);
        } else {
            await db.services().insert(payload);
        }
        alert('Serviço salvo!');
        navigate('/services');
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar serviço.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">Cadastro Serviço</h1>
      </header>

      <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-24 bg-white">
        
        {/* Controle de Visibilidade */}
        <div className={`p-5 rounded-[2rem] border transition-all flex items-center justify-between ${formData.showInPublic ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${formData.showInPublic ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {formData.showInPublic ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Visibilidade</span>
                    <p className="text-xs font-bold text-gray-800">{formData.showInPublic ? 'Exibindo no Site' : 'Oculto para Clientes'}</p>
                </div>
            </div>
            <button 
                onClick={() => setFormData({...formData, showInPublic: !formData.showInPublic})}
                className={`w-12 h-6 rounded-full relative transition-colors ${formData.showInPublic ? 'bg-[#56d683]' : 'bg-gray-300'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.showInPublic ? 'translate-x-6' : ''}`} />
            </button>
        </div>

        {/* Preview de Imagem */}
        {imagePreview && (
            <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm mb-4">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                    onClick={() => setImagePreview(null)}
                    className="absolute top-4 right-4 bg-white text-red-500 p-2 rounded-full shadow-lg active:scale-90"
                >
                    <X size={18} />
                </button>
            </div>
        )}

        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1.5 tracking-tight">Nome do Serviço</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Ex: Corte Degradê + Barba" 
            className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm transition-all text-gray-700 font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Duração (min)</label>
            <input 
              type="number" 
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: e.target.value})}
              className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm text-gray-700 font-bold"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Valor (R$)</label>
            <input 
              type="text" 
              value={formData.value}
              onChange={(e) => setFormData({...formData, value: e.target.value})}
              className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm text-gray-700 font-bold"
            />
          </div>
        </div>

        {/* Upload Button */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageChange} 
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-[#f8f9fb] border border-gray-100 p-4 rounded-xl flex items-center justify-between active:scale-[0.98] transition-all shadow-sm group mt-4"
        >
            <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 text-gray-600">
                  <Camera size={20} />
                </div>
                <span className="text-gray-700 font-semibold text-sm">
                    {imagePreview ? 'Alterar Imagem' : 'Imagem do Serviço'}
                </span>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
        </button>

        <button 
          type="button"
          onClick={handleSave}
          className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-sm mt-8"
        >
            Salvar
        </button>
      </div>
    </div>
  );
};

export default ServiceForm;
