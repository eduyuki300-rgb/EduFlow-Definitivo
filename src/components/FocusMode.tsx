import React, { useState, useEffect, useMemo, CSSProperties, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Square, Settings, X, Coffee, CheckCircle2, Minimize2, 
  ChevronDown, ChevronUp, CheckSquare, Square as SquareIcon, 
  Volume2, VolumeX, RotateCcw, SkipForward, PictureInPicture2 
} from 'lucide-react';
import { Task, Status } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useFocus } from '../context/FocusContext';
import { playSuccessSound } from '../utils/audio';
import { SUBJECT_INFO } from '../constants/subjects';

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
  { id: 'paper', label: 'Papel', gradient: 'linear-gradient(135deg, #fcf9f2 0%, #f3f0e8 100%)', particle: 'bokeh' },
  { id: 'morning', label: 'Manhã', gradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', particle: 'bokeh' },
  { id: 'pastel', label: 'Doce', gradient: 'linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%)', particle: 'bokeh' },
  { id: 'zen', label: 'Zen', gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', particle: 'leaves' },
  { id: 'sky', label: 'Céu', gradient: 'linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%)', particle: 'stars' },
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

// SUBJECT_INFO imported from src/constants/subjects.ts

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
    size: 5 + Math.random() * 8,
    color: ['#f97316', '#3b82f6', '#fbbf24', '#f43f5e', '#a78bfa'][Math.floor(Math.random() * 5)],
    rotation: Math.random() * 360,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 3
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[200]">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: p.x, y: p.y, rotate: 0 }}
          animate={{ y: window.innerHeight + 100, rotate: p.rotation * 2 }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          className="absolute rounded-sm opacity-60"
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
        className="fixed bottom-0 left-0 right-0 z-[140] bg-white rounded-t-[3rem] p-10 shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar"
      >
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-10" />
        
        <div className="max-w-xl mx-auto space-y-12">
          {/* Section: Mode */}
          <section>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Método de Foco</h4>
            <div className="flex p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
              <button onClick={() => setMode('pomodoro')} 
                className={cn("flex-1 py-4 px-6 rounded-xl text-xs font-black transition-all", mode === 'pomodoro' ? "bg-white text-gray-900 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600")}>
                🍅 POMODORO
              </button>
              <button onClick={() => setMode('flowtime')}
                className={cn("flex-1 py-4 px-6 rounded-xl text-xs font-black transition-all", mode === 'flowtime' ? "bg-white text-gray-900 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600")}>
                🌊 FLOWTIME
              </button>
            </div>
          </section>

          {/* Section: Times */}
          {mode === 'pomodoro' && (
            <section className="grid grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Foco (min)</label>
                <input type="number" value={focusDuration / 60} onChange={(e) => setFocusDuration(Number(e.target.value) * 60)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/5 transition-all outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Pausa (min)</label>
                <input type="number" value={breakDuration / 60} onChange={(e) => setBreakDuration(Number(e.target.value) * 60)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Longa (min)</label>
                <input type="number" value={longBreakDuration / 60} onChange={(e) => setLongBreakDuration(Number(e.target.value) * 60)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none" />
              </div>
            </section>
          )}

          {/* Section: Strict Mode */}
          <section className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1">Início Automático</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Começar próximo bloco sem intervenção</p>
            </div>
            <button onClick={() => setIsStrictMode(!isStrictMode)}
              className={cn("w-14 h-8 rounded-full relative transition-all duration-300", isStrictMode ? "bg-orange-500" : "bg-gray-200")}>
              <motion.div animate={{ x: isStrictMode ? 26 : 4 }} className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm" />
            </button>
          </section>

          {/* Section: Accent Color */}
          <section>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Cor de Destaque</h4>
            <div className="flex flex-wrap gap-4">
              {ACCENT_COLORS.map(c => (
                <button key={c.id} onClick={() => setAccentId(c.id)} title={c.label}
                  className={cn("w-12 h-12 rounded-2xl border-4 transition-all hover:scale-110", accentHex === c.hex ? "border-indigo-500 scale-110" : "border-transparent opacity-60 hover:opacity-100")}
                  style={{ backgroundColor: c.hex }} />
              ))}
            </div>
          </section>

          {/* Section: Panel Opacity */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Opacidade do Painel</h4>
              <span className="text-xs font-black text-gray-900">{Math.round(panelOpacity * 100)}%</span>
            </div>
            <input type="range" min="0.3" max="0.95" step="0.05" value={panelOpacity} onChange={(e) => setPanelOpacity(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-900" />
          </section>
        </div>
      </motion.div>
    </>
  );
}

// ─── FOCUS MODE FULL ────────────────────────────────────────────────

function FocusModeFull() {
  const { activeTask, session, setView, setActiveTask } = useFocus();

  if (!activeTask || !session) return null;

  const { 
    mode, setMode, status, focusDuration, setFocusDuration, breakDuration, setBreakDuration,
    longBreakDuration, setLongBreakDuration, focusCycles, isStrictMode, setIsStrictMode,
    timeLeft, timeElapsed, toggleTimer: sessionToggleTimer, resetTimer, skipToComplete, discardSessionTime, startBreak 
  } = session;

  const [showSettings, setShowSettings] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showNotification, setShowNotification] = useState<{ type: 'focus' | 'break', active: boolean }>({ type: 'focus', active: false });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const statusRef = useRef(status);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // Watch for transitions
  useEffect(() => {
    if (status === 'finished') {
      audioRef.current?.play().catch(() => {});
      setShowNotification({ type: 'focus', active: true });
    } else if (status === 'idle' && statusRef.current === 'break') {
      audioRef.current?.play().catch(() => {});
      setShowNotification({ type: 'break', active: true });
    }
    statusRef.current = status;
  }, [status]);
  
  // Customization state
  const [scene, setScene] = useState(SCENES[0]);
  const [accent, setAccent] = useState(ACCENT_COLORS[0]);
  const [panelOpacity, setPanelOpacity] = useState(0.8);

  const subjectInfo = SUBJECT_INFO[activeTask.subject] || SUBJECT_INFO['Geral'];

  // Persistence of local settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eduflow_focus_prefs');
      if (saved) {
        const { sceneId, accentId, opacity } = JSON.parse(saved);
        const s = SCENES.find(x => x.id === sceneId); if (s) setScene(s || SCENES[0]);
        const a = ACCENT_COLORS.find(x => x.id === accentId); if (a) setAccent(a || ACCENT_COLORS[0]);
        if (typeof opacity === 'number') setPanelOpacity(opacity);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('eduflow_focus_prefs', JSON.stringify({ sceneId: scene.id, accentId: accent.id, opacity: panelOpacity }));
    localStorage.setItem('eduflow_accent', accent.id);
  }, [scene, accent, panelOpacity]);

  const toggleTimer = () => {
    // Warm-up audio to bypass autoplay blocks
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
        }).catch(() => {});
      }
    }
    sessionToggleTimer();
  };

  const handleCloseRequest = () => {
    if (status === 'running' || status === 'paused' || status === 'break' || status === 'break-paused') {
      setShowStopConfirm(true);
    } else {
      setView('widget');
      setActiveTask(null);
    }
  };

  const confirmClose = (save: boolean) => {
    if (!save) discardSessionTime();
    setShowStopConfirm(false);
    setView('widget');
    setActiveTask(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const displaySeconds = mode === 'pomodoro' ? timeLeft : timeElapsed;
  const isBreakMode = mode === 'pomodoro' && (status === 'break' || status === 'break-paused');
  const currentDuration = isBreakMode ? (focusCycles % 4 === 0 && focusCycles > 0 ? longBreakDuration : breakDuration) : focusDuration;
  const progress = mode === 'pomodoro' ? (1 - (displaySeconds / currentDuration)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-6 overflow-hidden select-none"
      style={{ background: scene.gradient }}
    >
      <SceneParticles type={scene.particle} />
      
      {status === 'finished' && <ConfettiParticles />}

      {/* Floating Header */}
      <div className="absolute top-10 left-10 right-10 flex justify-between items-center z-20">
        <div className="flex items-center gap-6">
          <button onClick={handleCloseRequest} className="p-4 bg-white/40 hover:bg-white/80 rounded-3xl transition-all shadow-sm active:scale-95 group">
            <X size={24} className="text-gray-900 group-hover:rotate-90 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 opacity-60">Sessão Ativa</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{activeTask.title}</h2>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setView('mini')} className="p-4 bg-white/40 hover:bg-white/80 rounded-3xl transition-all shadow-sm active:scale-95 text-gray-900 font-bold flex items-center gap-3">
            <PictureInPicture2 size={24} />
            <span className="text-xs uppercase tracking-widest hidden sm:block">Mini Player</span>
          </button>
          <button onClick={() => setShowSettings(true)} className="p-4 bg-white/40 hover:bg-white/80 rounded-3xl transition-all shadow-sm active:scale-95 text-gray-900 font-bold flex items-center gap-3">
            <Settings size={24} />
            <span className="text-xs uppercase tracking-widest hidden sm:block">Ambiente</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <motion.div
        layout
        className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-16"
      >
        {/* Timer UI */}
        <div className="relative group">
          {/* Breathing Aura */}
          <motion.div
            animate={{ scale: status === 'running' || status === 'break' ? [1, 1.1, 1] : 1, opacity: status === 'running' || status === 'break' ? [0.1, 0.25, 0.1] : 0 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className={cn("absolute -inset-24 rounded-full blur-[100px] pointer-events-none", isBreakMode ? "bg-blue-400" : "bg-orange-400")}
          />

          <svg className="w-80 h-80 sm:w-96 sm:h-96 -rotate-90 relative">
            <circle cx="50%" cy="50%" r="45%" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="transparent" />
            <motion.circle
              cx="50%" cy="50%" r="45%"
              stroke={accent.hex}
              strokeWidth="6" fill="transparent"
              strokeDasharray={2 * Math.PI * 180}
              initial={{ strokeDashoffset: 2 * Math.PI * 180 }}
              animate={{ strokeDashoffset: (1 - progress) * (2 * Math.PI * 180) }}
              transition={{ duration: 1, ease: 'linear' }}
              strokeLinecap="round"
              className="drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center text-center">
              <span className="text-8xl sm:text-9xl font-black tabular-nums tracking-tighter text-gray-900 drop-shadow-sm">
                {formatTime(displaySeconds)}
              </span>
              <div className={cn(
                "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mt-8 border shadow-sm",
                isBreakMode ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-orange-50 text-orange-600 border-orange-100"
              )}>
                {status === 'running' ? 'Foco Profundo' : status === 'break' ? 'Recuperação' : status === 'paused' ? 'Pausado' : status === 'finished' ? 'Concluído' : 'Pronto'}
              </div>
            </div>
          </div>
        </div>

        {/* Immersive Notification */}
        <AnimatePresence>
          {showNotification.active && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-full max-w-sm"
            >
              <div className="bg-white/95 backdrop-blur-2xl rounded-[3rem] p-10 text-center shadow-[0_32px_64px_rgba(0,0,0,0.2)] border border-white/20">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8",
                  showNotification.type === 'focus' ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"
                )}>
                  {showNotification.type === 'focus' ? <CheckCircle2 size={40} /> : <Coffee size={40} />}
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  {showNotification.type === 'focus' ? 'Foco Concluído!' : 'Pausa Encerrada!'}
                </h3>
                <p className="text-gray-500 text-sm mb-10 font-medium">
                  {showNotification.type === 'focus' ? 'Hora de recuperar as energias.' : 'Pronto para o próximo bloco?'}
                </p>
                <button
                  onClick={() => {
                    setShowNotification({ ...showNotification, active: false });
                    if (showNotification.type === 'focus') startBreak();
                    else resetTimer();
                  }}
                  className={cn(
                    "w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl",
                    showNotification.type === 'focus' ? "bg-orange-500 shadow-orange-500/20" : "bg-blue-500 shadow-blue-500/20"
                  )}
                >
                  {showNotification.type === 'focus' ? 'Começar Pausa' : 'Iniciar Foco'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center gap-8">
          <button onClick={resetTimer} className="p-6 bg-white/20 hover:bg-white/40 rounded-[2rem] transition-all text-gray-900 active:scale-90 border border-white/20">
            <RotateCcw size={28} />
          </button>
          
          <button onClick={toggleTimer} className={cn("p-10 rounded-[3rem] text-white transition-all scale-110 hover:scale-125 active:scale-90 shadow-2xl", isBreakMode ? "bg-blue-500 shadow-blue-500/20" : "bg-gray-900 shadow-black/20")}>
            {status === 'running' || status === 'break' ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" className="ml-2" />}
          </button>

          <button onClick={skipToComplete} className="p-6 bg-white/20 hover:bg-white/40 rounded-[2rem] transition-all text-gray-900 active:scale-90 border border-white/20">
            <SkipForward size={28} />
          </button>
        </div>
      </motion.div>

      {/* Settings & Stop Confirm */}
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

        {showStopConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md" onClick={() => setShowStopConfirm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed z-[160] w-[calc(100%-3rem)] max-w-md bg-white rounded-[3rem] p-10 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-orange-100 text-orange-500">
                <SquareIcon size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Encerrar Sessão?</h3>
              <p className="text-gray-500 text-sm mb-10 leading-relaxed font-medium">Suas horas de estudo serão computadas no ranking e métricas.</p>
              
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => confirmClose(true)} className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all active:scale-[0.98] uppercase tracking-widest text-[10px]">
                  SALVAR E SAIR
                </button>
                <button onClick={() => confirmClose(false)} className="w-full text-red-400 font-black py-4 rounded-2xl hover:bg-red-50 transition-all uppercase tracking-widest text-[10px]">
                  DESCARTAR PROGRESSO
                </button>
                <button onClick={() => setShowStopConfirm(false)} className="w-full text-gray-400 font-black py-4 rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest text-[10px]">
                  CONTINUAR FOCADO
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export { FocusModeFull as FocusMode };
