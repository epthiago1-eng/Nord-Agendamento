
import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, Copy, MapPin, Upload, ChevronRight, 
  Globe, Check, X, Home, Palette, Eye, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings } from '../data/agendaData';

const Establishment: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados Principais
  const [settings, setSettings] = useState(getSettings());
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

  useEffect(() => {
    const generated = settings.name
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMainSave = () => {
    saveSettings(settings);
    alert('Configurações salvas com sucesso!');
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate('/menu')}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Estabelecimento</h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        {/* Identidade Visual */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <Palette size={18} className="text-blue-900" />
                <h3 className="text-gray-900 font-black text-xs uppercase tracking-widest">Identidade Visual</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Cor Primária</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="color" 
                            value={settings.primaryColor}
                            onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                            className="w-12 h-12 rounded-xl border-none cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-gray-500 uppercase">{settings.primaryColor}</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Cor Secundária</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="color" 
                            value={settings.secondaryColor}
                            onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                            className="w-12 h-12 rounded-xl border-none cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-gray-500 uppercase">{settings.secondaryColor}</span>
                    </div>
                </div>
            </div>

            {/* Preview Theme */}
            <div className="pt-4 border-t border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pré-visualização do Tema</p>
                <div className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between" style={{ backgroundColor: `${settings.primaryColor}10` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: settings.primaryColor }}>
                            <Check size={20} />
                        </div>
                        <span className="font-bold text-sm" style={{ color: settings.primaryColor }}>Botão Principal</span>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-full border border-gray-200 bg-white" style={{ color: settings.secondaryColor }}>
                        Exemplo
                    </button>
                </div>
            </div>
        </div>

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
            className="w-full bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              {settings.logoUrl ? (
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
                   <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="bg-gray-50 p-2.5 rounded-xl text-gray-500"><Upload size={22} /></div>
              )}
              <div className="text-left">
                <span className="text-gray-700 font-bold text-sm block leading-none mb-1">Logo da Unidade</span>
                <span className="text-[10px] text-gray-400 font-medium">{settings.logoUrl ? 'Logo carregada' : 'Nenhuma logo definida'}</span>
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
          className="w-full bg-[#1e3a8a] text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all uppercase tracking-[0.2em] text-sm mt-4"
        >
          Salvar Alterações
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
