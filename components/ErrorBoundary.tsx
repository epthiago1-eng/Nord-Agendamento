import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = async () => {
    // Limpa localStorage e sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Desregistra Service Workers para limpar caches agressivos (como no Android)
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (err) {
        console.error('Erro ao desregistrar service worker:', err);
      }
    }

    // Limpa o Cache Storage (usado pelo Service Worker)
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      } catch (err) {
        console.error('Erro ao limpar caches:', err);
      }
    }

    // Recarrega a página forçando ignorar o cache
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-red-900/20 rounded-full blur-3xl"></div>
          
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl max-w-md w-full space-y-6 z-10">
            <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle size={40} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight mb-2">Ops! Algo deu errado.</h1>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                Encontramos um problema ao carregar o aplicativo. Isso geralmente acontece por causa de dados desatualizados salvos no seu celular.
              </p>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-2xl text-left">
                <p className="text-xs text-blue-200 font-medium">
                    <strong className="block text-blue-400 mb-1">Como resolver?</strong>
                    Clique no botão abaixo para limpar os dados antigos do seu navegador e recarregar o sistema. Você precisará fazer login novamente.
                </p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full bg-white text-[#0f172a] font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Corrigir e Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
