import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Settings,
  SkipForward,
  Square,
  Timer,
  ChevronDown,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Task } from '../types';
import { useFocus } from '../context/FocusContext';
import { cn } from '../lib/cn';
import { SessionNotificationCard } from './focus/SessionNotificationCard';
import { playSuccessSound } from '../utils/audio';
import { POMODORO_THEMES, PomodoroTheme } from '../utils/theme';
import confetti from 'canvas-confetti';

interface PomodoroWidgetProps {
  tasks: Task[];
}

export function PomodoroWidget({ tasks }: PomodoroWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const { activeTask, session, setActiveTask, setView, view, theme, setTheme } = useFocus();

  if (!session) return null;

  const {
    mode,
    status,
    timeLeft,
    timeElapsed,
    focusDuration,
    setFocusDuration,
    breakDuration,
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

  const currentTheme = POMODORO_THEMES[theme as PomodoroTheme] || POMODORO_THEMES.classic;
  const themeConfig = isBreakMode ? currentTheme.break : currentTheme.focus;

  useEffect(() => {
    if (notification && view === 'widget') {
      if (notification.type === 'focus') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 },
          colors: [currentTheme.focus.color, '#fbbf24', '#f8fafc']
        });
      }
      playSuccessSound(false); // Som triunfal para fim de ciclo
      setIsExpanded(true);
    }
  }, [notification, view, currentTheme]);

  const activeTasks = tasks.filter((task) => task.status !== 'concluida');

  const displaySeconds = timeLeft;
  const currentDuration = isBreakMode ? breakDuration : focusDuration;
  const progress = mode === 'pomodoro' && currentDuration > 0 ? 1 - timeLeft / currentDuration : 0;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleTaskChange = (taskId: string) => {
    const nextTask = tasks.find((task) => task.id === taskId) ?? null;
    setActiveTask(nextTask);
  };

  return (
    <div className="fixed bottom-6 right-6 z-80 flex flex-col items-end">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="active-task-card"
            initial={{ opacity: 0, y: 20, scale: 0.92, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.92, filter: 'blur(10px)' }}
            className="relative mb-4 w-80 overflow-hidden rounded-4xl border border-gray-100 bg-white/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          >
            <div className="relative z-10 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl shadow-sm',
                    themeConfig.lightBgClass, themeConfig.lightTextClass
                  )}
                >
                  <Timer size={16} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {isBreakMode ? 'Descanso' : 'Foco profundo'}
                  </h3>
                  {mode === 'pomodoro' && (
                    <p className="mt-1 text-[9px] font-bold uppercase text-gray-300">Ciclo {focusCycles + 1}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings((current) => !current)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  title="Configurações"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => setView('mini')}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  title="Janela flutuante"
                >
                  <PictureInPicture2 size={16} />
                </button>
                <button
                  onClick={() => setView('full')}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  title="Modo imersivo"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            <div className="relative z-10 mb-6">
              <div className="relative">
                <select
                  value={activeTask?.id || ''}
                  onChange={(event) => handleTaskChange(event.target.value)}
                  className={cn("w-full appearance-none rounded-2xl border border-gray-100 bg-gray-50/60 p-3 pr-10 text-xs font-bold text-gray-900 outline-none transition-all focus:ring-4", isFocusMode ? "focus:ring-black/5" : "focus:ring-black/5")}
                >
                  <option value="">🎯 Foco livre ou selecione tarefa...</option>
                  {activeTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            <div className="relative z-10 mb-8 flex justify-center">
              <div className="relative">
                <div
                  className={cn(
                    'absolute -inset-8 rounded-full blur-2xl transition-all duration-1000 opacity-20',
                    isRunning && 'scale-110', themeConfig.bgClass,
                    !isRunning && 'opacity-0'
                  )}
                />
                <svg className="relative z-10 h-44 w-44 -rotate-90">
                  <circle cx="88" cy="88" r="80" stroke="#f8fafc" strokeWidth="10" fill="transparent" />
                  <motion.circle
                    cx="88"
                    cy="88"
                    r="80"
                    stroke={themeConfig.color}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 80}
                    initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                    animate={{ strokeDashoffset: (1 - progress) * (2 * Math.PI * 80) }}
                    transition={{ duration: 1, ease: 'linear' }}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                  <motion.span
                    key={status}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl font-black tracking-tighter text-gray-900 tabular-nums"
                  >
                    {formatTime(displaySeconds)}
                  </motion.span>
                  <div
                    className={cn(
                      'mt-2 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest',
                      themeConfig.borderClass, themeConfig.lightBgClass, themeConfig.lightTextClass
                    )}
                  >
                    {status === 'running'
                      ? 'Ativo'
                      : status === 'paused'
                        ? 'Pausado'
                        : status === 'break'
                          ? 'Pausa'
                          : status === 'completed'
                            ? 'Concluído'
                            : 'Pronto'}
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {notification && view === 'widget' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  className="absolute inset-x-6 top-28 z-50"
                >
                  <SessionNotificationCard compact notification={notification} onAdvance={advanceNotification} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 flex items-center justify-center gap-4">
              <button
                onClick={() => setShowStopConfirm(true)}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-300 transition-all hover:text-red-500 active:scale-95"
                title="Encerrar"
              >
                <Square size={18} />
              </button>

              <button
                onClick={resetTimer}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-300 transition-all hover:text-gray-900 active:scale-95"
                title="Reiniciar"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={toggleTimer}
                className={cn(
                  'rounded-4xl p-6 text-white shadow-xl transition-all hover:scale-105 active:scale-95',
                  themeConfig.bgClass, themeConfig.shadowClass
                )}
              >
                {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>

              <button
                onClick={skipToComplete}
                disabled={mode !== 'pomodoro' || status === 'idle' || status === 'completed'}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-300 transition-all hover:text-gray-900 active:scale-95 disabled:opacity-30 cursor-pointer pointer-events-auto"
                title="Pular"
              >
                <SkipForward size={18} />
              </button>
            </div>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 overflow-hidden border-t border-gray-100 pt-6"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Foco (min)
                        </label>
                        <input
                          type="number"
                          value={focusDuration / 60}
                          onChange={(event) => setFocusDuration(Number(event.target.value) * 60)}
                          className="w-full rounded-xl border border-gray-100 bg-gray-50 p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/10"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Pausa (min)
                        </label>
                        <input
                          type="number"
                          value={breakDuration / 60}
                          onChange={(event) => setBreakDuration(Number(event.target.value) * 60)}
                          className="w-full rounded-xl border border-gray-100 bg-gray-50 p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Tema do Pomodoro
                      </label>
                      <div className="flex gap-2">
                        {Object.entries(POMODORO_THEMES).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => setTheme(key as PomodoroTheme)}
                            className={cn("w-8 h-8 rounded-full transition-all", theme === key ? "ring-2 ring-offset-2 scale-110" : "hover:scale-105")}
                            style={{ backgroundColor: config.focus.color, ringColor: config.focus.color }}
                            title={key}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Início automático
                      </span>
                      <button
                        onClick={() => setIsStrictMode(!isStrictMode)}
                        className={cn('relative h-5 w-10 rounded-full transition-colors', isStrictMode ? 'bg-emerald-500' : 'bg-gray-200')}
                      >
                        <div
                          className={cn(
                            'absolute top-1 h-3 w-3 rounded-full bg-white transition-all',
                            isStrictMode ? 'right-1' : 'left-1'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showStopConfirm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className="absolute inset-0 z-60 flex flex-col items-center justify-center bg-white/95 p-6 text-center backdrop-blur-md"
                >
                  <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border", themeConfig.borderClass, themeConfig.lightBgClass, themeConfig.lightTextClass)}>
                    <Square size={20} />
                  </div>
                  <h3 className="mb-1 text-sm font-black text-gray-900">Encerrar sessão?</h3>
                  <p className="mb-6 text-[10px] font-bold uppercase leading-relaxed text-gray-400">
                    Seu progresso será salvo e computado.
                  </p>
                  <div className="flex w-full flex-col gap-2">
                    <button
                      onClick={async () => {
                        await persistAndClose();
                        setShowStopConfirm(false);
                        setIsExpanded(false);
                      }}
                      className="w-full rounded-xl bg-gray-900 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-black"
                    >
                      Salvar e sair
                    </button>
                    <button
                      onClick={async () => {
                        await discardAndClose();
                        setShowStopConfirm(false);
                        setIsExpanded(false);
                      }}
                      className="w-full rounded-xl py-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-50"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={() => setShowStopConfirm(false)}
                      className="w-full rounded-xl py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsExpanded((current) => !current)}
        className={cn(
          'relative flex h-16 w-16 items-center justify-center rounded-3xl shadow-2xl transition-all hover:scale-110 active:scale-90',
          isRunning
            ? cn("text-white", themeConfig.bgClass, themeConfig.shadowClass)
            : 'border border-gray-100 bg-white text-gray-400 shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:bg-gray-50'
        )}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <ChevronDown size={28} />
            </motion.div>
          ) : (
            <motion.div
              key="timer"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <Timer size={28} />
              {isRunning && <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-4 border-white bg-emerald-500" />}
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
