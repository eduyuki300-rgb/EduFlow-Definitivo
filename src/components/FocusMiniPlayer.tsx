import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GripVertical, Maximize2, Pause, Play, Square, X } from 'lucide-react';
import { Task } from '../types';
import type { FocusSessionApi } from '../hooks/useFocusSession';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const STORAGE_KEY = 'eduflow_pomodoro_mini_pos';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface FocusMiniPlayerProps {
  key?: string | number;
  task: Task;
  session: FocusSessionApi;
  onExpand: () => void;
  onClose: () => void;
}

export function FocusMiniPlayer({ task, session, onExpand, onClose }: FocusMiniPlayerProps) {
  const { mode, status, timeLeft, timeElapsed, toggleTimer, focusDuration, breakDuration } = session;
  const displaySeconds = mode === 'pomodoro' ? timeLeft : timeElapsed;

  // Read persisted accent color
  const accentHex = (() => { try { const id = localStorage.getItem('eduflow_accent') ?? 'white'; const colors: Record<string, string> = { white: '#ffffff', blue: '#60a5fa', purple: '#a78bfa', emerald: '#34d399', rose: '#fb7185', amber: '#fbbf24', cyan: '#22d3ee' }; return colors[id] ?? '#ffffff'; } catch { return '#ffffff'; } })();

  const [pos, setPos] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return { x: 0, y: 0 }; const p = JSON.parse(raw); return { x: p.x ?? 0, y: p.y ?? 0 }; } catch { return { x: 0, y: 0 }; }
  });

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {} }, [pos]);

  const onPointerDownDrag = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [pos.x, pos.y]);

  const onPointerMoveDrag = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    setPos({ x: d.origX + e.clientX - d.startX, y: d.origY + e.clientY - d.startY });
  }, []);

  const onPointerUpDrag = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  }, []);

  const requestClose = () => {
    if (status === 'running' || status === 'paused' || status === 'break' || status === 'break-paused') {
      const save = window.confirm('Encerrar sessão de foco?\n\nOK: Salvar progresso até agora\nCancelar: Descartar progresso desta sessão');
      if (save) {
        onClose(); 
      } else {
        session.discardSessionTime();
        onClose(); 
      }
    } else {
      onClose();
    }
  };

  const label = status === 'idle' ? 'Pronto' : status === 'paused' ? 'Pausado' : status === 'break' || status === 'break-paused' ? 'Pausa' : status === 'finished' ? 'Concluído' : mode === 'pomodoro' ? 'Foco' : 'Cronômetro';

  // Mini ring progress
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const total = mode === 'pomodoro' ? (status === 'break' || status === 'break-paused' ? breakDuration : focusDuration) : 1;
  const ratio = total > 0 ? displaySeconds / total : 0;
  const offset = circumference * (1 - (mode === 'pomodoro' ? ratio : 0));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={{ 
        top: 12, 
        left: 12, 
        right: (typeof window !== 'undefined' ? window.innerWidth : 1000) - 332, 
        bottom: (typeof window !== 'undefined' ? window.innerHeight : 1000) - 100 
      }}
      onDragEnd={(_, info) => {
        setPos({ x: info.point.x, y: info.point.y });
      }}
      className="fixed z-[95] w-[20rem] cursor-grab active:cursor-grabbing"
      style={{ left: pos.x || 24, top: pos.y || (window.innerHeight - 180) }}
    >
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-gray-200/90 bg-white/95 shadow-[0_12px_40px_rgba(0,0,0,0.15)] backdrop-blur-md p-3">
        <div className="flex items-center px-1.5 text-gray-300" aria-hidden>
          <GripVertical size={16} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center py-2.5 pr-3.5 pl-1.5">
          <div className="flex min-w-0 items-center justify-between gap-2 mb-1">
            <p className="truncate text-xs font-bold text-text-main" title={task.title}>{task.title}</p>
            <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-text-muted bg-gray-100/80 border border-gray-200/50 px-1.5 py-0.5 rounded-md">{label}</span>
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-3xl font-black tabular-nums tracking-tighter text-text-main leading-none">
              {formatTime(displaySeconds)}
            </span>
            
            <div className="flex items-center gap-1">
              {/* Play/Pause Button with Progress Ring */}
              <div className="relative group/play">
                <svg viewBox="0 0 40 40" className="w-11 h-11 -rotate-90">
                  <circle cx="20" cy="20" r={radius} stroke="#f1f5f9" strokeWidth="2.5" fill="none" />
                  <circle cx="20" cy="20" r={radius} stroke={accentHex === '#ffffff' ? '#1e293b' : accentHex}
                    strokeWidth="2.5" fill="none" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.95s linear' }} />
                </svg>
                <button type="button" onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                  disabled={status === 'finished'}
                  className="absolute inset-0 flex items-center justify-center text-text-main hover:scale-110 active:scale-95 transition-transform disabled:opacity-40"
                  aria-label={status === 'running' || status === 'break' ? 'Pausar' : 'Iniciar'}>
                  {status === 'running' || status === 'break'
                    ? <Pause size={14} fill="currentColor" />
                    : <Play size={14} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>

              <div className="flex items-center bg-gray-50 rounded-full px-1 border border-gray-100">
                <button type="button" onClick={(e) => { e.stopPropagation(); onExpand(); }}
                  className="w-9 h-9 flex items-center justify-center text-text-muted transition-colors hover:text-text-main active:scale-90" 
                  title="Expandir">
                  <Maximize2 size={16} />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); requestClose(); }}
                  className="w-9 h-9 flex items-center justify-center text-text-muted transition-colors hover:text-red-500 active:scale-90" 
                  title="Encerrar">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
