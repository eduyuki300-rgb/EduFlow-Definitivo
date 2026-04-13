import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Maximize2, X, Timer, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  onEnterImmersive: (task: Task) => void;
}

export function PomodoroWidget({ tasks, onEnterImmersive }: PomodoroWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeTasks = tasks.filter(t => t.status !== 'concluida');

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
    }
  }, [mode, isRunning]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, selectedTaskId]);

  const handleComplete = async () => {
    setIsRunning(false);
    playChime();
    
    if (mode === 'focus' && selectedTaskId) {
      try {
        await updateDoc(doc(db, 'tasks', selectedTaskId), {
          liquidTime: increment(25 * 60),
          pomodoros: increment(1),
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error saving pomodoro:", error);
      }
    }
    
    if (mode === 'focus') {
      setMode('break');
      setTimeLeft(5 * 60);
    } else {
      setMode('focus');
      setTimeLeft(25 * 60);
    }
  };

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
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleExpandImmersive = () => {
    if (selectedTaskId) {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (task) {
        setIsRunning(false); // Pause widget timer
        onEnterImmersive(task);
      } else {
        alert("Selecione uma tarefa primeiro para entrar no modo imersivo.");
      }
    } else {
      alert("Selecione uma tarefa primeiro para entrar no modo imersivo.");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 mb-4 w-72 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Timer size={18} className="text-orange-500" />
                Pomodoro
              </h3>
              <button onClick={handleExpandImmersive} className="text-gray-400 hover:text-pastel-blue transition-colors" title="Modo Imersivo">
                <Maximize2 size={16} />
              </button>
            </div>

            <div className="mb-4">
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-pastel-blue"
              >
                <option value="">Selecione uma tarefa...</option>
                {activeTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center mb-6">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="60" stroke="#f3f4f6" strokeWidth="6" fill="transparent" />
                  <motion.circle
                    cx="64" cy="64" r="60"
                    stroke={mode === 'focus' ? '#f97316' : '#3b82f6'}
                    strokeWidth="6" fill="transparent"
                    strokeDasharray={2 * Math.PI * 60}
                    animate={{ strokeDashoffset: (1 - (timeLeft / (mode === 'focus' ? 25 * 60 : 5 * 60))) * (2 * Math.PI * 60) }}
                    transition={{ duration: 1, ease: "linear" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-light tabular-nums text-gray-800">{formatTime(timeLeft)}</span>
                  <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                    {mode === 'focus' ? 'Foco' : 'Pausa'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setIsRunning(false);
                  setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
                }}
                className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Square size={18} />
              </button>
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "p-4 rounded-full text-white transition-transform hover:scale-105 shadow-md",
                  mode === 'focus' ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-500 hover:bg-blue-600"
                )}
              >
                {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105",
          isRunning ? "bg-orange-500 text-white animate-pulse" : "bg-white text-gray-700 border border-gray-100"
        )}
      >
        {isExpanded ? <ChevronDown size={24} /> : <Timer size={24} />}
      </button>
    </div>
  );
}
