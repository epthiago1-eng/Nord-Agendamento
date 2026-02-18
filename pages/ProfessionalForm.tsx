
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, User, Camera, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { db } from '../supabase';

const ProfessionalForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const editData = location.state?.pro;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(editData?.avatar || null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    showInPublic: true
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || '',
        phone: editData.phone || '',
        email: editData.email || '',
        showInPublic: editData.show_in_public !== undefined ? editData.show_in_public : true
      });
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

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').substring(0, 11);
    if (numbers.length > 10) return numbers.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    if (numbers.length > 6) return numbers.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    if (numbers.length > 2) return numbers.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    if (numbers.length > 0) return numbers.replace(/^(\d{0,2})/, '($1');
    return numbers;
  };

  const handleSave = async () => {
    if (!formData.name) {
        alert('Nome obrigatório');
        return;
    }

    const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        avatar: imagePreview,
        show_in_public: formData.showInPublic // BANCO: snake_case
    };

    try {
        if (id) {
            await db.professionals().update(payload).eq('id', id);
        } else {
            await db.professionals().insert(payload);
        }
        alert('Profissional salvo!');
        navigate('/professionals');
    } catch (e) {
        alert('Erro ao salvar profissional');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8">
          {id ? 'Editar Profissional' : 'Cadastro Profissional'}
        </h1>
      </header>

      <div className="p-4 space-y-5 overflow-y-auto flex-1 bg-white">
        
        {/* Controle de Visibilidade */}
        <div className={`p-5 rounded-[2rem] border transition-all flex items-center justify-between ${formData.showInPublic ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${formData.showInPublic ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {formData.showInPublic ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">Visibilidade Pública</span>
                    <p className="text-xs font-bold text-gray-800">{formData.showInPublic ? 'Disponível no Site' : 'Indisponível no Site'}</p>
                </div>
            </div>
            <button 
                onClick={() => setFormData({...formData, showInPublic: !formData.showInPublic})}
                className={`w-12 h-6 rounded-full relative transition-colors ${formData.showInPublic ? 'bg-[#56d683]' : 'bg-gray-300'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.showInPublic ? 'translate-x-6' : ''}`} />
            </button>
        </div>

        <div className="flex justify-center py-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-28 h-28 bg-[#e8e9f5] rounded-full flex items-center justify-center relative border-2 border-gray-100 shadow-inner cursor-pointer active:scale-95 transition-all overflow-hidden"
          >
             {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
             ) : (
                <User size={60} strokeWidth={1.5} className="text-[#9ca3af]" />
             )}
             <div className="absolute bottom-0 inset-x-0 bg-black/40 py-1 flex justify-center text-white"><Camera size={16} /></div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Nome do Barbeiro</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 font-bold"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Celular (WhatsApp)</label>
          <input 
            type="tel" 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
            placeholder="(xx) xxxxx-xxxx"
            maxLength={15}
            className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-sm mt-8"
        >
            Salvar
        </button>
      </div>
    </div>
  );
};

export default ProfessionalForm;
