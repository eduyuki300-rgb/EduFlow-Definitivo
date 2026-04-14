import React, { useState, useEffect, useMemo, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Square, Settings, X, Coffee, CheckCircle2, Minimize2, 
  ChevronDown, ChevronUp, CheckSquare, Square as SquareIcon, 
  Volume2, VolumeX, RotateCcw, SkipForward, PictureInPicture2 
} from 'lucide-react';
import { Task, Status } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useFocusSession, FocusSessionApi } from '../hooks/useFocusSession';
import { FocusMiniPlayer } from './FocusMiniPlayer';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── CONSTANTS & TYPES ──────────────────────────────────────────────

interface SceneInfo {
  id: string;
  label: string;
  gradient: string;
  particle: 'stars' | 'embers' | 'leaves' | 'waves' | 'bokeh';
}

const SCENES: SceneInfo[] = [
  { id: 'midnight', label: 'Meia-noite', gradient: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)', particle: 'stars' },
  { id: 'aurora', label: 'Aurora', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #064e3b 100%)', particle: 'bokeh' },
  { id: 'forest', label: 'Floresta', gradient: 'linear-gradient(135deg, #062006 0%, #052e16 100%)', particle: 'leaves' },
  { id: 'ember', label: 'Lareira', gradient: 'linear-gradient(135deg, #1c0a0a 0%, #2d0a0a 100%)', particle: 'embers' },
  { id: 'ocean', label: 'Oceano', gradient: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 100%)', particle: 'waves' },
];

const ACCENT_COLORS = [
  { id: 'white', label: 'Puro', hex: '#ffffff' },
  { id: 'blue', label: 'Foco', hex: '#60a5fa' },
  { id: 'purple', label: 'Criativo', hex: '#a78bfa' },
  { id: 'emerald', label: 'Zen', hex: '#34d399' },
  { id: 'rose', label: 'Energia', hex: '#fb7185' },
  { id: 'amber', label: 'Atenção', hex: '#fbbf24' },
  { id: 'cyan', label: 'Calma', hex: '#22d3ee' },
];

const SUBJECT_INFO: Record<string, { emoji: string; color: string }> = {
  'Geral': { emoji: '📚', color: '#64748b' },
  'Biologia': { emoji: '🧬', color: '#22c55e' },
  'Física': { emoji: '⚛️', color: '#3b82f6' },
  'Química': { emoji: '🧪', color: '#a855f7' },
  'Matemática': { emoji: '📐', color: '#ef4444' },
  'Linguagens': { emoji: '🗣️', color: '#eab308' },
  'Humanas': { emoji: '🌍', color: '#f97316' },
  'Redação': { emoji: '✍️', color: '#14b8a6' },
};

function seededRandom(i: number, salt: number) {
  const x = Math.sin(i * 83492791 + salt * 2654435761) * 10000;
  return x - Math.floor(x);
}

// ─── HELPER COMPONENTS ──────────────────────────────────────────────

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

  return null;
}

function ConfettiParticles() {
  const particles = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    x: (Math.random() - 0.5) * window.innerWidth * 1.2,
    y: -window.innerHeight * 0.1 - Math.random() * window.innerHeight,
    color: ['#fb7185', '#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#ffffff'][i % 6],
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
    delay: Math.random() * 0.2,
    duration: 2.5 + Math.random() * 2
  })), []);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[120]">
      {particles.map((p, i) => (
        <motion.div key={i} className="absolute rounded-sm"
          initial={{ left: '50%', top: '50%', opacity: 1, scale: 0 }}
          animate={{ x: p.x, y: p.y + window.innerHeight, rotate: p.rotate + 720, scale: 1, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          style={{ width: p.size, height: p.size * 0.6, background: p.color }} />
      ))}
    </div>
  );
}

// ─── SETTINGS DRAWER ────────────────────────────────────────────────

interface SettingsDrawerProps {
  mode: string; setMode: (m: any) => void;
  focusDuration: number; setFocusDuration: (v: number) => void;
  breakDuration: number; setBreakDuration: (v: number) => void;
  longBreakDuration: number; setLongBreakDuration: (v: number) => void;
  isStrictMode: boolean; setIsStrictMode: (v: boolean) => void;
  accentHex: string; setAccentId: (id: string) => void;
  panelOpacity: number; setPanelOpacity: (v: number) => void;
  onClose: () => void;
}

function SettingsDrawer({ mode, setMode, focusDuration, setFocusDuration, breakDuration, setBreakDuration, longBreakDuration, setLongBreakDuration, isStrictMode, setIsStrictMode, accentHex, setAccentId, panelOpacity, setPanelOpacity, onClose }: SettingsDrawerProps) {
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

        {/* Strict Mode Toggle */}
        <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl mb-5 border border-white/10">
          <div>
            <label className="text-xs font-bold text-white block">Strict Mode (Auto-Flow)</label>
            <p className="text-[10px] text-white/40">Inicia pausas e focos automaticamente.</p>
          </div>
          <button onClick={() => setIsStrictMode(!isStrictMode)}
            className={cn("w-10 h-6 flex items-center rounded-full transition-colors px-1", isStrictMode ? "bg-emerald-500" : "bg-white/20")}>
            <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", isStrictMode ? "translate-x-4" : "translate-x-0")} />
          </button>
        </div>

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
  key?: string | number;
  task: Task;
  session: FocusSessionApi;
  onMinimize: () => void;
  onClose: () => void;
  playSuccessSound: () => void;
}

interface FocusMiniPlayerProps {
  key?: string | number;
  task: Task;
  session: FocusSessionApi;
  onExpand: () => void;
  onClose: () => void;
}

function FocusModeFull({ task, session, onMinimize, onClose, playSuccessSound }: FocusModeFullProps) {
  const { 
    mode, setMode, status, focusDuration, setFocusDuration, breakDuration, setBreakDuration,
    longBreakDuration, setLongBreakDuration, focusCycles, isStrictMode, setIsStrictMode,
    timeLeft, timeElapsed, sessionLiquidTime, toggleTimer, resetTimer, skipToComplete, startBreak,
    skipBreakNewFocus 
  } = session;

  const [showSettings, setShowSettings] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  
  // Customization state
  const [scene, setScene] = useState(SCENES[0]);
  const [accent, setAccent] = useState(ACCENT_COLORS[0]);
  const [panelOpacity, setPanelOpacity] = useState(0.8);

  const subjectInfo = SUBJECT_INFO[task.subject] || SUBJECT_INFO['Geral'];

  // Persistence of local settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eduflow_focus_prefs');
      if (saved) {
        const { sceneId, accentId, opacity } = JSON.parse(saved);
        const s = SCENES.find(x => x.id === sceneId); if (s) setScene(s);
        const a = ACCENT_COLORS.find(x => x.id === accentId); if (a) setAccent(a);
        if (typeof opacity === 'number') setPanelOpacity(opacity);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('eduflow_focus_prefs', JSON.stringify({ sceneId: scene.id, accentId: accent.id, opacity: panelOpacity }));
    localStorage.setItem('eduflow_accent', accent.id); // Shared with MiniPlayer
  }, [scene, accent, panelOpacity]);

  // Timer ring calculation
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progressTotal = mode === 'pomodoro' ? (status === 'break' || status === 'break-paused' ? breakDuration : focusDuration) : 1;
  const progressValue = mode === 'pomodoro' ? timeLeft : 0;
  const progressRatio = progressTotal > 0 ? progressValue / progressTotal : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerDisplay = formatTime(mode === 'pomodoro' ? timeLeft : timeElapsed);
  const statusLabel = status === 'idle' ? 'Pronto para focar' : status === 'running' ? (mode === 'pomodoro' ? 'Foco profundo' : 'Cronômetro') : status === 'paused' ? 'Pausado' : (status === 'break' || status === 'break-paused') ? 'Pausa' : status === 'finished' ? 'Concluído' : '';

  const glass: CSSProperties = {
    background: `rgba(0, 0, 0, ${panelOpacity * 0.65})`,
    border: `1px solid rgba(255,255,255, ${panelOpacity * 0.12})`,
    backdropFilter: `blur(${Math.round(panelOpacity * 28)}px)`,
    WebkitBackdropFilter: `blur(${Math.round(panelOpacity * 28)}px)`,
  };

  const handleCloseClick = () => {
    if (status !== 'idle' && status !== 'finished') {
      setShowStopConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmSave = async () => {
    setShowStopConfirm(false);
    await session.closeAfterPersist();
    onClose();
  };

  const handleConfirmDiscard = () => {
    setShowStopConfirm(false);
    session.discardSessionTime();
    onClose();
  };

  const requestPiP = async () => {
    try {
      const pipWindow = (window as any).documentPictureInPicture;
      if (pipWindow?.requestWindow) {
        const pip = await pipWindow.requestWindow({ width: 300, height: 300 });
        pip.document.body.innerHTML = `
          <div style="display:flex; height:100vh; flex-direction:column; align-items:center; justify-content:center; background:${accent.hex}; color:${accent.hex === '#ffffff' ? '#1e293b' : '#fff'}; font-family:sans-serif; text-align:center; padding:1rem;">
            <h1 style="font-size:3.5rem; margin:0;" id="timer">00:00</h1>
            <p style="font-size:0.8rem; opacity:0.7; margin:0.5rem 0 0 0; font-weight:bold; letter-spacing:0.1em; text-transform:uppercase;" id="status">Foco</p>
          </div>
        `;
        const t = pip.document.getElementById('timer');
        const s = pip.document.getElementById('status');
        const update = () => {
          if (!pipWindow.window) clearInterval(i);
          const titleParts = document.title.split(' ');
          t.innerText = titleParts[1]?.replace(')', '') || '00:00';
          const symbol = titleParts[0]?.substring(1, 2);
          s.innerText = symbol === '⏳' ? 'Concentrado' : symbol === '☕' ? 'Descanso' : 'Pausado';
        };
        const i = setInterval(update, 1000);
        update();
        pip.addEventListener('pagehide', () => clearInterval(i));
      }
    } catch (e) {
      alert('Seu navegador não suporta Picture-in-Picture nativo para janelas.');
    }
  };

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
    } catch (e) {}
  };

  // ─── FINISHED STATE UI ───
  if (status === 'finished') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex h-[100dvh] flex-col items-center justify-center overflow-hidden text-white"
        style={{ background: scene.gradient }}>
        <SceneParticles type={scene.particle} />
        {focusCycles > 0 && focusCycles % 4 === 0 && <ConfettiParticles />}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 flex flex-col items-center px-6 text-center">
          <CheckCircle2 size={80} className="text-emerald-400 mb-6 drop-shadow-lg" />
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{focusCycles > 0 && focusCycles % 4 === 0 ? 'Ciclo Completo! 🎉' : 'Foco concluído!'}</h2>
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
          {typeof window !== 'undefined' && 'documentPictureInPicture' in window && (
            <button onClick={requestPiP} title="Mini Player Nativo" className="rounded-full p-2.5 text-white/70 hover:bg-white/10 transition-colors"><PictureInPicture2 size={18} /></button>
          )}
          <button onClick={() => setShowSettings(true)} className="rounded-full p-2.5 text-white/70 hover:bg-white/10 transition-colors"><Settings size={18} /></button>
          <button onClick={onMinimize} className="rounded-full p-2.5 text-white/70 hover:bg-white/10 transition-colors"><Minimize2 size={18} /></button>
          <button onClick={handleCloseClick} className="rounded-full p-2.5 text-white/70 hover:bg-white/10 transition-colors"><X size={20} /></button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col md:flex-row items-center justify-center gap-4 md:gap-8 px-4 sm:px-6 overflow-y-auto custom-scrollbar">

        {/* Timer Panel */}
        <div className="w-full max-w-[22rem] md:max-w-md flex flex-col items-center rounded-3xl p-5 sm:p-8 shadow-2xl" style={glass}>
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

          <div className="mt-8 flex flex-col items-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{statusLabel}</span>
            {mode === 'pomodoro' && <span className="text-xs font-bold text-white/20">Ciclo {focusCycles + 1}</span>}
          </div>

          <div className="mt-10 flex items-center gap-6">
            <button onClick={resetTimer} className="rounded-full p-4 border border-white/10 hover:bg-white/5 transition-all active:scale-90 text-white/40 hover:text-white">
              <RotateCcw size={22} />
            </button>
            <button onClick={toggleTimer} 
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all text-slate-900"
              style={{ background: accent.hex }}>
              {status === 'running' || status === 'break' ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={skipToComplete} disabled={mode !== 'pomodoro' || status !== 'running'}
              className="rounded-full p-4 border border-white/10 hover:bg-white/5 transition-all active:scale-90 text-white/40 hover:text-white disabled:opacity-0">
              <SkipForward size={22} />
            </button>
          </div>
        </div>

        {/* Sidebar Panel (Subtasks & Scenes) */}
        <div className="w-full max-w-[22rem] md:max-w-xs flex flex-col gap-4">
          {/* Scenes Picker */}
          <div className="rounded-3xl p-5" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-white/40">Ambientes</h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {SCENES.map(s => (
                <button key={s.id} onClick={() => setScene(s)}
                  className={cn("h-10 rounded-xl transition-all border-2", scene.id === s.id ? "border-white scale-105 shadow-lg" : "border-transparent opacity-60 hover:opacity-100 hover:scale-105")}
                  style={{ background: s.gradient }} title={s.label} />
              ))}
            </div>
          </div>

          {/* Subtasks Panel */}
          {(task.subtasks?.length ?? 0) > 0 && (
            <div className="flex-1 rounded-3xl p-5 flex flex-col min-h-[12rem]" style={glass}>
              <button onClick={() => setChecklistOpen(!checklistOpen)} className="flex items-center justify-between w-full mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-white/40 flex items-center gap-2">
                  Checklist <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/10">{task.subtasks.reduce((a,b)=>a+(b.items?.length||0), 0)} itens</span>
                </h3>
                {checklistOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              
              <AnimatePresence>
                {(checklistOpen || window.innerWidth > 768) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-4 max-h-[16rem] overflow-y-auto custom-scrollbar pr-1">
                      {task.subtasks.map(group => (
                        <div key={group.id} className="space-y-1.5">
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest pl-1">{group.title}</p>
                          {group.items.map(item => (
                            <button key={item.id} onClick={() => toggleSubtaskItem(group.id, item.id)}
                              className="w-full text-left group/item flex items-center gap-2.5 p-1 rounded-lg hover:bg-white/5 transition-colors">
                              {item.completed ? <CheckSquare size={16} className="text-white/60" /> : <SquareIcon size={16} className="text-white/20 group-hover/item:text-white/40" />}
                              <span className={cn("text-xs transition-colors", item.completed ? "text-white/30 line-through" : "text-white/80")}>{item.title}</span>
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

          {/* Summary Panel */}
          <div className="rounded-3xl p-5" style={glass}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Tempo Hoje</span>
                <span className="text-lg font-black tracking-tight">{Math.floor(((task.liquidTime || 0) + sessionLiquidTime) / 60)}<small className="text-[10px] ml-0.5 opacity-50 font-normal">min</small></span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Pomodoros</span>
                <span className="text-lg font-black tracking-tight">{task.pomodoros || 0}<small className="text-[10px] ml-0.5 opacity-50 font-normal">un</small></span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── SETTINGS ── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsDrawer
            mode={mode} setMode={setMode}
            focusDuration={focusDuration} setFocusDuration={setFocusDuration}
            breakDuration={breakDuration} setBreakDuration={setBreakDuration}
            longBreakDuration={longBreakDuration} setLongBreakDuration={setLongBreakDuration}
            isStrictMode={isStrictMode} setIsStrictMode={setIsStrictMode}
            accentHex={accent.hex} setAccentId={(id) => { const a = ACCENT_COLORS.find(x => x.id === id); if (a) setAccent(a); }}
            panelOpacity={panelOpacity} setPanelOpacity={setPanelOpacity}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
      
      {/* ── STOP CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showStopConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm" onClick={() => setShowStopConfirm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[160] w-[min(calc(100vw-2rem),24rem)] rounded-[2.5rem] p-8 text-center shadow-2xl overflow-hidden"
              style={glass}
            >
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                  <SquareIcon size={32} fill="currentColor" />
                </div>
              </div>
              <h3 className="text-xl font-black text-white mb-2">Encerrar Sessão?</h3>
              <p className="text-sm text-white/50 mb-8 leading-relaxed">
                Você deseja salvar o tempo dedicado a esta tarefa ou prefere descartar o progresso desta sessão?
              </p>
              
              <div className="flex flex-col gap-3">
                <button onClick={handleConfirmSave} 
                  className="w-full py-4 rounded-2xl bg-white text-slate-900 font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">
                  Salvar e Sair
                </button>
                <button onClick={handleConfirmDiscard}
                  className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm transition-all">
                  Descartar Sessão
                </button>
                <button onClick={() => setShowStopConfirm(false)}
                  className="w-full py-2 text-white/30 text-xs font-bold uppercase tracking-widest hover:text-white/60 transition-colors mt-2">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── SESSION ROOT ───────────────────────────────────────────────────

export type FocusView = 'full' | 'minimized';

interface FocusSessionRootProps {
  key?: string | number;
  task: Task;
  view: FocusView;
  onViewChange: (view: FocusView) => void;
  onClose: () => void;
  playSuccessSound: () => void;
}

export function FocusSessionRoot({ task, view, onViewChange, onClose, playSuccessSound }: FocusSessionRootProps) {
  const session = useFocusSession(task.id, task.title);

  return (
    <AnimatePresence mode="sync">
      {view === 'full' && (
        <FocusModeFull key="full" task={task} session={session}
          onMinimize={() => onViewChange('minimized')} onClose={onClose} playSuccessSound={playSuccessSound} />
      )}
      {view === 'minimized' && (
        <FocusMiniPlayer key="mini" task={task} session={session}
          onExpand={() => onViewChange('full')} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

// Re-export as FocusMode for backward compatibility with App.tsx
// But update App.tsx to handle the view state
export { FocusSessionRoot as FocusMode };
