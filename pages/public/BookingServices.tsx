
import React, { useState, useEffect, useMemo } from 'react';
import { Search, CalendarDays, MapPin, ChevronLeft, Clock, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '../../data/agendaData';
import { EstablishmentSettings } from '../../types';
import { db } from '../../supabase';

const BookingServices: React.FC = () => {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar Configurações e Serviços Reais
  useEffect(() => {
    const init = async () => {
      try {
        const settingsData = await getSettings();
        setSettings(settingsData);

        // Busca serviços públicos
        const { data: servicesData } = await db.services()
            .select('*')
            .eq('show_in_public', true) // Filtro de visibilidade
            .order('name');
        
        setServices(servicesData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const availableServices = useMemo(() => {
    return services.filter(s => (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, services]);

  const toggleService = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleContinue = () => {
    const selected = services.filter(s => selectedIds.includes(s.id));
    navigate('/booking/schedule', { state: { selectedServices: selected } });
  };

  if (loading || !settings) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-white">
              <Loader2 className="animate-spin text-blue-900" size={40} />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <style>{`
        :root {
          --primary-color: ${settings.primaryColor};
          --secondary-color: ${settings.secondaryColor};
        }
        .btn-primary { background-color: var(--primary-color); }
        .text-primary { color: var(--primary-color); }
        .border-primary { border-color: var(--primary-color); }
        .bg-primary-soft { background-color: var(--primary-color)15; }
      `}</style>

      {/* Header com a cor secundária ou preto padrão */}
      <div className="h-16 w-full relative shrink-0" style={{ backgroundColor: settings.secondaryColor }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl z-10 translate-y-[-20%]">
          <img src={settings.logoUrl || "https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png"} alt={settings.name} className="w-full h-full object-contain p-1" />
        </div>
      </div>

      <div className="mt-20 px-4 space-y-4 pb-24">
        <h2 className="text-center font-black text-gray-900 uppercase tracking-widest text-sm pt-2">
            Seja bem-vindo à <span className="text-primary">{settings.name}</span>
        </h2>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg py-3 px-4 pr-10 outline-none bg-gray-50/50 text-sm font-medium" 
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
          <button 
            onClick={() => navigate('/booking/consult')} 
            className="p-3 bg-gray-900 text-white rounded-xl shadow-sm active:scale-95"
            style={{ backgroundColor: settings.secondaryColor }}
          >
            <CalendarDays size={20} />
          </button>
          <button 
            onClick={() => navigate('/booking/location')} 
            className="p-3 bg-gray-900 text-white rounded-xl shadow-sm active:scale-95"
            style={{ backgroundColor: settings.secondaryColor }}
          >
            <MapPin size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {availableServices.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                  Nenhum serviço disponível no momento.
              </div>
          ) : availableServices.map(s => (
            <div key={s.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="h-44 overflow-hidden relative bg-gray-100">
                {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Clock size={48} />
                    </div>
                )}
                
                {selectedIds.includes(s.id) && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in">
                        <div className="bg-white rounded-full p-2 text-primary shadow-xl">
                            <Check size={32} strokeWidth={3} />
                        </div>
                    </div>
                )}
              </div>
              <div className="p-5 text-center space-y-2">
                <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">{s.name}</h3>
                <div className="flex items-center justify-center gap-2 text-gray-400 text-xs font-bold uppercase">
                  <Clock size={14} className="text-primary" />
                  <span>{s.duration} minutos</span>
                </div>
              </div>
              <div className="p-5 border-t border-gray-50 flex items-center justify-between">
                <span className="font-black text-gray-900 text-lg">R$ {s.price.toFixed(2).replace('.', ',')}</span>
                <button 
                  onClick={() => toggleService(s.id)}
                  className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                    selectedIds.includes(s.id) ? 'text-white' : 'border border-gray-200 text-gray-500'
                  }`}
                  style={{ backgroundColor: selectedIds.includes(s.id) ? settings.primaryColor : 'transparent' }}
                >
                  {selectedIds.includes(s.id) ? 'Selecionado' : 'Selecionar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
            <button 
                onClick={() => setShowConfirmModal(true)}
                className="w-full text-white font-black py-5 rounded-[2rem] shadow-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm"
                style={{ backgroundColor: settings.primaryColor }}
            >
                Agendar ({selectedIds.length})
            </button>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
                <div className="bg-primary-soft w-16 h-16 rounded-full mx-auto flex items-center justify-center text-primary">
                    <Check size={32} />
                </div>
                <h2 className="font-black text-gray-900 text-base uppercase tracking-tight">Serviços Adicionados</h2>
                <ul className="text-left space-y-3 bg-gray-50 p-4 rounded-2xl">
                    {availableServices.filter(s => selectedIds.includes(s.id)).map(s => (
                        <li key={s.id} className="text-gray-700 text-xs font-bold flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
                            {s.name}
                        </li>
                    ))}
                </ul>
                <div className="space-y-3">
                    <button 
                        onClick={handleContinue}
                        className="w-full text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg"
                        style={{ backgroundColor: settings.primaryColor }}
                    >
                        Continuar
                    </button>
                    <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="w-full bg-white border border-gray-100 text-gray-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest"
                    >
                        Adicionar mais
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingServices;
