import React from 'react';
import { motion } from 'motion/react';

export type BgEffect = 'none' | 'rain' | 'snow' | 'bubbles';

export function BackgroundEffects({ effect }: { effect: BgEffect }) {
  if (effect === 'none') return null;

  const items = Array.from({ length: 25 });

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {items.map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const delay = Math.random() * 5;
        const duration = effect === 'rain' ? 0.5 + Math.random() * 0.5 : 3 + Math.random() * 4;

        if (effect === 'rain') {
          return (
            <motion.div
              key={i}
              className="absolute top-0 w-[2px] h-12 bg-blue-400/40 rounded-full"
              style={{ left }}
              animate={{ y: ['-10vh', '110vh'] }}
              transition={{ duration, repeat: Infinity, delay, ease: 'linear' }}
            />
          );
        }
        if (effect === 'snow') {
          return (
            <motion.div
              key={i}
              className="absolute top-0 w-2 h-2 bg-white rounded-full opacity-80 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
              style={{ left }}
              animate={{ y: ['-10vh', '110vh'], x: ['-15px', '15px', '-15px'] }}
              transition={{ 
                y: { duration, repeat: Infinity, delay, ease: 'linear' }, 
                x: { duration: duration / 2, repeat: Infinity, ease: 'easeInOut' } 
              }}
            />
          );
        }
        if (effect === 'bubbles') {
          const size = 10 + Math.random() * 15;
          return (
            <motion.div
              key={i}
              className="absolute bottom-0 rounded-full border border-blue-300/50 bg-blue-100/20 backdrop-blur-sm"
              style={{ left, width: size, height: size }}
              animate={{ y: ['110vh', '-10vh'], x: ['-20px', '20px', '-20px'] }}
              transition={{ 
                y: { duration, repeat: Infinity, delay, ease: 'linear' }, 
                x: { duration: duration / 2, repeat: Infinity, ease: 'easeInOut' } 
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
