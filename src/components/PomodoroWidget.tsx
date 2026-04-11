import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, ChevronDown, ChevronUp, Timer, Coffee, Save, Maximize2, Minimize2, Settings, Music, CloudRain, Waves } from 'lucide-react';
import { Task } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PomodoroWidgetProps {
  tasks: Task[];
}

type TimerMode = 'idle' | 'focus' | 'pause' | 'break';
type AmbientSound = 'none' | 'rain' | 'ocean' | 'cafe';

export function PomodoroWidget({ tasks }: PomodoroWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(() => JSON.parse(localStorage.getItem('pomodoro_minimized') || 'false'));
  const [isOpen, setIsOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => localStorage.getItem('pomodoro_taskId') || '');
  
  const [mode, setMode] = useState<TimerMode>(() => (localStorage.getItem('pomodoro_mode') as TimerMode) || 'idle');
  const [timeLeft, setTimeLeft] = useState(() => parseInt(localStorage.getItem('pomodoro_timeLeft') || String(25 * 60)));
  const [liquidTimeElapsed, setLiquidTimeElapsed] = useState(() => parseInt(localStorage.getItem('pomodoro_liquidTime') || '0'));
  const [pauseTimeElapsed, setPauseTimeElapsed] = useState(() => parseInt(localStorage.getItem('pomodoro_pauseTime') || '0'));
  
  const [focusDuration, setFocusDuration] = useState(() => parseInt(localStorage.getItem('pomodoro_focusDuration') || String(25 * 60)));
  const [breakDuration, setBreakDuration] = useState(() => parseInt(localStorage.getItem('pomodoro_breakDuration') || String(5 * 60)));
  const [ambientSound, setAmbientSound] = useState<AmbientSound>(() => (localStorage.getItem('pomodoro_sound') as AmbientSound) || 'none');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoro_minimized', JSON.stringify(isMinimized));
    localStorage.setItem('pomodoro_taskId', selectedTaskId);
    localStorage.setItem('pomodoro_mode', mode);
    localStorage.setItem('pomodoro_timeLeft', timeLeft.toString());
    localStorage.setItem('pomodoro_liquidTime', liquidTimeElapsed.toString());
    localStorage.setItem('pomodoro_pauseTime', pauseTimeElapsed.toString());
    localStorage.setItem('pomodoro_focusDuration', focusDuration.toString());
    localStorage.setItem('pomodoro_breakDuration', breakDuration.toString());
    localStorage.setItem('pomodoro_sound', ambientSound);
  }, [isMinimized, selectedTaskId, mode, timeLeft, liquidTimeElapsed, pauseTimeElapsed, focusDuration, breakDuration, ambientSound]);

  // Audio Source Loading
  useEffect(() => {
    if (audioRef.current && ambientSound !== 'none') {
      audioRef.current.load();
    }
  }, [ambientSound]);

  // Audio Play/Pause Control
  useEffect(() => {
    if (audioRef.current) {
      if (mode === 'focus' && ambientSound !== 'none') {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            // Silently ignore autoplay/format errors to avoid console spam
            console.warn("Audio play failed (browser policy or format support):", e.message);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [mode, ambientSound]);

  const getAudioSrc = () => {
    switch (ambientSound) {
      case 'rain': return 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3';
      case 'ocean': return 'https://assets.mixkit.co/active_storage/sfx/1196/1196-preview.mp3';
      case 'cafe': return 'https://assets.mixkit.co/active_storage/sfx/427/427-preview.mp3';
      default: return undefined;
    }
  };

  // Filter only incomplete tasks for the dropdown
  const incompleteTasks = tasks.filter(t => t.status !== 'concluida');

  useEffect(() => {
    if (mode === 'focus' || mode === 'pause' || mode === 'break') {
      timerRef.current = setInterval(() => {
        if (mode === 'focus') {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              handleCycleComplete();
              return 0;
            }
            return prev - 1;
          });
          setLiquidTimeElapsed((prev) => prev + 1);
        } else if (mode === 'pause') {
          setPauseTimeElapsed((prev) => prev + 1);
        } else if (mode === 'break') {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setMode('idle');
              setTimeLeft(focusDuration);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, focusDuration]);

  const handleCycleComplete = async () => {
    setMode('break');
    setTimeLeft(breakDuration);
    
    if (selectedTaskId) {
      try {
        await updateDoc(doc(db, 'tasks', selectedTaskId), {
          pomodoros: increment(1),
          liquidTime: increment(liquidTimeElapsed),
          totalTime: increment(liquidTimeElapsed + pauseTimeElapsed),
          updatedAt: serverTimestamp()
        });
        // Reset elapsed times after saving a full cycle
        setLiquidTimeElapsed(0);
        setPauseTimeElapsed(0);
      } catch (error) {
        console.error("Error saving pomodoro cycle:", error);
      }
    }
  };

  const requestEarlySave = () => {
    if (liquidTimeElapsed > 0 || pauseTimeElapsed > 0) {
      // Pause timer while deciding
      if (mode === 'focus') {
        setMode('pause');
      }
      setShowStopConfirm(true);
    } else {
      resetTimer();
    }
  };

  const confirmEarlySave = async (save: boolean) => {
    if (save && selectedTaskId && (liquidTimeElapsed > 0 || pauseTimeElapsed > 0)) {
      try {
        await updateDoc(doc(db, 'tasks', selectedTaskId), {
          liquidTime: increment(liquidTimeElapsed),
          totalTime: increment(liquidTimeElapsed + pauseTimeElapsed),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving early session:", error);
      }
    }
    setShowStopConfirm(false);
    resetTimer();
  };

  const resetTimer = () => {
    setMode('idle');
    setTimeLeft(focusDuration);
    setLiquidTimeElapsed(0);
    setPauseTimeElapsed(0);
  };

  const toggleTimer = () => {
    if (!selectedTaskId && mode === 'idle') {
      alert("Selecione uma tarefa primeiro!");
      return;
    }
    
    if (mode === 'idle' || mode === 'pause') {
      setMode('focus');
    } else if (mode === 'focus') {
      setMode('pause');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const bgColors = {
    idle: 'bg-white',
    focus: 'bg-orange-50',
    pause: 'bg-yellow-50',
    break: 'bg-teal-50'
  };

  const borderColors = {
    idle: 'border-gray-200',
    focus: 'border-orange-200',
    pause: 'border-yellow-200',
    break: 'border-teal-200'
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      className={cn(
        "absolute z-50 shadow-2xl border backdrop-blur-md overflow-hidden transition-all duration-500 cursor-grab active:cursor-grabbing",
        bgColors[mode],
        borderColors[mode],
        isMinimized ? "w-auto rounded-full" : "w-[calc(100vw-2rem)] sm:w-72 rounded-2xl",
        "top-4 right-4 sm:top-6 sm:right-6" // Initial position
      )}
    >
      <audio ref={audioRef} loop src={getAudioSrc()} />

      {/* Header */}
      <div className={cn("flex items-center p-3 border-b border-black/5 bg-white/50", isMinimized ? "hidden" : "justify-between")}>
        <div className="flex items-center gap-2">
          <Timer size={16} className={mode === 'focus' ? 'text-orange-500' : 'text-gray-500'} />
          <span className="text-xs font-bold text-gray-700">Pomodoro</span>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <button onClick={() => setShowSettings(!showSettings)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
              <Settings size={14} />
            </button>
          )}
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isMinimized ? (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 flex flex-col gap-4"
          >
            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-col gap-2 bg-white/60 p-2 rounded-lg border border-black/5 overflow-hidden"
                >
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Foco (min)</label>
                    <input 
                      type="number" 
                      value={focusDuration / 60} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 25;
                        setFocusDuration(val * 60);
                        if (mode === 'idle') setTimeLeft(val * 60);
                      }}
                      className="w-16 text-right text-sm p-1 rounded border border-gray-200"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Pausa (min)</label>
                    <input 
                      type="number" 
                      value={breakDuration / 60} 
                      onChange={(e) => setBreakDuration((parseInt(e.target.value) || 5) * 60)}
                      className="w-16 text-right text-sm p-1 rounded border border-gray-200"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Som</label>
                    <select 
                      value={ambientSound}
                      onChange={(e) => setAmbientSound(e.target.value as AmbientSound)}
                      className="w-24 text-right text-sm p-1 rounded border border-gray-200 bg-white"
                    >
                      <option value="none">Nenhum</option>
                      <option value="rain">Chuva 🌧️</option>
                      <option value="ocean">Mar 🌊</option>
                      <option value="cafe">Café ☕</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Focando em:</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                disabled={mode !== 'idle'}
                className="w-full bg-white/80 border border-gray-200 rounded-lg p-2 text-sm text-gray-700 outline-none focus:border-orange-300 disabled:opacity-50"
              >
                <option value="">Selecione uma tarefa...</option>
                {incompleteTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Timer Display */}
            <div className="flex flex-col items-center justify-center py-2">
              <motion.div 
                animate={mode === 'focus' ? { scale: [1, 1.05, 1] } : {}} 
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="text-5xl sm:text-6xl font-black text-gray-800 tracking-tighter tabular-nums"
              >
                {formatTime(timeLeft)}
              </motion.div>
              <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                {mode === 'idle' ? 'Pronto' : mode === 'focus' ? 'Foco' : mode === 'pause' ? 'Pausado' : 'Descanso'}
                {mode === 'focus' && ambientSound !== 'none' && <Music size={10} className="animate-bounce text-orange-400" />}
              </div>
            </div>

            {/* Metrics */}
            {(liquidTimeElapsed > 0 || pauseTimeElapsed > 0) && (
              <div className="flex justify-between items-center bg-white/60 rounded-lg p-2 border border-black/5">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Líquido</span>
                  <span className="text-sm font-bold text-green-600">{formatTime(liquidTimeElapsed)}</span>
                </div>
                <div className="w-px h-6 bg-gray-200"></div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Pausa</span>
                  <span className="text-sm font-bold text-yellow-600">{formatTime(pauseTimeElapsed)}</span>
                </div>
              </div>
            )}

            {/* Controls */}
            {!showStopConfirm ? (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={toggleTimer}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-105",
                    mode === 'focus' ? "bg-yellow-100 text-yellow-700" : "bg-orange-500 text-white"
                  )}
                >
                  {mode === 'focus' ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                
                {(mode !== 'idle' || liquidTimeElapsed > 0) && (
                  <button
                    onClick={requestEarlySave}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                    title="Encerrar e Salvar"
                  >
                    <Save size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2 bg-white/80 p-3 rounded-xl border border-orange-100 shadow-inner">
                <p className="text-xs text-center font-medium text-gray-700">Deseja salvar o tempo registrado?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmEarlySave(false)}
                    className="flex-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors border border-red-100"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => confirmEarlySave(true)}
                    className="flex-1 py-1.5 px-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-bold transition-colors border border-green-100"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="minimized"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3 flex items-center justify-between"
          >
            <div className="text-xl font-black text-gray-800 tabular-nums flex items-center gap-2">
              <motion.div animate={mode === 'focus' ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 10, ease: "linear" }}>
                <Timer size={16} className={mode === 'focus' ? 'text-orange-500' : 'text-gray-500'} />
              </motion.div>
              {formatTime(timeLeft)}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTimer}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
                  mode === 'focus' ? "bg-yellow-100 text-yellow-700" : "bg-orange-500 text-white"
                )}
              >
                {mode === 'focus' ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={() => setIsMinimized(false)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
                <Maximize2 size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
