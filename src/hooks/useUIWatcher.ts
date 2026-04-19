import { useEffect } from 'react';

// Tipagem para os eventos do Watchdog
declare global {
  interface WindowEventMap {
    'watchdog-alert': CustomEvent<{ elementId: string; reason: string }>;
  }
}

export const useUIWatcher = (
  criticalIds: string[] = ['planner-window', 'active-task-card', 'nav-bar'],
  intervalMs: number = 2000
) => {
  useEffect(() => {
    // Só executa em desenvolvimento.
    // Usamos um truque de string para o env do Vite pra evitar problemas de SSR se houver.
    if (import.meta.env.MODE === 'production') return;

    const watchdog = setInterval(() => {
      criticalIds.forEach((id) => {
        const element = document.getElementById(id);
        
        // Critério 1: Elemento não está na DOM
        if (!element) {
          console.warn(`[Watchdog Debug] Componente CRÍTICO ausente: ${id}`);
          window.dispatchEvent(new CustomEvent('watchdog-alert', {
            detail: { elementId: id, reason: 'Ausente na DOM (Verifique se houve unmount acidental)' }
          }));
          return;
        }

        const style = window.getComputedStyle(element);
        const isVisible = element.offsetParent !== null || style.display !== 'none';
        
        if (!isVisible) {
          console.warn(`[Watchdog Debug] Componente ${id} está na DOM mas OCULTO (display: none ou offsetParent nulo)`);
          window.dispatchEvent(new CustomEvent('watchdog-alert', {
            detail: { elementId: id, reason: 'Presente na DOM, mas invisível via CSS' }
          }));
        }
      });
    }, intervalMs);

    return () => clearInterval(watchdog);
  }, [criticalIds, intervalMs]);
};
