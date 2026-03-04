
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, ExternalLink } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const location = useLocation();

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

  // Se estiver na página de agendamento público (booking), não mostra nada
  if (location.pathname.startsWith('/booking')) return null;

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
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-700">
      <div className="bg-[#1e3a8a] text-white rounded-full shadow-2xl flex items-center p-1 pr-2 border-2 border-white/20 backdrop-blur-sm">
        <button 
            onClick={handleInstallClick}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-full transition-colors"
        >
            <Download size={20} />
            <span className="font-bold whitespace-nowrap">
                {isIOS ? 'Instalar App' : 'Instalar App'}
            </span>
        </button>
        <div className="w-px h-6 bg-white/20 mx-1"></div>
        <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Fechar"
        >
            <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
