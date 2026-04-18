import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Award, Zap, Sparkles, X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface LevelUpModalProps {
  level: number;
  gems?: number;
  onClose: () => void;
}

export const LevelUpModal = ({ level, gems = 0, onClose }: LevelUpModalProps) => {
  useEffect(() => {
    // Explosão Inicial
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // Disparar de dois lados
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-250 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50, rotate: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[48px] shadow-2xl border border-white/50 dark:border-white/10 p-8 text-center relative overflow-hidden"
      >
        {/* Background Sparkle */}
        <div className="absolute inset-0 bg-linear-to-b from-orange-500/10 to-transparent pointer-events-none" />
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 h-10 w-10 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors z-20"
        >
          <X size={20} className="text-gray-400" />
        </button>

        <div className="relative z-10">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-linear-to-br from-orange-400 to-orange-600 rounded-4xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/40 mb-8"
          >
            <Award size={48} className="text-white" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-xl shadow-md rotate-12"
            >
              <Zap size={20} className="text-orange-700" fill="currentColor" />
            </motion.div>
          </motion.div>

          <motion.h2 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight"
          >
            NÍVEL {level}
          </motion.h2>
          
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8"
          >
            Você está evoluindo, Elite!
          </motion.p>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-1 gap-3 mb-8"
          >
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                   <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest text-left">Gemas Ganhas</span>
              </div>
              <span className="text-xl font-black text-blue-600 tabular-nums">+{gems}</span>
            </div>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:shadow-2xl transition-all"
          >
            Continuar Jornada
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
