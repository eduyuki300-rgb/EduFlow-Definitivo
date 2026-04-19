import { motion, AnimatePresence } from 'motion/react';
import Confetti from 'react-confetti';
import { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface LevelUpModalProps {
  level: number;
  onClose: () => void;
}

export const LevelUpModal = ({ level, onClose }: LevelUpModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <Confetti recycle={false} numberOfPieces={200} gravity={0.2} />
        
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5, y: 50 }}
          className="relative bg-linear-to-br from-indigo-600 to-purple-700 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4 border-4 border-yellow-400"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-black text-4xl w-24 h-24 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            {level}
          </div>
          
          <h2 className="mt-10 text-3xl font-black text-white drop-shadow-md uppercase tracking-wider">
            Level Up!
          </h2>
          <p className="text-indigo-100 mt-2 font-medium">
            Você alcançou o nível {level}. Continue focado para dominar o ENEM!
          </p>
          
          <div className="mt-6 flex gap-3 justify-center">
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">+100</span>
              <span className="text-xs text-indigo-200 uppercase">Gemas Bônus</span>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">Mastery</span>
              <span className="text-xs text-indigo-200 uppercase">Desbloqueado</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-8 w-full py-3 bg-white text-indigo-700 font-bold rounded-xl shadow-lg hover:bg-indigo-50 transition-colors"
          >
            Continuar Jornada
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
