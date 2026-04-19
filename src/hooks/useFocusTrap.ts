import { useEffect, useCallback, RefObject } from 'react';

/**
 * Hook de acessibilidade sênior para gerenciamento de foco (Focus Locking).
 * Garante que o usuário de teclado não "saia" do modal ao navegar com Tab.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active || !ref.current || e.key !== 'Tab') return;

      const focusableElements = ref.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      } else if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    },
    [active, ref]
  );

  useEffect(() => {
    if (active) {
      document.addEventListener('keydown', handleKeyDown);
      
      // Salva o elemento que tinha foco antes de abrir o modal
      const previousFocus = document.activeElement as HTMLElement;
      
      // Foca automaticamente no primeiro elemento do modal
      const focusableElements = ref.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restaura o foco ao fechar
        previousFocus?.focus();
      };
    }
  }, [active, handleKeyDown, ref]);
}
