import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, X, AlertTriangle, Bug, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/cn';

interface DebugError {
  id: string;
  message: string;
  timestamp: string;
  type: 'error' | 'warning';
}

export function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errors, setErrors] = useState<DebugError[]>([]);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === 'production') return;

    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const message = 'message' in event ? event.message : (event as PromiseRejectionEvent).reason?.message || 'Erro de promessa desconhecido';
      
      const newError: DebugError = {
        id: Math.random().toString(36).substr(2, 9),
        message,
        timestamp: new Date().toLocaleTimeString(),
        type: 'error'
      };

      setErrors(prev => [newError, ...prev].slice(0, 50));
      setIsOpen(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    // Watchdog Defender Listener
    const handleWatchdog = (e: any) => {
      const { elementId, reason } = e.detail;
      const newError: DebugError = {
        id: `watchdog-${elementId}-${Date.now()}`,
        message: `WATCHDOG ALERT: Elemento #${elementId} -> ${reason}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'warning'
      };
      setErrors(prev => [newError, ...prev].slice(0, 50));
      setIsOpen(true);
    };

    window.addEventListener('watchdog-alert' as any, handleWatchdog);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
      window.removeEventListener('watchdog-alert' as any, handleWatchdog);
    };
  }, []);

  if (errors.length === 0 && !isOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 z-9999 flex flex-col gap-2 max-w-[400px]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-gray-900 border border-white/10 rounded-[24px] shadow-2xl overflow-hidden flex flex-col",
              isExpanded ? "h-[400px]" : "h-auto"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-800/50 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                </div>
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest pl-2 font-mono">
                  Radar de Erros ({errors.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 transition-colors"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                <button 
                  onClick={() => {
                    setErrors([]);
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-white/40 transition-colors"
                >
                  <ShieldCheck size={14} />
                </button>
              </div>
            </div>

            {/* Error List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {errors.map((err) => (
                <div key={err.id} className="group relative">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      <Bug size={12} className="text-red-400 opacity-50" />
                    </div>
                    <div className="flex-1 leading-relaxed">
                      <p className="text-[11px] font-mono text-white/80 wrap-break-word">{err.message}</p>
                      <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{err.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
              {errors.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                  <ShieldCheck size={32} className="text-emerald-400 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Nenhum Erro Detectado</p>
                </div>
              )}
            </div>
            
            {/* Footer Tip */}
            {isExpanded && (
              <div className="p-3 bg-white/5 border-t border-white/5">
                <div className="flex items-center gap-2 text-[8px] font-bold text-white/30 uppercase tracking-widest">
                  <AlertTriangle size={10} className="text-yellow-400" />
                  <span>Dica: Erros de Permissão no Firestore requerem ajuste nas Rules.</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && errors.length > 0 && (
        <motion.button
          layoutId="console-btn"
          onClick={() => setIsOpen(true)}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg transition-all"
        >
          <Bug size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Ver Erros ({errors.length})</span>
        </motion.button>
      )}
    </div>
  );
}
