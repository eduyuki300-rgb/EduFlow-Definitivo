import React, { useState, useMemo, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, Square, Settings, X, Coffee, CheckCircle2, Minimize2,
  ChevronDown, ChevronUp, CheckSquare, Square as SquareIcon,
  Volume2, VolumeX, RotateCcw, SkipForward,
} from 'lucide-react';
import { Task } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SUBJECT_INFO } from '../constants/subjects';
import type { FocusSessionApi } from '../hooks/useFocusSession';
import { useFocusSession } from '../hooks/useFocusSession';
import { FocusMiniPlayer } from './FocusMiniPlayer';
import { useAmbientSound, AMBIENT_SOUNDS, type AmbientSoundType } from '../hooks/useAmbientSound';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ─── SCENE CONFIG ───────────────────────────────────────────────────

export type SceneId = 'night' | 'ocean' | 'forest' | 'sunset' | 'lofi' | 'fireplace';

interface SceneInfo { id: SceneId; label: string; emoji: string; gradient: string; particle: 'stars' | 'bubbles' | 'leaves' | 'embers' | 'bokeh' | 'waves'; }

const SCENES: SceneInfo[] = [
  { id: 'night',     label: 'Noite',       emoji: '🌌', gradient: 'linear-gradient(180deg, #08081a 0%, #141432 35%, #1e1e4a 65%, #0a0a1a 100%)', particle: 'stars' },
  { id: 'ocean',     label: 'Oceano',      emoji: '🌊', gradient: 'linear-gradient(180deg, #0a1628 0%, #0f2847 30%, #164564 60%, #0a2840 100%)', particle: 'waves' },
  { id: 'forest',    label: 'Floresta',    emoji: '🌲', gradient: 'linear-gradient(180deg, #060f08 0%, #0f2014 35%, #1a3520 65%, #0a1a0c 100%)', particle: 'leaves' },
  { id: 'sunset',    label: 'Pôr do sol',  emoji: '🌅', gradient: 'linear-gradient(180deg, #1a0a2e 0%, #4a1942 25%, #c44a4a 55%, #e8964a 80%, #fcd34d 100%)', particle: 'embers' },
  { id: 'lofi',      label: 'Lo-fi',       emoji: '☕', gradient: 'linear-gradient(135deg, #1a0a30 0%, #2d1b50 40%, #1a1040 70%, #0f0820 100%)', particle: 'bokeh' },
  { id: 'fireplace', label: 'Lareira',     emoji: '🔥', gradient: 'linear-gradient(180deg, #0f0805 0%, #2a1008 30%, #451a0a 60%, #1a0a05 100%)', particle: 'embers' },
];

// ─── ACCENT COLORS ──────────────────────────────────────────────────

interface AccentColor { id: string; hex: string; label: string; }

const ACCENT_COLORS: AccentColor[] = [
  { id: 'white',   hex: '#ffffff', label: 'Branco' },
  { id: 'blue',    hex: '#60a5fa', label: 'Azul' },
  { id: 'purple',  hex: '#a78bfa', label: 'Roxo' },
  { id: 'emerald', hex: '#34d399', label: 'Verde' },
  { id: 'rose',    hex: '#fb7185', label: 'Rosa' },
  { id: 'amber',   hex: '#fbbf24', label: 'Âmbar' },
  { id: 'cyan',    hex: '#22d3ee', label: 'Ciano' },
];

// ─── PERSISTENCE ────────────────────────────────────────────────────

const readLS = (k: string, def: string) => { try { return localStorage.getItem(k) ?? def; } catch { return def; } };
const writeLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

// ─── HELPERS ────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function seededRandom(i: number, salt: number) {
  const x = Math.sin(i * 83492791 + salt * 2654435761) * 10000;
  return x - Math.floor(x);
}

// ─── SCENE PARTICLES ────────────────────────────────────────────────

function SceneParticles({ type }: { type: SceneInfo['particle'] }) {
  const particles = useMemo(() =>
    Array.from({ length: type === 'bokeh' ? 12 : 35 }, (_, i) => ({
      left: `${seededRandom(i, 1) * 100}%`,
      top: `${seededRandom(i, 2) * 100}%`,
      size: type === 'bokeh' ? 40 + seededRandom(i, 3) * 80 : 1.5 + seededRandom(i, 3) * 3,
      delay: seededRandom(i, 4) * 12,
      duration: type === 'stars' ? 3 + seededRandom(i, 5) * 6 : 8 + seededRandom(i, 5) * 14,
      opacity: 0.3 + seededRandom(i, 6) * 0.7,
    })),
  [type]);

  if (type === 'stars') return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full bg-white" style={{
          left: p.left, top: p.top, width: p.size, height: p.size,
          animation: `twinkle ${p.duration}s ${p.delay}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );

  if (type === 'embers') return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.slice(0, 20).map((p, i) => (
        <div key={i} className="absolute bottom-0 rounded-full bg-orange-400/80" style={{
          left: p.left, width: p.size * 1.5, height: p.size * 1.5,
          animation: `float-up ${p.duration}s ${p.delay}s infinite linear`,
        }} />
      ))}
    </div>
  );

  if (type === 'leaves') return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.slice(0, 15).map((p, i) => (
        <div key={i} className="absolute rounded-full bg-emerald-400/40" style={{
          left: p.left, top: p.top, width: p.size * 2.5, height: p.size * 2.5,
          animation: `drift-slow ${p.duration}s ${p.delay}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );

  if (type === 'waves') return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[0.3, 0.5, 0.7].map((top, i) => (
        <div key={i} className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" style={{
          top: `${top * 100}%`,
          animation: `wave-pulse ${6 + i * 2}s ${i * 1.5}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );

  if (type === 'bokeh') return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full bg-purple-300/10 backdrop-blur-[1px]" style={{
          left: p.left, top: p.top, width: p.size, height: p.size,
          animation: `bokeh-float ${p.duration}s ${p.delay}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.slice(0, 20).map((p, i) => (
        <div key={i} className="absolute bottom-0 rounded-full bg-orange-400/60" style={{
          left: p.left, width: p.size * 1.5, height: p.size * 1.5,
          animation: `float-up ${p.duration}s ${p.delay}s infinite linear`,
        }} />
      ))}
    </div>
  );
}

// ─── SETTINGS DRAWER ────────────────────────────────────────────────

interface SettingsDrawerProps {
  mode: string; setMode: (m: any) => void;
  focusDuration: number; setFocusDuration: (v: number) => void;
  breakDuration: number; setBreakDuration: (v: number) => void;
  accentHex: string; setAccentId: (id: string) => void;
  panelOpacity: number; setPanelOpacity: (v: number) => void;
  onClose: () => void;
}

function SettingsDrawer({ mode, setMode, focusDuration, setFocusDuration, breakDuration, setBreakDuration, accentHex, setAccentId, panelOpacity, setPanelOpacity, onClose }: SettingsDrawerProps) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[140] max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-slate-900/95 backdrop-blur-2xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] custom-scrollbar"
      >
        <div className="mx-auto w-12 h-1 rounded-full bg-white/20 mb-6" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-5">Configurações</h3>

        {/* Timer Mode */}
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-2">Modo</label>
        <div className="flex rounded-xl bg-black/30 p-1 mb-5">
          <button onClick={() => setMode('pomodoro')} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-colors', mode === 'pomodoro' ? 'bg-white/15 text-white' : 'text-white/50')}>Pomodoro</button>
          <button onClick={() => setMode('stopwatch')} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-colors', mode === 'stopwatch' ? 'bg-white/15 text-white' : 'text-white/50')}>Cronômetro</button>
        </div>

        {/* Durations */}
        {mode === 'pomodoro' && (
          <div className="flex gap-3 mb-5">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-2">Foco (min)</label>
              <input type="number" value={focusDuration / 60} onChange={(e) => setFocusDuration((parseInt(e.target.value, 10) || 25) * 60)}
                className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-center text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-white/20" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-2">Pausa (min)</label>
              <input type="number" value={breakDuration / 60} onChange={(e) => setBreakDuration((parseInt(e.target.value, 10) || 5) * 60)}
                className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-center text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-white/20" />
            </div>
          </div>
        )}

        {/* Accent Color */}
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-2">Cor do timer</label>
        <div className="flex gap-2 mb-5 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button key={c.id} onClick={() => setAccentId(c.id)} title={c.label}
              className={cn('w-8 h-8 rounded-full border-2 transition-transform hover:scale-110', accentHex === c.hex ? 'border-white scale-110 shadow-lg' : 'border-white/20')}
              style={{ background: c.hex }} />
          ))}
        </div>

        {/* Panel Opacity */}
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-2">Opacidade dos painéis</label>
        <input type="range" min="0.1" max="1" step="0.05" value={panelOpacity}
          onChange={e => setPanelOpacity(parseFloat(e.target.value))}
          className="w-full focus-range mb-1" />
        <p className="text-[10px] text-white/30 mb-4">{Math.round(panelOpacity * 100)}%</p>
      </motion.div>
    </>
  );
}

// ─── FOCUS MODE FULL ────────────────────────────────────────────────

interface FocusModeFullProps {
  task: Task;
  session: FocusSessionApi;
  onMinimize: () => void;
  onClose: () => void;
  playSuccessSound: () => void;
}

function FocusModeFull({ task, session, onMinimize, onClose, playSuccessSound }: FocusModeFullProps) {
  const { mode, setMode, status, focusDuration, setFocusDuration, breakDuration, setBreakDuration,
    timeLeft, timeElapsed, sessionLiquidTime, toggleTimer, resetTimer, skipToComplete, startBreak,
    skipBreakNewFocus } = session;

  // Visual state (persisted)
  const [sceneId, setSceneId] = useState<SceneId>(() => readLS('eduflow_scene', 'night') as SceneId);
  const [accentId, setAccentId] = useState(() => readLS('eduflow_accent', 'white'));
  const [panelOpacity, setPanelOpacity] = useState(() => parseFloat(readLS('eduflow_panel_opacity', '0.55')));
  const [showSettings, setShowSettings] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

  // Ambient sound
  const { soundType, setSoundType, volume, setVolume } = useAmbientSound();

  // Persist visual prefs
  const setScene = (id: SceneId) => { setSceneId(id); writeLS('eduflow_scene', id); };
  const setAccent = (id: string) => { setAccentId(id); writeLS('eduflow_accent', id); };
  const setOpacity = (v: number) => { setPanelOpacity(v); writeLS('eduflow_panel_opacity', String(v)); };

  const scene = SCENES.find(s => s.id === sceneId) ?? SCENES[0];
  const accent = ACCENT_COLORS.find(c => c.id === accentId) ?? ACCENT_COLORS[0];
  const subjectInfo = SUBJECT_INFO[task.subject] || SUBJECT_INFO.Geral;

  // Timer ring
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progressTotal = mode === 'pomodoro' ? (status === 'break' || status === 'break-paused' ? breakDuration : focusDuration) : 1;
  const progressValue = mode === 'pomodoro' ? timeLeft : 0;
  const progressRatio = progressTotal > 0 ? progressValue / progressTotal : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const timerDisplay = formatTime(mode === 'pomodoro' ? timeLeft : timeElapsed);
  const statusLabel = status === 'idle' ? 'Pronto para focar' : status === 'running' ? (mode === 'pomodoro' ? 'Foco profundo' : 'Cronômetro') : status === 'paused' ? 'Pausado' : (status === 'break' || status === 'break-paused') ? 'Pausa' : status === 'finished' ? 'Concluído' : '';

  // Glass panel style
  const glass: CSSProperties = {
    background: `rgba(0, 0, 0, ${panelOpacity * 0.65})`,
    border: `1px solid rgba(255,255,255, ${panelOpacity * 0.12})`,
    backdropFilter: `blur(${Math.round(panelOpacity * 28)}px)`,
    WebkitBackdropFilter: `blur(${Math.round(panelOpacity * 28)}px)`,
  };

  const handleCloseClick = async () => { await session.closeAfterPersist(); onClose(); };
  const hasSubtasks = (task.subtasks?.length ?? 0) > 0;

  const toggleSubtaskItem = async (groupId: string, itemId: string) => {
    let wasCompleted = false;
    const updated = (task.subtasks ?? []).map(st => {
      if (st.id === groupId) return { ...st, items: st.items.map(item => {
        if (item.id === itemId) { if (!item.completed) wasCompleted = true; return { ...item, completed: !item.completed }; }
        return item;
      }) };
      return st;
    });
    try {
      await updateDoc(doc(db, 'tasks', task.id), { subtasks: updated, updatedAt: serverTimestamp() });
      if (wasCompleted) playSuccessSound();
    } catch (err) { console.error(err); }
  };

  // Subtask progress
  const totalItems = (task.subtasks ?? []).reduce((acc, g) => acc + (g.items?.length ?? 0), 0);
  const doneItems = (task.subtasks ?? []).reduce((acc, g) => acc + (g.items?.filter(i => i.completed).length ?? 0), 0);

  // ─── FINISHED STATE ─────────────────────────────────────────────
  if (status === 'finished') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex h-[100dvh] flex-col items-center justify-center overflow-hidden text-white"
        style={{ background: scene.gradient }}>
        <SceneParticles type={scene.particle} />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 flex flex-col items-center px-6 text-center">
          <CheckCircle2 size={80} className="text-emerald-400 mb-6 drop-shadow-lg" />
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Foco concluído!</h2>
          <p className="mt-2 text-sm text-white/50">O que deseja fazer agora?</p>
          <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
            <button onClick={startBreak} className="flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold bg-white text-slate-900 shadow-xl hover:scale-[1.02] transition-transform">
              <Coffee size={18} /> Pausa curta
            </button>
            <button onClick={skipBreakNewFocus} className="rounded-2xl py-3 text-base font-semibold bg-white/10 hover:bg-white/15 transition-colors">
              Novo foco (pular pausa)
            </button>
            <button onClick={handleCloseClick} className="py-3 text-sm text-white/40 hover:text-white/70 transition-colors">Sair</button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ─── MAIN RENDER ────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-hidden overscroll-none font-sans text-white">

      {/* ── BACKGROUND ── */}
      <div className="absolute inset-0" style={{ background: scene.gradient }} />
      <SceneParticles type={scene.particle} />

      {/* ── HEADER ── */}
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-6 sm:pt-5 sm:pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-bold backdrop-blur-sm">
            {subjectInfo.emoji}
            <span className="hidden sm:inline">{task.subject}</span>
          </span>
          <h2 className="truncate text-sm sm:text-base font-bold leading-tight">{task.title}</h2>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowSettings(true)} className="rounded-full p-2.5 text-white/70 hover:bg-white/10 transition-colors"><Settings size={18} /></button>
          <button onClick={onMinimize} className="rounded-full p-2.5 text-white/70 hover:bg-white/10 transition-colors"><Minimize2 size={18} /></button>
          <button onClick={handleCloseClick} className="rounded-full p-2.5 text-white/70 hover:bg-white/10 transition-colors"><X size={20} /></button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col md:flex-row items-center justify-center gap-4 md:gap-8 px-4 sm:px-6 overflow-y-auto custom-scrollbar">

        {/* Timer Panel */}
        <div className="w-full max-w-[22rem] md:max-w-md flex flex-col items-center rounded-3xl p-5 sm:p-8 shadow-2xl" style={glass}>
          {/* SVG Ring */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={accent.hex} />
                  <stop offset="100%" stopColor={accent.hex} stopOpacity="0.4" />
                </linearGradient>
                <filter id="ring-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
              <motion.circle cx="100" cy="100" r={radius} stroke="url(#ring-grad)" strokeWidth="5" fill="none"
                strokeLinecap="round" strokeDasharray={circumference} initial={false}
                animate={{ strokeDashoffset }} transition={{ duration: 0.95, ease: 'linear' }}
                filter="url(#ring-glow)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="font-black tabular-nums tracking-tighter text-[clamp(2.8rem,12vw,4.5rem)] md:text-7xl leading-none drop-shadow-lg"
                style={{ color: accent.hex === '#ffffff' ? '#fff' : accent.hex }}
                animate={status === 'running' ? { scale: [1, 1.015, 1] } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                {timerDisplay}
              </motion.span>
            </div>
          </div>

          {/* Status */}
          <p className="mt-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-white/40">{statusLabel}</p>

          {/* Controls */}
          <div className="mt-5 sm:mt-8 flex items-center gap-4 sm:gap-6">
            <button onClick={resetTimer} className="rounded-full p-3 border border-white/20 bg-white/5 text-white/70 hover:bg-white/15 transition-colors shadow-lg" aria-label="Resetar">
              <RotateCcw size={20} />
            </button>
            <button onClick={toggleTimer}
              className="flex h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105"
              style={{ background: accent.hex, color: accent.hex === '#ffffff' ? '#1e293b' : '#fff' }}
              aria-label={status === 'running' || status === 'break' ? 'Pausar' : 'Iniciar'}>
              {status === 'running' || status === 'break' ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={skipToComplete} disabled={mode !== 'pomodoro' || status !== 'running'}
              className="rounded-full p-3 border border-white/20 bg-white/5 text-white/70 hover:bg-white/15 transition-colors shadow-lg disabled:opacity-25 disabled:pointer-events-none" aria-label="Pular">
              <SkipForward size={20} />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 w-full">
            <div className="flex flex-col items-center rounded-xl py-2 px-1" style={{ ...glass, background: `rgba(0,0,0,${panelOpacity * 0.4})` }}>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Pomodoros</span>
              <span className="mt-0.5 text-lg font-black tabular-nums">{task.pomodoros ?? 0}<span className="text-xs font-medium text-white/40">{(task.estimatedPomodoros ?? 0) > 0 ? ` / ${task.estimatedPomodoros}` : ''}</span></span>
            </div>
            <div className="flex flex-col items-center rounded-xl py-2 px-1" style={{ ...glass, background: `rgba(0,0,0,${panelOpacity * 0.4})` }}>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Tempo focado</span>
              <span className="mt-0.5 text-lg font-black tabular-nums">{Math.floor(((task.liquidTime ?? 0) + sessionLiquidTime) / 60)}m</span>
            </div>
          </div>
        </div>

        {/* Checklist Panel (desktop) */}
        {hasSubtasks && (
          <div className="hidden md:flex w-full max-w-sm flex-col rounded-3xl p-6 shadow-2xl max-h-[65vh]" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                <CheckSquare size={14} /> Checklist
              </h3>
              {totalItems > 0 && <span className="text-[10px] font-bold text-white/30">{doneItems}/{totalItems}</span>}
            </div>
            {totalItems > 0 && (
              <div className="h-1 rounded-full bg-white/10 mb-4 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalItems > 0 ? (doneItems / totalItems) * 100 : 0}%`, background: accent.hex }} />
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {(task.subtasks ?? []).map(g => (
                <div key={g.id} className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">{g.title}</p>
                  {(g.items ?? []).map(item => (
                    <button key={item.id} onClick={() => toggleSubtaskItem(g.id, item.id)}
                      className="flex w-full items-start gap-2 rounded-lg py-1.5 px-2 text-left text-sm hover:bg-white/5 transition-colors">
                      {item.completed ? <CheckSquare size={16} className="mt-0.5 shrink-0" style={{ color: accent.hex }} /> : <SquareIcon size={16} className="mt-0.5 shrink-0 text-white/25" />}
                      <span className={cn('leading-snug', item.completed ? 'line-through text-white/35' : 'text-white/80')}>{item.title}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Checklist */}
      {hasSubtasks && (
        <div className="md:hidden relative z-20 px-4 mb-1">
          <button onClick={() => setChecklistOpen(o => !o)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 shadow-lg" style={glass}>
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/70"><CheckSquare size={14} /> Checklist {totalItems > 0 && `${doneItems}/${totalItems}`}</span>
            {checklistOpen ? <ChevronDown size={16} className="text-white/50" /> : <ChevronUp size={16} className="text-white/50" />}
          </button>
          <AnimatePresence>
            {checklistOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden rounded-2xl mt-1 shadow-lg" style={glass}>
                <div className="p-4 max-h-[30dvh] overflow-y-auto space-y-3 custom-scrollbar">
                  {(task.subtasks ?? []).map(g => (
                    <div key={g.id} className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">{g.title}</p>
                      {(g.items ?? []).map(item => (
                        <button key={item.id} onClick={() => toggleSubtaskItem(g.id, item.id)}
                          className="flex w-full items-start gap-2 rounded-lg py-1.5 px-2 text-left text-sm hover:bg-white/5 transition-colors">
                          {item.completed ? <CheckSquare size={16} className="mt-0.5 shrink-0" style={{ color: accent.hex }} /> : <SquareIcon size={16} className="mt-0.5 shrink-0 text-white/25" />}
                          <span className={cn('leading-snug', item.completed ? 'line-through text-white/35' : 'text-white/80')}>{item.title}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      <footer className="relative z-20 shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6" style={{ paddingTop: '0.5rem' }}>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-xl" style={glass}>
          {/* Sound controls */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button onClick={() => setSoundType('none')} className="shrink-0 text-white/40 hover:text-white/80 transition-colors">
              {soundType === 'none' ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="flex gap-0.5 overflow-x-auto hide-scrollbar">
              {AMBIENT_SOUNDS.filter(s => s.id !== 'none').map(s => (
                <button key={s.id} onClick={() => setSoundType(s.id)}
                  className={cn('shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-all',
                    soundType === s.id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60')}>
                  {s.emoji}
                </button>
              ))}
            </div>
            {soundType !== 'none' && (
              <input type="range" min="0" max="1" step="0.05" value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-16 sm:w-20 focus-range shrink-0" />
            )}
          </div>

          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Scene selector */}
          <div className="flex gap-0.5 overflow-x-auto hide-scrollbar">
            {SCENES.map(s => (
              <button key={s.id} onClick={() => setScene(s.id)}
                className={cn('shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-all',
                  sceneId === s.id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60')}>
                {s.emoji}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* ── SETTINGS DRAWER ── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsDrawer
            mode={mode} setMode={setMode}
            focusDuration={focusDuration} setFocusDuration={setFocusDuration}
            breakDuration={breakDuration} setBreakDuration={setBreakDuration}
            accentHex={accent.hex} setAccentId={setAccent}
            panelOpacity={panelOpacity} setPanelOpacity={setOpacity}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── SESSION ROOT ───────────────────────────────────────────────────

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
  const handleClose = async () => { await session.closeAfterPersist(); onClose(); };

  return (
    <AnimatePresence mode="sync">
      {view === 'full' && (
        <FocusModeFull key="focus-full" task={task} session={session}
          onMinimize={() => onViewChange('minimized')} onClose={onClose} playSuccessSound={playSuccessSound} />
      )}
      {view === 'minimized' && (
        <FocusMiniPlayer key="focus-mini" task={task} session={session}
          onExpand={() => onViewChange('full')} onClose={handleClose} />
      )}
    </AnimatePresence>
  );
}
