import React, { useMemo } from 'react';

export type BgEffect = 'none' | 'rain' | 'snow' | 'bubbles';

export function BackgroundEffects({ effect }: { effect: BgEffect }) {
  if (effect === 'none') return null;

  // Gerar config de itens uma única vez para evitar re-calculo desnecessário
  const items = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${(i * 3.33) + (Math.random() * 2)}%`,
      delay: `${Math.random() * 8}s`,
      duration: effect === 'rain' ? `${0.4 + Math.random() * 0.4}s` : `${6 + Math.random() * 8}s`,
      size: effect === 'bubbles' ? `${10 + Math.random() * 20}px` : undefined,
      opacity: 0.1 + Math.random() * 0.3
    }));
  }, [effect]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {items.map((item) => {
        if (effect === 'rain') {
          return (
            <div
              key={item.id}
              className="absolute top-0 w-px h-16 bg-blue-400/30 rounded-full animate-fall"
              style={{ 
                left: item.left, 
                animationDelay: item.delay, 
                animationDuration: item.duration,
                opacity: item.opacity 
              }}
            />
          );
        }
        if (effect === 'snow') {
          return (
            <div
              key={item.id}
              className="absolute top-0 w-1.5 h-1.5 bg-white rounded-full animate-fall animate-drift"
              style={{ 
                left: item.left, 
                animationDelay: item.delay, 
                animationDuration: item.duration,
                opacity: item.opacity,
                filter: 'blur(1px)'
              }}
            />
          );
        }
        if (effect === 'bubbles') {
          return (
            <div
              key={item.id}
              className="absolute bottom-0 rounded-full border border-blue-200/40 bg-blue-100/10 backdrop-blur-[1px] animate-rise animate-drift"
              style={{ 
                left: item.left, 
                width: item.size, 
                height: item.size,
                animationDelay: item.delay, 
                animationDuration: item.duration,
                opacity: item.opacity
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
