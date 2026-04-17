import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Pause, Play, RotateCcw, SkipForward, Square, BookOpen 
} from 'lucide-react';
import { useFocus } from '../context/FocusContext';
import { cn } from '../lib/cn';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function FocusMode() {
  const { activeTask, session, setView, setActiveTask } = useFocus();
  
  if (!session) return null;
  
  const {
    mode,
    status,
    timeLeft,
    timeElapsed,
    focusDuration,
    breakDuration,
    setFocusDuration,
    setBreakDuration,
    isStrictMode,
    setIsStrictMode,
    toggleTimer,
    resetTimer,
    skipToComplete,
    focusCycles,
    notification,
    advanceNotification,
    persistAndClose,
    discardAndClose,
  } = session;
  
  const isRunning = status === 'running' || status === 'break';
  const isFocusMode = mode === 'pomodoro' && ['running', 'paused', 'idle', 'completed'].includes(status);
  const isBreakMode = mode === 'pomodoro' && ['break', 'break-paused'].includes(status);
  
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

  const pomodoros = activeTask?.pomodoros ?? 0;
  const estimatedPomodoros = activeTask?.estimatedPomodoros ?? 4;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-200 bg-white flex flex-col"
    >
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-orange-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3">
              <span className="font-bold">{notification.title}</span>
              <button 
                onClick={advanceNotification}
                className="bg-white text-orange-500 px-4 py-1.5 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all"
              >
                {notification.actionLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (status === 'running' || status === 'break' || status === 'paused' || status === 'break-paused') {
                const save = window.confirm('Encerrar sessão de foco?\n\nOK: Salvar progresso\nCancelar: Descartar');
                if (save) {
                  persistAndClose();
                } else {
                  discardAndClose();
                }
              } else {
                setView('widget');
              }
            }}
            className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <X size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {activeTask?.title || 'Foco Livre'}
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
             Modo Imersivo
            </p>
          </div>
        </div>
        
        {/* Pomodoro Dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: estimatedPomodoros }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                i < pomodoros 
                  ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" 
                  : "bg-gray-200"
              )}
            />
          ))}
          <span className="ml-2 text-xs font-bold text-gray-400">
            {pomodoros}/{estimatedPomodoros}
          </span>
        </div>
      </div>

      {/* Main Timer Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          <div className={cn(
            "absolute -inset-16 rounded-full blur-3xl transition-all duration-1000",
            isRunning && isFocusMode && 'bg-orange-500/10 scale-110',
            isRunning && isBreakMode && 'bg-blue-500/10 scale-110',
            !isRunning && 'opacity-0'
          )} />
          
          <svg className="relative w-80 h-80 -rotate-90">
            <circle 
              cx="160" 
              cy="160" 
              r="140" 
              stroke="#f1f5f9" 
              strokeWidth="16" 
              fill="transparent" 
            />
            <motion.circle
              cx="160"
              cy="160"
              r="140"
              stroke={isFocusMode ? '#f97316' : '#3b82f6'}
              strokeWidth="16"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 140}
              initial={{ strokeDashoffset: 2 * Math.PI * 140 }}
              animate={{ strokeDashoffset: (1 - progress) * (2 * Math.PI * 140) }}
              transition={{ duration: 1, ease: 'linear' }}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={status}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-7xl font-black tracking-tighter text-gray-900 tabular-nums"
            >
              {formatTime(displaySeconds)}
            </motion.span>
            <div className={cn(
              "mt-4 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-widest",
              isFocusMode ? "border-orange-100 bg-orange-50 text-orange-600" : "border-blue-100 bg-blue-50 text-blue-600"
            )}>
              {statusLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-8 border-t border-gray-100">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => {
              if (status === 'running' || status === 'break' || status === 'paused' || status === 'break-paused') {
                const save = window.confirm('Encerrar e salvar progresso?');
                if (save) {
                  persistAndClose();
                } else {
                  discardAndClose();
                }
              } else {
                setView('widget');
              }
            }}
            className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-gray-300 hover:text-red-500 transition-all active:scale-95"
            title="Encerrar"
          >
            <Square size={24} />
          </button>

          <button
            onClick={resetTimer}
            className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-gray-300 hover:text-gray-900 transition-all active:scale-95"
            title="Reiniciar"
          >
            <RotateCcw size={24} />
          </button>

          <button
            onClick={toggleTimer}
            className={cn(
              "rounded-[3rem] p-8 text-white shadow-2xl transition-all hover:scale-105 active:scale-95",
              isFocusMode 
                ? "bg-orange-500 shadow-orange-500/20" 
                : "bg-blue-500 shadow-blue-500/20"
            )}
          >
            {isRunning 
              ? <Pause size={32} fill="currentColor" /> 
              : <Play size={32} fill="currentColor" className="ml-1" />
            }
          </button>

          <button
            onClick={skipToComplete}
            disabled={mode !== 'pomodoro' || status !== 'running'}
            className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-gray-300 hover:text-gray-900 transition-all active:scale-95 disabled:opacity-30"
            title="Pular"
          >
            <SkipForward size={24} />
          </button>

          <button
            onClick={() => setView('mini')}
            className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-gray-300 hover:text-gray-900 transition-all active:scale-95"
            title="Minimizar"
          >
            <BookOpen size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}