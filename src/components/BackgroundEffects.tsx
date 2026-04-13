import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type BgEffect = 'none' | 'rain' | 'snow' | 'bubbles';

const COUNT = 35;

function effectSeed(effect: BgEffect): number {
  switch (effect) {
    case 'rain': return 1;
    case 'snow': return 2;
    case 'bubbles': return 3;
    default: return 0;
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
      
      // Different configurations based on effect
      let duration = 3 + unit(i, effect, 3) * 4;
      let size = 0;
      let opacity = 0.5 + unit(i, effect, 5) * 0.5;

      if (effect === 'rain') {
        duration = 0.6 + unit(i, effect, 3) * 0.4;
        size = 30 + unit(i, effect, 4) * 40; // Rain drop length
      } else if (effect === 'snow') {
        duration = 4 + unit(i, effect, 3) * 6;
        size = 3 + unit(i, effect, 4) * 6; // Snowflake size
      } else if (effect === 'bubbles') {
        duration = 6 + unit(i, effect, 3) * 8;
        size = 15 + unit(i, effect, 4) * 40; // Bubble diameter
      }

      return { left, delay, duration, size, opacity };
    });
  }, [effect]);

  if (effect === 'none') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-transparent to-white/10">
      {particles.map((p, i) => {
        if (effect === 'rain') {
          return (
            <motion.div
              key={`rain-${i}`}
              className="absolute top-0 w-[1.5px] rounded-full bg-gradient-to-b from-transparent via-blue-300/40 to-blue-400/80 filter drop-shadow-sm"
              style={{ left: p.left, height: p.size, opacity: p.opacity }}
              animate={{ y: ['-20vh', '120vh'], x: ['0px', '20px'] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
            />
          );
        }
        if (effect === 'snow') {
          return (
            <motion.div
              key={`snow-${i}`}
              className="absolute top-0 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              style={{ left: p.left, width: p.size, height: p.size, opacity: p.opacity }}
              animate={{ y: ['-10vh', '110vh'], x: ['-20px', '20px', '-10px', '10px'] }}
              transition={{
                y: { duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' },
                x: { duration: p.duration / 1.5, repeat: Infinity, delay: p.delay, ease: 'easeInOut' },
              }}
            />
          );
        }
        if (effect === 'bubbles') {
          return (
            <motion.div
              key={`bubble-${i}`}
              className="absolute bottom-0 rounded-full border border-white/40 bg-gradient-to-tr from-white/10 to-white/30 backdrop-blur-[2px] shadow-lg"
              style={{ left: p.left, width: p.size, height: p.size, opacity: p.opacity }}
              animate={{ y: ['110vh', '-10vh'], x: ['-30px', '30px', '-15px'] }}
              transition={{
                y: { duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' },
                x: { duration: p.duration / 2, repeat: Infinity, delay: p.delay, ease: 'easeInOut' },
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
