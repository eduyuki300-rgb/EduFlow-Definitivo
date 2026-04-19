import { useState, useEffect, useCallback } from 'react';

type RecoveryStrategy = 'RESET_STATE' | 'FORCE_REMOUNT' | 'CLEAR_STORAGE';

export const useAutoRecovery = (elementId: string, strategy: RecoveryStrategy = 'FORCE_REMOUNT') => {
  // O recoveryKey será usado para forçar o React a destruir e recriar o componente
  const [recoveryKey, setRecoveryKey] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  const executeHealing = useCallback(() => {
    setIsRecovering(true);
    console.warn(`[Auto-Healer] Curando componente crítico: ${elementId}`);

    if (strategy === 'CLEAR_STORAGE' || strategy === 'FORCE_REMOUNT') {
      // Remove estados que podem estar corrompidos ou causando loops de desidratação
      localStorage.removeItem('eduflow_edustuffs_open');
      localStorage.removeItem('eduflow_active_focus_id');
      
      // Também limpamos buffers pendentes se houver
      localStorage.removeItem('eduflow_pending_tasks_buffer');
    }

    // Altera a key, forçando o React a fazer um unmount e mount imediato
    setRecoveryKey(prev => prev + 1);

    // Remove o status de "recuperando" após 1 frame para permitir renderização limpa
    requestAnimationFrame(() => setIsRecovering(false));
  }, [elementId, strategy]);

  useEffect(() => {
    const handleWatchdogAlert = (event: CustomEvent<{ elementId: string; reason: string }>) => {
      if (event.detail.elementId === elementId) {
        executeHealing();
      }
    };

    // Escuta o grito de socorro do useUIWatcher
    window.addEventListener('watchdog-alert' as any, handleWatchdogAlert as EventListener);
    
    return () => window.removeEventListener('watchdog-alert' as any, handleWatchdogAlert as EventListener);
  }, [elementId, executeHealing]);

  return { recoveryKey, isRecovering };
};
