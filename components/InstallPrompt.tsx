
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, ExternalLink } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    // Detecta se está em iframe
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }

    // Detecta se já está instalado (standalone mode)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(isStandaloneMode);
    };
    
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // Detecta iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIosDevice && !isStandalone) {
        setIsIOS(true);
        // iOS não dispara evento, mostra sempre (se não instalado)
        setShow(true);
    }

    const handler = (e: any) => {
      console.log('Evento beforeinstallprompt disparado!');
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fallback: Se não disparar o evento em 3 segundos (e não for iOS/Iframe/Standalone), mostra o botão mesmo assim
    // para permitir instrução manual
    const timer = setTimeout(() => {
        if (!isIosDevice && !isStandalone && !isIframe) {
            setShow(true);
        }
    }, 3000);

    return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
        clearTimeout(timer);
    };
  }, [isStandalone, isIframe]);

  const handleInstallClick = async () => {
    if (isIOS) {
        alert('Para instalar no iPhone/iPad:\n1. Toque no botão Compartilhar (quadrado com seta)\n2. Selecione "Adicionar à Tela de Início"');
        return;
    }

    if (!deferredPrompt) {
        alert('Para instalar este aplicativo:\n1. Abra o menu do navegador (três pontos)\n2. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"');
        return;
    }

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

  if (isStandalone) return null;

  // Se estiver em iframe, mostra botão para abrir em nova aba
  if (isIframe) {
      return (
        <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-700">
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-blue-900 text-white px-4 py-3 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold hover:bg-blue-800 transition-colors"
            >
              <ExternalLink size={16} />
              Abrir em Nova Aba para Instalar
            </a>
        </div>
      );
  }

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
