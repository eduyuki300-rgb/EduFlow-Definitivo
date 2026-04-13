import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Square,
  Settings,
  X,
  Coffee,
  CheckCircle2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square as SquareIcon,
} from 'lucide-react';
import { Task } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SUBJECT_INFO } from '../constants/subjects';
import type { FocusSessionApi, FocusTheme } from '../hooks/useFocusSession';
import { useFocusSession } from '../hooks/useFocusSession';
import { FocusMiniPlayer } from './FocusMiniPlayer';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SUBJECT_TOP_GLOW: Record<string, string> = {
  Geral: 'bg-slate-400/25',
  Biologia: 'bg-emerald-500/30',
  Física: 'bg-sky-500/30',
  Química: 'bg-violet-500/30',
  Matemática: 'bg-rose-500/35',
  Linguagens: 'bg-amber-400/25',
  Humanas: 'bg-orange-500/25',
  Redação: 'bg-teal-500/28',
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface FocusModeFullProps {
  task: Task;
  session: FocusSessionApi;
  onMinimize: () => void;
  onClose: () => void;
  playSuccessSound: () => void;
}

function FocusModeFull({ task, session, onMinimize, onClose, playSuccessSound }: FocusModeFullProps) {
  const {
    mode,
    setMode,
    status,
    theme,
    setTheme,
    focusDuration,
    setFocusDuration,
    breakDuration,
    setBreakDuration,
    timeLeft,
    timeElapsed,
    sessionLiquidTime,
    toggleTimer,
    resetTimer,
    skipToComplete,
    startBreak,
    skipBreakNewFocus,
  } = session;

  const [showSettings, setShowSettings] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(true);

  const subjectInfo = SUBJECT_INFO[task.subject] || SUBJECT_INFO.Geral;
  const topGlow = SUBJECT_TOP_GLOW[task.subject] ?? SUBJECT_TOP_GLOW.Geral;

  const toggleSubtaskItem = async (groupId: string, itemId: string) => {
    let wasCompleted = false;
    const baseSubtasks = task.subtasks ?? [];
    const updatedSubtasks = baseSubtasks.map((st) => {
      if (st.id === groupId) {
        return {
          ...st,
          items: st.items.map((item) => {
            if (item.id === itemId) {
              if (!item.completed) wasCompleted = true;
              return { ...item, completed: !item.completed };
            }
            return item;
          }),
        };
      }
      return st;
    });
    try {
      await updateDoc(doc(db, 'tasks', task.id), { subtasks: updatedSubtasks, updatedAt: serverTimestamp() });
      if (wasCompleted) playSuccessSound();
    } catch (error) {
      console.error('Error updating subtask', error);
    }
  };

  const shellClass = (() => {
    switch (theme) {
      case 'aurora':
        return 'bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white';
      case 'forest':
        return 'bg-gradient-to-b from-stone-950 via-emerald-950/80 to-stone-950 text-emerald-50';
      case 'minimal':
        return 'bg-gradient-to-b from-stone-100 via-white to-stone-100 text-stone-900';
      case 'midnight':
      default:
        return 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white';
    }
  })();

  const isLight = theme === 'minimal';
  const glassPanel = isLight
    ? 'border-stone-200/80 bg-white/90 shadow-lg backdrop-blur-xl'
    : 'border-white/10 bg-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl';
  const subtleText = isLight ? 'text-stone-500' : 'text-white/55';
  const ringColor = isLight ? 'text-pastel-blue' : 'text-white';
  const secondaryControl = isLight
    ? 'border border-stone-300/90 bg-white text-stone-700 shadow-sm hover:bg-stone-50'
    : 'border border-white/35 bg-white/15 text-white shadow-[0_2px_12px_rgba(0,0,0,0.25)] hover:bg-white/25';

  const subjectChipClass = isLight
    ? cn('inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold', subjectInfo.tagColor)
    : 'inline-flex items-center gap-1 rounded-lg border border-white/25 bg-white/12 px-2.5 py-1 text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm';

  const progressTotal =
    mode === 'pomodoro' ? (status === 'break' ? breakDuration : focusDuration) : 1;
  const progressValue = mode === 'pomodoro' ? timeLeft : 0;
  const progressRatio = mode === 'pomodoro' && progressTotal > 0 ? progressValue / progressTotal : 0;
  const circumference = 2 * Math.PI * 168;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const handleCloseClick = async () => {
    await session.closeAfterPersist();
    onClose();
  };

  const hasSubtasks = (task.subtasks?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none font-sans',
        shellClass,
      )}
    >
      {!isLight && (
        <div
          className={cn('pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[140%] -translate-x-1/2 rounded-full blur-[120px]', topGlow)}
          aria-hidden
        />
      )}
      {theme === 'aurora' && !isLight && (
        <>
          <motion.div
            animate={{ x: ['-15%', '15%', '-15%'], opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="pointer-events-none absolute left-0 top-1/4 h-80 w-80 rounded-full bg-purple-500/20 blur-[100px]"
            style={{ willChange: 'transform, opacity' }}
          />
          <motion.div
            animate={{ x: ['15%', '-15%', '15%'], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="pointer-events-none absolute bottom-1/4 right-0 h-96 w-96 rounded-full bg-teal-500/15 blur-[110px]"
            style={{ willChange: 'transform, opacity' }}
          />
        </>
      )}
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          isLight
            ? 'bg-[radial-gradient(ellipse_75%_60%_at_50%_100%,transparent,rgba(0,0,0,0.04))]'
            : 'bg-[radial-gradient(ellipse_70%_55%_at_50%_100%,transparent,rgba(0,0,0,0.5))]',
        )}
        aria-hidden
      />

      <header className="relative z-20 mx-auto flex w-full max-w-3xl shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:gap-4 sm:px-8 sm:pb-3 sm:pt-6">
        <div className={cn('min-w-0 flex-1 rounded-2xl border px-3 py-2.5 sm:px-5 sm:py-4', glassPanel)}>
          <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em]', subtleText)}>Focando em</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={subjectChipClass}>
              <span>{subjectInfo.emoji}</span>
              {task.subject}
            </span>
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug tracking-tight sm:mt-2 sm:text-2xl">
            {task.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className={cn(
              'rounded-full p-2.5 transition-colors sm:p-3',
              isLight ? 'text-stone-600 hover:bg-stone-200/80' : 'text-white/80 hover:bg-white/10',
            )}
            aria-expanded={showSettings}
            aria-label="Configurações do timer"
          >
            <Settings size={20} />
          </button>
          <button
            type="button"
            onClick={onMinimize}
            className={cn(
              'rounded-full p-2.5 transition-colors sm:p-3',
              isLight ? 'text-stone-600 hover:bg-stone-200/80' : 'text-white/80 hover:bg-white/10',
            )}
            aria-label="Minimizar para mini player"
            title="Minimizar"
          >
            <Minimize2 size={20} />
          </button>
          <button
            type="button"
            onClick={handleCloseClick}
            className={cn(
              'rounded-full p-2.5 transition-colors sm:p-3',
              isLight ? 'text-stone-600 hover:bg-stone-200/80' : 'text-white/80 hover:bg-white/10',
            )}
            aria-label="Fechar sessão de foco"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/30"
              aria-label="Fechar configurações"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.22 }}
              className={cn(
                'fixed z-[120] max-h-[min(70dvh,28rem)] w-full overflow-y-auto border-t p-5 shadow-2xl sm:absolute sm:right-6 sm:top-24 sm:mt-0 sm:w-80 sm:rounded-2xl sm:border',
                'bottom-0 left-0 right-0 sm:bottom-auto',
                glassPanel,
                isLight ? 'sm:border-stone-200' : 'sm:border-white/10',
              )}
            >
              <h3 className={cn('mb-5 text-xs font-bold uppercase tracking-widest', subtleText)}>Configurações</h3>
              <div className="space-y-5">
                <div>
                  <label className={cn('mb-2 block text-xs font-medium', subtleText)}>Modo</label>
                  <div className={cn('flex rounded-xl p-1', isLight ? 'bg-stone-100' : 'bg-black/35')}>
                    <button
                      type="button"
                      onClick={() => setMode('pomodoro')}
                      className={cn(
                        'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors',
                        mode === 'pomodoro'
                          ? isLight
                            ? 'bg-white shadow-sm'
                            : 'bg-white/20 text-white'
                          : 'opacity-60 hover:opacity-100',
                      )}
                    >
                      Pomodoro
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('stopwatch')}
                      className={cn(
                        'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors',
                        mode === 'stopwatch'
                          ? isLight
                            ? 'bg-white shadow-sm'
                            : 'bg-white/20 text-white'
                          : 'opacity-60 hover:opacity-100',
                      )}
                    >
                      Cronômetro
                    </button>
                  </div>
                </div>
                {mode === 'pomodoro' && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={cn('mb-2 block text-xs font-medium', subtleText)}>Foco (min)</label>
                      <input
                        type="number"
                        value={focusDuration / 60}
                        onChange={(e) => setFocusDuration((parseInt(e.target.value, 10) || 25) * 60)}
                        className={cn(
                          'w-full rounded-xl border p-2.5 text-center text-sm font-semibold outline-none focus:ring-2',
                          isLight
                            ? 'border-stone-200 bg-white focus:ring-pastel-blue/40'
                            : 'border-white/15 bg-black/30 focus:ring-white/30',
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={cn('mb-2 block text-xs font-medium', subtleText)}>Pausa (min)</label>
                      <input
                        type="number"
                        value={breakDuration / 60}
                        onChange={(e) => setBreakDuration((parseInt(e.target.value, 10) || 5) * 60)}
                        className={cn(
                          'w-full rounded-xl border p-2.5 text-center text-sm font-semibold outline-none focus:ring-2',
                          isLight
                            ? 'border-stone-200 bg-white focus:ring-pastel-blue/40'
                            : 'border-white/15 bg-black/30 focus:ring-white/30',
                        )}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className={cn('mb-2 block text-xs font-medium', subtleText)}>Tema</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as FocusTheme)}
                    className={cn(
                      'w-full rounded-xl border p-2.5 text-sm font-medium outline-none focus:ring-2',
                      isLight
                        ? 'border-stone-200 bg-white focus:ring-pastel-blue/40'
                        : 'border-white/15 bg-black/30 focus:ring-white/30',
                    )}
                  >
                    <option value="midnight">Midnight</option>
                    <option value="aurora">Aurora</option>
                    <option value="forest">Forest</option>
                    <option value="minimal">Minimal (claro)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-[5] flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {status === 'finished' ? (
          <div className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 sm:max-w-md sm:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key="finished"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="flex flex-col items-center px-1 py-4 text-center sm:py-8"
              >
                <CheckCircle2 size={72} className={cn('mb-5', isLight ? 'text-emerald-600' : 'text-emerald-400')} />
                <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Foco concluído</h2>
                <p className={cn('mt-2 text-sm', subtleText)}>Respira. O que você quer fazer agora?</p>
                <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:mt-10">
                  <button
                    type="button"
                    onClick={() => startBreak()}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-transform hover:scale-[1.02]',
                      isLight ? 'bg-text-main text-white shadow-md' : 'bg-white text-slate-900 shadow-lg',
                    )}
                  >
                    <Coffee size={18} /> Pausa curta
                  </button>
                  <button
                    type="button"
                    onClick={() => skipBreakNewFocus()}
                    className={cn(
                      'rounded-2xl py-3.5 text-base font-semibold transition-colors',
                      isLight ? 'bg-stone-200/80 text-stone-800 hover:bg-stone-300/80' : 'bg-white/10 text-white hover:bg-white/15',
                    )}
                  >
                    Novo foco (pular pausa)
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseClick}
                    className={cn('py-3 text-sm font-medium opacity-70 hover:opacity-100', subtleText)}
                  >
                    Sair
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden px-5 pb-2 sm:max-w-3xl sm:px-8 sm:pb-3">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden py-2 sm:py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="timer"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="flex w-full flex-col items-center"
                >
              {mode === 'pomodoro' && (
                <div className="relative mx-auto flex w-full max-w-[min(100%,360px)] items-center justify-center">
                  <svg
                    viewBox="0 0 360 360"
                    className={cn(
                      'aspect-square w-[min(68vw,260px)] max-w-full -rotate-90 sm:w-[min(72vw,320px)] md:h-[360px] md:w-[360px]',
                      'max-h-[38dvh] sm:max-h-[min(48dvh,360px)] md:max-h-none',
                      ringColor,
                    )}
                    aria-hidden
                  >
                    <circle
                      cx="180"
                      cy="180"
                      r="168"
                      stroke="currentColor"
                      strokeOpacity={isLight ? 0.14 : 0.22}
                      strokeWidth="10"
                      fill="none"
                    />
                    <motion.circle
                      cx="180"
                      cy="180"
                      r="168"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={false}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.95, ease: 'linear' }}
                    />
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <motion.span
                      className={cn(
                        'font-light tabular-nums tracking-tighter',
                        'text-[clamp(2.25rem,11vw,3.25rem)] sm:text-6xl md:text-7xl',
                      )}
                      animate={status === 'running' ? { scale: [1, 1.008, 1] } : {}}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {formatTime(mode === 'pomodoro' ? timeLeft : timeElapsed)}
                    </motion.span>
                  </div>
                </div>
              )}

              {mode === 'stopwatch' && (
                <motion.span
                  className={cn(
                    'font-light tabular-nums tracking-tighter',
                    'text-[clamp(2.25rem,11vw,3.25rem)] sm:text-6xl md:text-7xl',
                  )}
                  animate={status === 'running' ? { scale: [1, 1.008, 1] } : {}}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {formatTime(timeElapsed)}
                </motion.span>
              )}

              <p className={cn('mt-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] sm:mt-5 sm:text-xs sm:tracking-[0.28em]', subtleText)}>
                {status === 'idle'
                  ? 'Pronto para focar'
                  : status === 'running'
                    ? mode === 'pomodoro'
                      ? 'Foco profundo'
                      : 'Cronômetro'
                    : status === 'paused'
                      ? 'Pausado'
                      : status === 'break'
                        ? 'Pausa'
                        : ''}
              </p>

              <div className="mt-6 flex items-center gap-3 sm:mt-10 sm:gap-8 md:mt-12 md:gap-10">
                <button
                  type="button"
                  onClick={resetTimer}
                  className={cn('rounded-full p-3.5 transition-colors sm:p-4', secondaryControl)}
                  aria-label="Zerar timer"
                >
                  <Square size={22} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={toggleTimer}
                  className={cn(
                    'flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem] md:h-[5.5rem] md:w-[5.5rem]',
                    isLight ? 'bg-text-main text-white' : 'bg-white text-slate-900',
                  )}
                  aria-label={status === 'running' || status === 'break' ? 'Pausar' : 'Iniciar'}
                >
                  {status === 'running' || status === 'break' ? (
                    <Pause size={28} fill="currentColor" className="size-7 sm:size-8 md:size-9" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-0.5 size-7 sm:ml-1 sm:size-8 md:ml-1.5 md:size-9" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={skipToComplete}
                  disabled={mode !== 'pomodoro' || status !== 'running'}
                  className={cn(
                    'rounded-full p-3.5 transition-colors disabled:pointer-events-none disabled:opacity-30 sm:p-4',
                    secondaryControl,
                  )}
                  aria-label="Concluir pomodoro agora"
                >
                  <CheckCircle2 size={22} strokeWidth={2.25} />
                </button>
              </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {hasSubtasks && (
          <div
            className={cn(
              'mx-auto mt-2 w-full max-w-md shrink-0 rounded-2xl border px-3 py-2.5 sm:mt-3 sm:px-4 sm:py-3',
              glassPanel,
            )}
          >
            <button
              type="button"
              onClick={() => setChecklistOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className={cn('text-xs font-bold uppercase tracking-wider opacity-80', isLight ? 'text-stone-800' : 'text-white')}>
                Checklist do módulo
              </span>
              {checklistOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {checklistOpen && (
              <div className="mt-2 max-h-[min(24dvh,11rem)] space-y-3 overflow-y-auto pr-1 sm:mt-3 sm:max-h-[min(32dvh,15rem)] custom-scrollbar">
                {(task.subtasks ?? []).map((group) => (
                  <div key={group.id} className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">{group.title}</p>
                    <div className="space-y-1">
                      {(group.items ?? []).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleSubtaskItem(group.id, item.id)}
                          className={cn(
                            'flex w-full items-start gap-2 rounded-lg py-1.5 text-left text-sm transition-colors',
                            isLight ? 'hover:bg-stone-100' : 'hover:bg-white/10',
                          )}
                        >
                          {item.completed ? (
                            <CheckSquare size={16} className="mt-0.5 shrink-0 text-pastel-blue" />
                          ) : (
                            <SquareIcon size={16} className="mt-0.5 shrink-0 opacity-40" />
                          )}
                          <span
                            className={cn(
                              'min-w-0 leading-snug',
                              item.completed
                                ? cn('line-through opacity-70', isLight ? 'text-stone-500' : 'text-white/50')
                                : isLight
                                  ? 'text-stone-800'
                                  : 'text-white/90',
                            )}
                          >
                            {item.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            )}
          </div>
        )}
      </div>

      <footer
        className={cn(
          'relative z-20 flex w-full shrink-0 flex-wrap justify-center gap-2 border-t px-4 py-3 sm:gap-3 sm:px-8 sm:py-4',
          isLight ? 'border-stone-200/80 bg-white/50' : 'border-white/10 bg-black/30',
        )}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-wrap justify-center gap-2 sm:flex-nowrap sm:gap-3">
        <div
          className={cn(
            'flex min-h-[5rem] min-w-0 flex-1 basis-[calc(50%-0.25rem)] flex-col justify-center rounded-xl border px-3 py-3 text-center sm:min-h-[5.5rem] sm:min-w-[10rem] sm:flex-none sm:basis-0 sm:grow sm:rounded-2xl sm:px-5 sm:py-4',
            glassPanel,
          )}
        >
          <p className={cn('text-[9px] font-bold uppercase leading-snug tracking-wide sm:text-[10px] sm:tracking-widest', subtleText)}>
            Pomodoros (módulo)
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{task.pomodoros ?? 0}</p>
        </div>
        <div
          className={cn(
            'flex min-h-[5rem] min-w-0 flex-1 basis-[calc(50%-0.25rem)] flex-col justify-center rounded-xl border px-3 py-3 text-center sm:min-h-[5.5rem] sm:min-w-[10rem] sm:flex-none sm:basis-0 sm:grow sm:rounded-2xl sm:px-5 sm:py-4',
            glassPanel,
          )}
        >
          <p className={cn('text-[9px] font-bold uppercase leading-snug tracking-wide sm:text-[10px] sm:tracking-widest', subtleText)}>
            Tempo focado (módulo)
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
            {Math.floor(((task.liquidTime ?? 0) + sessionLiquidTime) / 60)}m
          </p>
        </div>
        {(task.estimatedPomodoros ?? 0) > 0 && (
          <div
            className={cn(
              'flex min-h-[5rem] min-w-0 flex-1 basis-full flex-col justify-center rounded-xl border px-3 py-3 text-center sm:min-h-[5.5rem] sm:min-w-[10rem] sm:flex-none sm:basis-0 sm:grow sm:rounded-2xl sm:px-5 sm:py-4',
              glassPanel,
            )}
          >
            <p className={cn('text-[9px] font-bold uppercase leading-snug tracking-wide sm:text-[10px] sm:tracking-widest', subtleText)}>
              Meta pomodoros
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
              {(task.pomodoros ?? 0)}/{task.estimatedPomodoros}
            </p>
          </div>
        )}
        </div>
      </footer>
    </motion.div>
  );
}

export type FocusView = 'full' | 'minimized';

interface FocusSessionRootProps {
  task: Task;
  view: FocusView;
  onViewChange: (view: FocusView) => void;
  onClose: () => void;
  playSuccessSound: () => void;
}

export function FocusSessionRoot({ task, view, onViewChange, onClose, playSuccessSound }: FocusSessionRootProps) {
  const session = useFocusSession(task.id);

  const handleClose = async () => {
    await session.closeAfterPersist();
    onClose();
  };

  return (
    <AnimatePresence mode="sync">
      {view === 'full' && (
        <FocusModeFull
          key="focus-full"
          task={task}
          session={session}
          onMinimize={() => onViewChange('minimized')}
          onClose={onClose}
          playSuccessSound={playSuccessSound}
        />
      )}
      {view === 'minimized' && (
        <FocusMiniPlayer
          key="focus-mini"
          task={task}
          session={session}
          onExpand={() => onViewChange('full')}
          onClose={handleClose}
        />
      )}
    </AnimatePresence>
  );
}
