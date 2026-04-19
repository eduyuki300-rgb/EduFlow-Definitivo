import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Pause, Play, RotateCcw, SkipForward, Square, BookOpen 
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';
import { cn } from '../lib/cn';
import { POMODORO_THEMES, PomodoroTheme } from '../utils/theme';
import confetti from 'canvas-confetti';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function FocusMode() {
  const { activeTask, session, setView, theme } = useFocus();
  
  if (!session) return null;
  
  const {
    mode,
    status,
    timeLeft,
    timeElapsed,
    focusDuration,
    breakDuration,
    toggleTimer,
    resetTimer,
    skipToComplete,
    pomodoros,
    estimatedPomodoros,
    notification,
    advanceNotification,
    persistAndClose,
    discardAndClose,
    isLocalUpdating,
  } = session;
  
  const isRunning = status === 'running' || status === 'break';
  const isFocusMode = mode === 'pomodoro' && ['running', 'paused', 'idle', 'completed'].includes(status);
  const isBreakMode = mode === 'pomodoro' && ['break', 'break-paused'].includes(status);
  const currentTheme = POMODORO_THEMES[theme as PomodoroTheme] || POMODORO_THEMES.classic;
  
  const displaySeconds = mode === 'pomodoro' ? timeLeft : timeElapsed;
  const currentDuration = isBreakMode ? breakDuration : focusDuration;
  const progress = mode === 'pomodoro' && currentDuration > 0 ? 1 - timeLeft / currentDuration : 0;

  const statusLabel = 
    status === 'idle' ? 'Pronto' : 
    status === 'paused' ? 'Pausado' : 
    status === 'break-paused' ? 'Pausa (pausada)' : 
    isBreakMode ? 'Pausa' : 
    status === 'completed' ? 'Concluído' : 
    'Foco';

  // AUDIT FIX: UI/UX - Imersão Cromática Dinâmica
  const handleClose = () => {
    if (status !== 'idle' && status !== 'completed') {
      const save = window.confirm('Encerrar sessão de foco?\n\nOK: Salvar progresso\nCancelar: Descartar');
      if (save) persistAndClose();
      else discardAndClose();
    } else {
      setView('widget');
    }
  };

  React.useEffect(() => {
    if (notification && notification.type === 'focus') {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
        colors: [currentTheme.focus.color, '#ffffff', '#fcd34d']
      });
    }
  }, [notification, currentTheme]);

  // ⌨️ AUDIT FIX: ACESSIBILIDADE - Suporte a tecla ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, persistAndClose, discardAndClose, setView]);

  const getBackgroundGradient = () => {
    if (status === 'running' || status === 'completed') {
      return isFocusMode
        ? currentTheme.focus.gradient 
        : currentTheme.break.gradient; 
    }
    if (isBreakMode) {
      return currentTheme.break.gradient; // Pausa Relaxante
    }
    // Idle / Paused (Sóbrio)
    return 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'; 
  };

  const isLightMode = !isRunning && status !== 'completed' && !isBreakMode;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        background: getBackgroundGradient()
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      className={cn(
        "fixed inset-0 z-200 flex flex-col overflow-hidden transition-all",
        isRunning && !isLightMode && "animate-pulse" // Adiciona respiração guiada apenas quando o timer estiver rodando escuro
      )}
    >
      {/* 🌟 AUDIT FIX: FEEDBACK DE SYNC (Micro-spinner sutil) */}
      <AnimatePresence>
        {isLocalUpdating && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 right-8 z-210 flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-xl"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <span className="text-[10px] text-white font-black tracking-[0.2em] uppercase">Cloud Sync</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-250 w-[90%] max-w-md"
          >
            <div className="bg-white text-gray-900 p-6 rounded-5xl shadow-2xl flex flex-col items-center gap-4 text-center border border-gray-100">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                notification.type === 'focus' ? POMODORO_THEMES[theme as PomodoroTheme]?.focus.lightBgClass + " " + POMODORO_THEMES[theme as PomodoroTheme]?.focus.lightTextClass : POMODORO_THEMES[theme as PomodoroTheme]?.break.lightBgClass + " " + POMODORO_THEMES[theme as PomodoroTheme]?.break.lightTextClass
              )}>
                <BookOpen size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black">{notification.title}</h3>
                <p className="text-sm text-gray-500 font-medium">{notification.description}</p>
              </div>
              <button 
                onClick={advanceNotification}
                className={cn(
                  "w-full py-4 rounded-3xl font-black text-white transition-all active:scale-95 shadow-lg",
                  notification.type === 'focus' ? POMODORO_THEMES[theme as PomodoroTheme]?.focus.bgClass + " " + POMODORO_THEMES[theme as PomodoroTheme]?.focus.shadowClass : POMODORO_THEMES[theme as PomodoroTheme]?.break.bgClass + " " + POMODORO_THEMES[theme as PomodoroTheme]?.break.shadowClass
                )}
              >
                {notification.actionLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-8 border-b transition-colors",
        isLightMode ? "border-gray-100" : "border-white/10"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleClose}
            className={cn(
              "p-4 rounded-2xl transition-all active:scale-90",
              isLightMode ? "bg-gray-50 text-gray-400 hover:text-gray-900" : "bg-white/10 text-white/50 hover:text-white"
            )}
          >
            <X size={24} />
          </button>
          <div>
            <h1 className={cn("text-xl font-black", isLightMode ? "text-gray-900" : "text-white")}>
              {activeTask?.title || 'Foco Livre'}
            </h1>
            <p className={cn("text-[10px] font-black uppercase tracking-[0.3em]", isLightMode ? "text-gray-400" : "text-white/40")}>
             Sessão Imersiva
            </p>
          </div>
        </div>
        
        {/* Pomodoro Dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: estimatedPomodoros }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-500",
                i < pomodoros 
                  ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" 
                  : (isLightMode ? "bg-gray-200" : "bg-white/20")
              )}
            />
          ))}
        </div>
      </div>

      {/* Main Timer Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="relative z-10">
          <div className={cn(
            "absolute -inset-24 rounded-full blur-[100px] transition-all duration-1000",
            isRunning && isFocusMode && 'bg-white/30 scale-125',
            isRunning && isBreakMode && 'bg-white/20 scale-110',
            !isRunning && 'opacity-0'
          )} />
          
          <svg className="relative w-80 h-80 -rotate-90">
            <circle 
              cx="160" cy="160" r="142" 
              stroke={isLightMode ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.1)"}
              strokeWidth="12" fill="transparent" 
            />
            <motion.circle
              cx="160" cy="160" r="142"
              stroke="white"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 142}
              initial={{ strokeDashoffset: 2 * Math.PI * 142 }}
              animate={{ strokeDashoffset: (1 - progress) * (2 * Math.PI * 142) }}
              transition={{ duration: 1, ease: 'linear' }}
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* AUDIT FIX: UI/UX - Render Otimizado & Suave */}
            <motion.span
              key={Math.floor(displaySeconds / 60)} // Re-render visual apenas no minuto
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-[7rem] sm:text-[11rem] font-black tracking-tighter tabular-nums mx-4",
                isLightMode ? "text-gray-900" : "text-white"
              )}
            >
              <span className="opacity-100">{formatTime(displaySeconds)}</span>
            </motion.span>
            
            <motion.div 
              animate={{ opacity: isRunning ? [0.5, 1, 0.5] : 1 }}
              transition={{ repeat: Infinity, duration: 3 }}
              className={cn(
                "mt-6 rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em] backdrop-blur-md border",
                isLightMode 
                  ? "border-gray-100 bg-white/50 text-gray-500" 
                  : "border-white/20 bg-white/10 text-white"
              )}
            >
              {statusLabel}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={cn(
        "p-12 transition-colors",
        isLightMode ? "bg-white border-t border-gray-100" : "bg-transparent"
      )}>
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={resetTimer}
            className={cn(
              "rounded-3xl p-6 transition-all active:scale-90",
              isLightMode ? "bg-gray-50 text-gray-400 hover:text-gray-900" : "bg-white/10 text-white/40 hover:text-white"
            )}
            title="Reiniciar"
          >
            <RotateCcw size={28} />
          </button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={toggleTimer}
            disabled={isLocalUpdating}
            className={cn(
              "rounded-[3rem] p-10 text-white shadow-2xl transition-all duration-500",
              isLightMode ? "bg-gray-900" : "bg-white text-gray-900",
              isLocalUpdating && "opacity-50 cursor-wait"
            )}
          >
            {isRunning 
              ? <Pause size={40} fill="currentColor" /> 
              : <Play size={40} fill="currentColor" className="ml-2" />
            }
          </motion.button>

          <button
            onClick={skipToComplete}
            disabled={mode !== 'pomodoro' || status === 'idle' || status === 'completed'}
            className={cn(
              "rounded-3xl p-6 transition-all active:scale-90 disabled:opacity-10 cursor-pointer pointer-events-auto",
              isLightMode ? "bg-gray-50 text-gray-400 hover:text-gray-900" : "bg-white/10 text-white/40 hover:text-white"
            )}
            title="Pular"
          >
            <SkipForward size={28} />
          </button>
        </div>
        
        <div className="mt-8 flex justify-center">
           <p className={cn(
             "text-xs font-bold transition-opacity",
             isLightMode ? "text-gray-400" : "text-white/30",
             isLocalUpdating ? "opacity-100" : "opacity-0"
           )}>
             Sincronizando conquistas...
           </p>
        </div>
      </div>
    </motion.div>
  );
}