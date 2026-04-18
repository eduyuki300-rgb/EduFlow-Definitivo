import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Componente robusto de Error Boundary para capturar erros de renderização.
 * Usando casting para bypassar problemas de configuração de tipos do React.
 */
export class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('EduFlow Critical Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error as any;
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-slate-900">
          <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl border border-red-100 p-10 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight mb-2">Ops! Algo deu errado.</h1>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Ocorreu um erro inesperado na interface. Mas não se preocupe, seus dados estão seguros na nuvem.
            </p>
            
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-8 text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Detalhes do Erro</p>
              <p className="text-[11px] font-mono text-gray-600 line-clamp-3">{error?.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-lg"
              >
                <RefreshCw size={14} />
                Recarregar
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-100 px-6 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                <Home size={14} />
                Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
