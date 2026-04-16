import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, Maximize2, X, Timer, ChevronUp, ChevronDown, 
  Settings, PictureInPicture2, RotateCcw, SkipForward 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useFocus } from '../context/FocusContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PomodoroWidgetProps {
  tasks: Task[];
}

export function PomodoroWidget({ tasks }: PomodoroWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotification, setShowNotification] = useState<{ type: 'focus' | 'break', active: boolean }>({ type: 'focus', active: false });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { activeTask, session, setView, setActiveTask } = useFocus();
  
  if (!session) return null;

  const {
    mode, setMode, status, timeLeft, timeElapsed, focusDuration, setFocusDuration,
    breakDuration, setBreakDuration, longBreakDuration, setLongBreakDuration,
    isStrictMode, setIsStrictMode, toggleTimer, resetTimer, skipToComplete,
    startBreak, focusCycles
  } = session;

  const isRunning = status === 'running' || status === 'break';
  const isFocusMode = mode === 'pomodoro' && (status === 'running' || status === 'paused' || status === 'idle' || status === 'finished');
  const isBreakMode = mode === 'pomodoro' && (status === 'break' || status === 'break-paused');

  // Alarm Sound Effect
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // Monitor status to trigger notifications
  useEffect(() => {
    if (status === 'finished') {
      audioRef.current?.play().catch(e => console.log('Audio wait for interaction', e));
      setShowNotification({ type: 'focus', active: true });
    } else if (status === 'idle' && (timeLeft === focusDuration)) {
       // This could be end of break or reset
    }
  }, [status, timeLeft, focusDuration]);

  const activeTasks = tasks.filter(t => t.status !== 'concluida');

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentDuration = isBreakMode ? breakDuration : focusDuration;
  const progress = mode === 'pomodoro' ? (1 - (timeLeft / currentDuration)) : 0;

  const handleTaskChange = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId) || null;
    setActiveTask(task);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
            className="w-80 bg-white/95 backdrop-blur-xl rounded-[2rem] p-6 mb-4 overflow-hidden relative border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
          >
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
                  isFocusMode ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"
                )}>
                  <Timer size={16} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">
                    {isBreakMode ? 'Descanso' : 'Foco Profundo'}
                  </h3>
                  {mode === 'pomodoro' && (
                    <p className="text-[9px] font-bold text-gray-300 mt-1 uppercase">Ciclo {focusCycles + 1}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                  title="Configurações"
                >
                  <Settings size={16} />
                </button>
                <button 
                  onClick={() => setView('mini')}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                  title="Janela Flutuante"
                >
                  <PictureInPicture2 size={16} />
                </button>
                <button 
                  onClick={() => setView('full')}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                  title="Modo Imersivo"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            {/* Task Selector */}
            <div className="mb-6 relative z-10">
              <div className="relative group">
                <select
                  value={activeTask?.id || ''}
                  onChange={(e) => handleTaskChange(e.target.value)}
                  className="w-full text-xs font-bold bg-gray-50/50 border border-gray-100 rounded-2xl p-3 outline-none focus:ring-4 focus:ring-orange-500/5 transition-all appearance-none text-gray-900 pr-10"
                >
                  <option value="">🎯 Foco livre ou selecione tarefa...</option>
                  {activeTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Main Timer Display */}
            <div className="flex justify-center mb-8 relative z-10">
              <div className="relative">
                {/* Aura Respiratória */}
                <div className={cn(
                  "absolute -inset-8 rounded-full blur-2xl transition-all duration-1000",
                  isRunning && isFocusMode && "bg-orange-500/10 scale-110",
                  isRunning && isBreakMode && "bg-blue-500/10 scale-110",
                  !isRunning && "opacity-0"
                )} />
                
                <svg className="w-44 h-44 transform -rotate-90 relative z-10">
                  <circle cx="88" cy="88" r="80" stroke="#f8fafc" strokeWidth="10" fill="transparent" />
                  <motion.circle
                    cx="88" cy="88" r="80"
                    stroke={isFocusMode ? '#f97316' : '#3b82f6'}
                    strokeWidth="10" fill="transparent"
                    strokeDasharray={2 * Math.PI * 80}
                    initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                    animate={{ strokeDashoffset: (1 - progress) * (2 * Math.PI * 80) }}
                    transition={{ duration: 1, ease: "linear" }}
                    strokeLinecap="round"
                  />
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                  <motion.span 
                    key={status}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl font-black tabular-nums text-gray-900 tracking-tighter"
                  >
                    {formatTime(mode === 'pomodoro' ? timeLeft : timeElapsed)}
                  </motion.span>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mt-2 border",
                    isFocusMode ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {status === 'running' ? 'Ativo' : status === 'paused' ? 'Pausado' : status === 'break' ? 'Destaque' : status === 'finished' ? 'Concluído' : 'Pronto'}
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Pop-up */}
            <AnimatePresence>
              {showNotification.active && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute inset-x-6 top-32 z-50 bg-white shadow-2xl rounded-3xl p-4 border border-orange-100 text-center"
                >
                  <p className="text-sm font-bold text-gray-900 mb-3">
                    {showNotification.type === 'focus' ? '🎯 Foco Concluído!' : '☕ Pausa Encerrada!'}
                  </p>
                  <div className="flex gap-2">
                    {showNotification.type === 'focus' ? (
                      <button 
                        onClick={() => { setShowNotification({ ...showNotification, active: false }); startBreak(); }}
                        className="flex-1 bg-orange-500 text-white text-[10px] font-bold py-2 rounded-xl hover:bg-orange-600 transition-colors"
                      >
                        Começar Pausa
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setShowNotification({ ...showNotification, active: false }); resetTimer(); }}
                        className="flex-1 bg-blue-500 text-white text-[10px] font-bold py-2 rounded-xl hover:bg-blue-600 transition-colors"
                      >
                        Próximo Ciclo
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 relative z-10">
              <button 
                onClick={resetTimer}
                className="p-4 rounded-2xl bg-gray-50 text-gray-300 hover:text-gray-900 transition-all active:scale-95 border border-gray-100"
                title="Reiniciar"
              >
                <RotateCcw size={18} />
              </button>
              
              <button
                onClick={toggleTimer}
                className={cn(
                  "p-6 rounded-[2rem] text-white transition-all hover:scale-105 active:scale-95 shadow-xl",
                  isFocusMode ? "bg-orange-500 shadow-orange-500/20" : "bg-blue-500 shadow-blue-500/20"
                )}
              >
                {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>

              <button 
                onClick={skipToComplete}
                disabled={mode !== 'pomodoro' || status !== 'running'}
                className="p-4 rounded-2xl bg-gray-50 text-gray-300 hover:text-gray-900 transition-all active:scale-95 border border-gray-100 disabled:opacity-30"
                title="Pular"
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Settings Sub-Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 pt-6 border-t border-gray-100 overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Foco (min)</label>
                        <input 
                          type="number" 
                          value={focusDuration / 60} 
                          onChange={(e) => setFocusDuration(Number(e.target.value) * 60)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Pausa (min)</label>
                        <input 
                          type="number" 
                          value={breakDuration / 60} 
                          onChange={(e) => setBreakDuration(Number(e.target.value) * 60)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Início Automático</span>
                      <button 
                        onClick={() => setIsStrictMode(!isStrictMode)}
                        className={cn(
                          "w-10 h-5 rounded-full relative transition-colors",
                          isStrictMode ? "bg-emerald-500" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                          isStrictMode ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-16 w-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 relative",
          isRunning 
            ? "bg-orange-500 text-white shadow-orange-500/20" 
            : "bg-white text-gray-400 border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:bg-gray-50"
        )}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <ChevronDown size={28} />
            </motion.div>
          ) : (
            <motion.div key="timer" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Timer size={28} />
              {isRunning && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-white rounded-full" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
