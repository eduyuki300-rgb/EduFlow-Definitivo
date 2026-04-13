import React, { useMemo } from 'react';
import { motion } from 'motion/react';

export type BgEffect = 'none' | 'rain' | 'snow' | 'bubbles';

const COUNT = 25;

function effectSeed(effect: BgEffect): number {
  switch (effect) {
    case 'rain':
      return 1;
    case 'snow':
      return 2;
    case 'bubbles':
      return 3;
    default:
      return 0;
  }
}

/** Deterministic pseudo-random in [0, 1) from index + effect (stable across re-renders). */
function unit(i: number, effect: BgEffect, salt: number): number {
  const s = effectSeed(effect) * 10007 + i * 83492791 + salt * 2654435761;
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

export function BackgroundEffects({ effect }: { effect: BgEffect }) {
  const particles = useMemo(() => {
    if (effect === 'none') return [];
    return Array.from({ length: COUNT }, (_, i) => {
      const left = `${unit(i, effect, 1) * 100}%`;
      const delay = unit(i, effect, 2) * 5;
      const duration =
        effect === 'rain' ? 0.5 + unit(i, effect, 3) * 0.5 : 3 + unit(i, effect, 3) * 4;
      const bubbleSize = effect === 'bubbles' ? 10 + unit(i, effect, 4) * 15 : 0;
      return { left, delay, duration, bubbleSize };
    });
  }, [effect]);

  if (effect === 'none') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p, i) => {
        if (effect === 'rain') {
          return (
            <motion.div
              key={`rain-${i}`}
              className="absolute top-0 h-12 w-[2px] rounded-full bg-blue-400/40"
              style={{ left: p.left }}
              animate={{ y: ['-10vh', '110vh'] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
            />
          );
        }
        if (effect === 'snow') {
          return (
            <motion.div
              key={`snow-${i}`}
              className="absolute top-0 h-2 w-2 rounded-full bg-white opacity-80 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
              style={{ left: p.left }}
              animate={{ y: ['-10vh', '110vh'], x: ['-15px', '15px', '-15px'] }}
              transition={{
                y: { duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' },
                x: { duration: p.duration / 2, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          );
        }
        if (effect === 'bubbles') {
          const size = p.bubbleSize;
          return (
            <motion.div
              key={`bubble-${i}`}
              className="absolute bottom-0 rounded-full border border-blue-300/50 bg-blue-100/20 backdrop-blur-sm"
              style={{ left: p.left, width: size, height: size }}
              animate={{ y: ['110vh', '-10vh'], x: ['-20px', '20px', '-20px'] }}
              transition={{
                y: { duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' },
                x: { duration: p.duration / 2, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
