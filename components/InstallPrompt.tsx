
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detecta se é iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Detecta se já está instalado (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
        setIsIOS(true);
        setShow(true);
    }

    const handler = (e: any) => {
      console.log('Evento beforeinstallprompt disparado!');
      // Impede o mini-infobar padrão do Chrome
      e.preventDefault();
      // Guarda o evento para disparar depois
      setDeferredPrompt(e);
      
      // Mostra o prompt
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
        alert('Para instalar no iPhone/iPad: toque no botão Compartilhar (quadrado com seta) e selecione "Adicionar à Tela de Início".');
        return;
    }

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
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-700">
      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white p-5 rounded-[2rem] shadow-2xl flex items-center justify-between border-2 border-white/20 relative overflow-hidden group">
        
        {/* Efeito de Brilho de Fundo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
        
        <div className="flex items-center gap-4 z-10">
            <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-md shadow-inner animate-pulse">
                <Smartphone size={28} className="text-white" />
            </div>
            <div>
                <h3 className="font-black text-sm uppercase tracking-widest leading-tight mb-0.5">Instalar App</h3>
                <p className="text-[10px] text-blue-100 font-medium leading-tight">Acesso rápido e offline direto da tela inicial</p>
            </div>
        </div>

        <div className="flex items-center gap-3 z-10 pl-2">
            <button 
                onClick={handleInstallClick}
                className="bg-white text-blue-900 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center gap-2"
            >
                <Download size={14} />
                {isIOS ? 'Instalar (iOS)' : 'Baixar'}
            </button>
            <button 
                onClick={handleClose} 
                className="p-2 bg-white/10 rounded-xl text-blue-100 hover:bg-white/20 hover:text-white transition-colors active:scale-90"
            >
                <X size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
