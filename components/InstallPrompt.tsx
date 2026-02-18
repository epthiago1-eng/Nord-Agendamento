
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Verifica se já não foi instalado ou fechado recentemente
      if (!localStorage.getItem('install_dismissed')) {
          setShow(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  const handleClose = () => {
      setShow(false);
      // Lembra de não mostrar novamente na sessão ou por um tempo (opcional)
      // localStorage.setItem('install_dismissed', 'true'); 
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-[#1e3a8a] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-blue-700/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
        
        <div className="flex items-center gap-4 z-10">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                <Download size={24} className="text-white" />
            </div>
            <div>
                <h3 className="font-black text-sm uppercase tracking-widest leading-tight">Instalar App</h3>
                <p className="text-[10px] text-blue-200 font-medium mt-0.5">Acesse mais rápido direto da tela inicial</p>
            </div>
        </div>

        <div className="flex items-center gap-2 z-10">
            <button 
                onClick={handleInstallClick}
                className="bg-white text-blue-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
            >
                Instalar
            </button>
            <button onClick={handleClose} className="p-2 text-blue-300 hover:text-white transition-colors">
                <X size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
