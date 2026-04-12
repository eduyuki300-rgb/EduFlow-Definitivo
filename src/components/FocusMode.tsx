import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, Settings, X, Timer, Maximize, Bell, Coffee, CheckCircle2 } from 'lucide-react';
import { Task } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FocusModeProps {
  task: Task;
  onClose: () => void;
}

type TimerMode = 'pomodoro' | 'stopwatch';
type TimerStatus = 'idle' | 'running' | 'paused' | 'break' | 'finished';
type Theme = 'midnight' | 'aurora' | 'minimal' | 'forest';

export function FocusMode({ task, onClose }: FocusModeProps) {
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [theme, setTheme] = useState<Theme>('midnight');
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  
  // Time state
  const [timeLeft, setTimeLeft] = useState(focusDuration);
  const [timeElapsed, setTimeElapsed] = useState(0); // For stopwatch
  const [sessionLiquidTime, setSessionLiquidTime] = useState(0); // Time spent in this specific session
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync timeLeft when focusDuration changes (if idle)
  useEffect(() => {
    if (status === 'idle' && mode === 'pomodoro') {
      setTimeLeft(focusDuration);
    }
  }, [focusDuration, status, mode]);

  // Timer Logic
  useEffect(() => {
    if (status === 'running' || status === 'break') {
      timerRef.current = setInterval(() => {
        if (mode === 'pomodoro') {
          if (status === 'running') {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                handlePomodoroFinish();
                return 0;
              }
              return prev - 1;
            });
            setSessionLiquidTime((prev) => prev + 1);
          } else if (status === 'break') {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                playChime();
                setStatus('idle');
                setTimeLeft(focusDuration);
                return 0;
              }
              return prev - 1;
            });
          }
        } else if (mode === 'stopwatch' && status === 'running') {
          setTimeElapsed((prev) => prev + 1);
          setSessionLiquidTime((prev) => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, mode, focusDuration, breakDuration]);

  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1); // A4
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePomodoroFinish = async () => {
    playChime();
    setStatus('finished');
    await saveSessionTime(true);
  };

  const saveSessionTime = async (isPomodoroComplete = false) => {
    if (sessionLiquidTime === 0) return;
    
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        liquidTime: increment(sessionLiquidTime),
        totalTime: increment(sessionLiquidTime), // Simplified for now
        pomodoros: isPomodoroComplete ? increment(1) : increment(0),
        updatedAt: serverTimestamp()
      });
      setSessionLiquidTime(0); // Reset after saving
    } catch (error) {
      console.error("Error saving time:", error);
    }
  };

  const handleClose = async () => {
    if (status === 'running' || status === 'paused') {
      await saveSessionTime();
    }
    onClose();
  };

  const toggleTimer = () => {
    if (status === 'idle' || status === 'paused') {
      setStatus('running');
    } else if (status === 'running') {
      setStatus('paused');
      saveSessionTime(); // Save incrementally on pause
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'aurora':
        return 'bg-gradient-to-br from-indigo-900 via-purple-900 to-emerald-900 text-white';
      case 'forest':
        return 'bg-gradient-to-br from-green-900 to-stone-900 text-green-50';
      case 'minimal':
        return 'bg-stone-100 text-stone-900';
      case 'midnight':
      default:
        return 'bg-slate-950 text-slate-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden font-sans",
        getThemeClasses()
      )}
    >
      {/* Animated Background Elements (Aurora effect) */}
      {theme === 'aurora' && (
        <>
          <motion.div 
            animate={{ 
              x: ['-20%', '20%', '-20%'],
              y: ['-20%', '20%', '-20%'],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-[150vw] h-[150vh] bg-purple-500/20 rounded-full blur-[120px] -z-10"
          />
          <motion.div 
            animate={{ 
              x: ['20%', '-20%', '20%'],
              y: ['20%', '-20%', '20%'],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 right-0 w-[150vw] h-[150vh] bg-emerald-500/20 rounded-full blur-[120px] -z-10"
          />
        </>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start w-full max-w-5xl mx-auto">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-widest opacity-50">Focando em</span>
          <h2 className="text-2xl font-medium tracking-tight max-w-md truncate">{task.title}</h2>
          <span className="text-sm opacity-60">{task.subject}</span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-full hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={handleClose}
            className="p-3 rounded-full hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 right-6 bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl w-80 z-50"
          >
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6 opacity-70">Configurações</h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-medium opacity-70 block mb-2">Modo</label>
                <div className="flex bg-black/30 rounded-lg p-1">
                  <button 
                    onClick={() => setMode('pomodoro')}
                    className={cn("flex-1 py-2 text-sm rounded-md transition-colors", mode === 'pomodoro' ? 'bg-white/20 font-medium' : 'opacity-60 hover:opacity-100')}
                  >
                    Pomodoro
                  </button>
                  <button 
                    onClick={() => setMode('stopwatch')}
                    className={cn("flex-1 py-2 text-sm rounded-md transition-colors", mode === 'stopwatch' ? 'bg-white/20 font-medium' : 'opacity-60 hover:opacity-100')}
                  >
                    Cronômetro
                  </button>
                </div>
              </div>

              {mode === 'pomodoro' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium opacity-70 block mb-2">Foco (min)</label>
                    <input 
                      type="number" 
                      value={focusDuration / 60}
                      onChange={(e) => setFocusDuration((parseInt(e.target.value) || 25) * 60)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-center outline-none focus:border-white/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium opacity-70 block mb-2">Pausa (min)</label>
                    <input 
                      type="number" 
                      value={breakDuration / 60}
                      onChange={(e) => setBreakDuration((parseInt(e.target.value) || 5) * 60)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-center outline-none focus:border-white/30"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium opacity-70 block mb-2">Tema</label>
                <select 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-2 outline-none focus:border-white/30 appearance-none"
                >
                  <option value="midnight">Midnight (Escuro)</option>
                  <option value="aurora">Aurora (Gradiente Animado)</option>
                  <option value="forest">Forest (Verde Profundo)</option>
                  <option value="minimal">Minimal (Claro)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Timer Display */}
      <div className="relative flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {status === 'finished' ? (
            <motion.div 
              key="finished"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <CheckCircle2 size={80} className="text-green-400 mb-6" />
              </motion.div>
              <h2 className="text-4xl font-light tracking-tight mb-2">Foco Concluído!</h2>
              <p className="opacity-60 mb-12">Ótimo trabalho. O que faremos agora?</p>
              
              <div className="flex flex-col gap-4 w-64">
                <button 
                  onClick={() => { setStatus('break'); setTimeLeft(breakDuration); }}
                  className="py-4 px-6 bg-white text-black rounded-2xl font-medium hover:scale-105 transition-transform flex items-center justify-center gap-2"
                >
                  <Coffee size={18} /> Iniciar Pausa
                </button>
                <button 
                  onClick={() => { setStatus('running'); setTimeLeft(focusDuration); }}
                  className="py-4 px-6 bg-white/10 rounded-2xl font-medium hover:bg-white/20 transition-colors"
                >
                  Pular Pausa (Novo Foco)
                </button>
                <button 
                  onClick={handleClose}
                  className="py-4 px-6 opacity-50 hover:opacity-100 transition-opacity"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="timer"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center"
            >
              {/* Circular Progress for Pomodoro */}
              {mode === 'pomodoro' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <svg className="w-[400px] h-[400px] transform -rotate-90">
                    <motion.circle
                      cx="200" cy="200" r="190"
                      stroke="currentColor" strokeWidth="2" fill="transparent"
                      strokeDasharray={2 * Math.PI * 190}
                      animate={{ strokeDashoffset: (1 - (timeLeft / (status === 'break' ? breakDuration : focusDuration))) * (2 * Math.PI * 190) }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                  </svg>
                </div>
              )}

              <motion.div 
                className="text-[12rem] font-light tracking-tighter tabular-nums leading-none"
                animate={status === 'running' ? { scale: [1, 1.01, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {formatTime(mode === 'pomodoro' ? timeLeft : timeElapsed)}
              </motion.div>
              
              <div className="text-sm font-medium tracking-[0.3em] uppercase mt-4 opacity-50">
                {status === 'idle' ? 'Pronto para focar' : 
                 status === 'running' ? (mode === 'pomodoro' ? 'Foco Profundo' : 'Cronômetro Ativo') : 
                 status === 'paused' ? 'Pausado' : 'Descanso'}
              </div>

              {/* Controls */}
              <div className="mt-16 flex items-center gap-8">
                <button 
                  onClick={() => {
                    if (mode === 'pomodoro') setTimeLeft(focusDuration);
                    else setTimeElapsed(0);
                    setStatus('idle');
                  }}
                  className="p-4 rounded-full hover:bg-white/10 transition-colors opacity-50 hover:opacity-100"
                >
                  <Square size={24} />
                </button>

                <button 
                  onClick={toggleTimer}
                  className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                >
                  {status === 'running' || status === 'break' ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />}
                </button>

                <button 
                  onClick={handlePomodoroFinish}
                  disabled={mode !== 'pomodoro' || status !== 'running'}
                  className="p-4 rounded-full hover:bg-white/10 transition-colors opacity-50 hover:opacity-100 disabled:opacity-20"
                >
                  <CheckCircle2 size={24} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Bottom Stats */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-12 opacity-50 text-sm font-medium">
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest mb-1">Pomodoros Hoje</span>
          <span className="text-xl">{task.pomodoros || 0}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest mb-1">Tempo Total</span>
          <span className="text-xl">{Math.floor(((task.liquidTime || 0) + sessionLiquidTime) / 60)}m</span>
        </div>
      </div>
    </motion.div>
  );
}
