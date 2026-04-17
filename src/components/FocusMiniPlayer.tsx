import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Pause, Play, Square, X, PictureInPicture2 } from 'lucide-react';
import { useFocus } from '../context/FocusContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const STORAGE_KEY = 'eduflow_pomodoro_mini_pos';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function FocusMiniPlayer() {
  const { activeTask, session, setView, setActiveTask } = useFocus();
  
  const [pos, setPos] = useState(() => {
    try { 
      const raw = localStorage.getItem(STORAGE_KEY); 
      if (!raw) return { x: 0, y: 0 }; // Using offsets from default bottom-left
      return JSON.parse(raw); 
    } catch { 
      return { x: 24, y: window.innerHeight - 150 }; 
    }
  });

  useEffect(() => { 
    try { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); 
    } catch {} 
  }, [pos]);

  if (!session) return null;

  const { 
    mode, status, timeLeft, timeElapsed, toggleTimer, focusDuration, 
    breakDuration, discardSessionTime 
  } = session;
  
  const displaySeconds = mode === 'pomodoro' ? timeLeft : timeElapsed;
  const isFocusMode = mode === 'pomodoro' && (status === 'running' || status === 'paused' || status === 'idle' || status === 'completed');
  const isBreakMode = mode === 'pomodoro' && (status === 'break' || status === 'break-paused');

  const handleClose = () => {
    if (status === 'running' || status === 'paused' || status === 'break' || status === 'break-paused') {
      const save = window.confirm('Encerrar sessão de foco?\n\nOK: Salvar progresso até agora\nCancelar: Descartar progresso desta sessão');
      if (save) {
        setView('widget');
      } else {
        discardSessionTime();
        setView('widget');
      }
    } else {
      setView('widget');
    }
  };

  const statusLabel = 
    status === 'idle' ? 'Pronto' : 
    status === 'paused' ? 'Pausado' : 
    status === 'break-paused' ? 'Pausa (pausada)' : 
    isBreakMode ? 'Pausa' : 
    status === 'completed' ? 'Concluído' : 
    'Foco';

  // Progress logic for mini ring
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const total = mode === 'pomodoro' ? (isBreakMode ? breakDuration : focusDuration) : 1;
  const progress = mode === 'pomodoro' ? (1 - (displaySeconds / total)) : 0;
  const offset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      onDragEnd={(_, info) => {
        setPos(prev => ({ 
          x: prev.x + info.offset.x, 
          y: prev.y + info.offset.y 
        }));
      }}
      className="fixed bottom-32 left-8 z-100 w-72 cursor-grab active:cursor-grabbing"
      style={{ x: pos.x, y: pos.y }}
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] border border-gray-100 p-4 flex items-center gap-4">
        {/* Progress Ring and Play/Pause */}
        <div className="relative shrink-0">
          <svg className="w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r="24" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
            <motion.circle
              cx="28" cy="28" r="24"
              stroke={isBreakMode ? '#3b82f6' : '#f97316'}
              strokeWidth="4" fill="transparent"
              strokeDasharray={2 * Math.PI * 24}
              initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
              animate={{ strokeDashoffset: (1 - progress) * (2 * Math.PI * 24) }}
              transition={{ duration: 1, ease: "linear" }}
              strokeLinecap="round"
            />
          </svg>
          <button
            onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all hover:scale-110 active:scale-90",
              isBreakMode ? "text-blue-500" : "text-orange-500"
            )}
          >
            {status === 'running' || status === 'break' 
              ? <Pause size={16} fill="currentColor" /> 
              : <Play size={16} fill="currentColor" className="ml-1" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">
              {statusLabel}
            </h4>
            <div className="flex gap-1">
              <button 
                onClick={() => {
                  const save = window.confirm('Encerrar sessão e salvar progresso?');
                  if (save) {
                    session.persistAndClose();
                  }
                }} 
                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                title="Parar e Salvar"
              >
                <Square size={14} />
              </button>
              <button onClick={handleClose} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Fechar">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tabular-nums tracking-tighter text-gray-900">
              {formatTime(displaySeconds)}
            </span>
            <p className="text-[10px] font-bold text-gray-400 truncate max-w-[80px]">
              {activeTask?.title || 'Foco Livre'}
            </p>
          </div>
        </div>

        {/* Action Toggle */}
        <div className="flex flex-col gap-1 border-l border-gray-100 pl-3 ml-2">
          <button 
            onClick={() => setView('full')}
            className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors hover:bg-gray-50 rounded-lg"
            title="Modo Imersivo"
          >
            <Maximize2 size={14} />
          </button>
          <button 
            onClick={() => setView('widget')}
            className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors hover:bg-gray-50 rounded-lg"
            title="Restaurar Widget"
          >
            <PictureInPicture2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
