
import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, Copy, MapPin, Upload, ChevronRight, 
  Globe, Check, X, Home, Clock, Loader2, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings } from '../data/agendaData';
import { EstablishmentSettings } from '../types';
import { supabase } from '../supabase';

const Establishment: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Estados Principais - Inicializa com valores padrão para evitar crash
  const [settings, setSettings] = useState<EstablishmentSettings>({
      primaryColor: '#1e3a8a',
      secondaryColor: '#000000',
      name: 'Nord Barbershop',
      logoUrl: '',
      slotInterval: 15
  });
  
  const [copied, setCopied] = useState(false);
  const [slug, setSlug] = useState('nord-barbershop');
  
  // Estado de Endereço
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState({
    zip: '28950-000',
    street: 'Rodovia Amaral Peixoto',
    number: '500',
    neighborhood: 'Orla',
    city: 'Armação dos Búzios',
    state: 'RJ'
  });

  // Carrega as configurações do banco ao montar o componente
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const safeName = settings.name || 'Nord Barbershop';
    const generated = safeName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(generated);
  }, [settings.name]);

  const bookingUrl = `${window.location.origin}/#/booking/${slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setUploading(true);
      
      // Gera nome único para evitar cache ou sobreposição
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('establishment')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar URL Pública
      const { data } = supabase.storage
        .from('establishment')
        .getPublicUrl(filePath);

      // 3. Atualizar estado local
      setSettings({ ...settings, logoUrl: data.publicUrl });
      
    } catch (error: any) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload da logo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleMainSave = async () => {
    setLoading(true);
    try {
      await saveSettings(settings);
      alert('✅ Configurações salvas com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/menu')}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Estabelecimento</h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        
        {/* Configurações da Agenda */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-blue-900" />
                <h3 className="text-gray-900 font-black text-xs uppercase tracking-widest">Preferências da Agenda</h3>
            </div>

            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Intervalo de Horários</label>
                <select 
                    value={settings.slotInterval}
                    onChange={(e) => setSettings({ ...settings, slotInterval: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 outline-none font-bold text-gray-700 shadow-inner"
                >
                    <option value={15}>15 minutos (Padrão)</option>
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>1 hora</option>
                </select>
                <p className="mt-2 text-[10px] text-gray-400 italic px-1">Isso define de quanto em quanto tempo novos horários aparecem para o cliente.</p>
            </div>
        </div>

        <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Nome da Barbearia</label>
              <input 
                type="text" 
                value={settings.name}
                onChange={(e) => setSettings({...settings, name: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 shadow-sm"
              />
            </div>

            <div className="bg-blue-900 rounded-[2rem] p-6 text-white shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                    <Globe size={18} className="text-blue-300" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Link de Agendamento do Cliente</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 break-all">
                    <p className="text-xs font-medium text-blue-100">{bookingUrl}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={copyToClipboard}
                        className="flex-1 bg-white text-blue-900 font-black py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copiado!' : 'Copiar Link'}
                    </button>
                    <button 
                        onClick={() => window.open(bookingUrl, '_blank')}
                        className="bg-blue-800 text-white p-3 rounded-xl active:scale-95"
                    >
                        <Eye size={20} />
                    </button>
                </div>
            </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => setShowAddressModal(true)}
            className="w-full bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gray-50 p-2.5 rounded-xl text-gray-500"><MapPin size={22} /></div>
              <div className="text-left">
                <span className="text-gray-700 font-bold text-sm block leading-none mb-1">Configurar Endereço</span>
                <span className="text-[10px] text-gray-400 font-medium">{address.city}, {address.state}</span>
              </div>
            </div>
            <ChevronRight className="text-gray-300" size={20} />
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              {uploading ? (
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-900" size={20} /></div>
              ) : settings.logoUrl ? (
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-gray-100 shadow-inner bg-white">
                   <img 
                    src={settings.logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-cover scale-110" 
                   />
                </div>
              ) : (
                <div className="bg-gray-50 p-2.5 rounded-xl text-gray-500"><Upload size={22} /></div>
              )}
              <div className="text-left">
                <span className="text-gray-700 font-bold text-sm block leading-none mb-1">Logo da Unidade</span>
                <span className="text-[10px] text-gray-400 font-medium">{uploading ? 'Enviando imagem...' : (settings.logoUrl ? 'Logo carregada' : 'Nenhuma logo definida')}</span>
              </div>
            </div>
            <ChevronRight className="text-gray-300" size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleLogoChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <button 
          onClick={handleMainSave}
          disabled={loading || uploading}
          className="w-full bg-[#1e3a8a] text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all uppercase tracking-[0.2em] text-sm mt-4 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
        </button>
      </div>

      {showAddressModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <Home size={18} className="text-[#1e3a8a]" />
                <h3 className="text-[#1e3a8a] font-black uppercase tracking-widest text-xs">Editar Endereço</h3>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-400 p-1"><X size={20} /></button>
            </div>
            <button 
              onClick={() => setShowAddressModal(false)}
              className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-widest text-xs"
            >
              Confirmar Endereço
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Establishment;
