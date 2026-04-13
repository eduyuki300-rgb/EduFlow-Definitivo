import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GripVertical, Maximize2, Pause, Play, X } from 'lucide-react';
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
    if (status === 'running' || status === 'break') {
      if (!window.confirm('O timer está ativo. Sair salva o tempo focado até agora. Continuar?')) return;
    }
    void onClose();
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
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed z-[95] w-[min(calc(100vw-1.5rem),20rem)] left-4 bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4.5rem)] sm:left-6 sm:bottom-28"
    >
      <div style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} className="w-full">
        <div
          className="flex cursor-grab items-stretch overflow-hidden rounded-2xl border border-gray-200/90 bg-white/95 shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-md active:cursor-grabbing"
          onPointerDown={onPointerDownDrag}
          onPointerMove={onPointerMoveDrag}
          onPointerUp={onPointerUpDrag}
          onPointerCancel={onPointerUpDrag}
        >
          <div className="flex items-center px-1 text-gray-400" aria-hidden>
            <GripVertical size={18} strokeWidth={2} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-3 pl-1">
            <div className="flex min-w-0 items-center justify-between gap-2 mb-1">
              <p className="truncate text-xs font-bold text-text-main" title={task.title}>{task.title}</p>
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-text-muted bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">{label}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[28px] font-black tabular-nums tracking-tighter text-text-main leading-none">
                {formatTime(displaySeconds)}
              </span>
              <div className="flex items-center gap-0.5">
                {/* Play button with mini ring */}
                <div className="relative">
                  <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
                    <circle cx="20" cy="20" r={radius} stroke="#e5e7eb" strokeWidth="2.5" fill="none" />
                    <circle cx="20" cy="20" r={radius} stroke={accentHex === '#ffffff' ? '#4A4A4A' : accentHex}
                      strokeWidth="2.5" fill="none" strokeLinecap="round"
                      strokeDasharray={circumference} strokeDashoffset={offset}
                      style={{ transition: 'stroke-dashoffset 0.95s linear' }} />
                  </svg>
                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                    disabled={status === 'finished'}
                    className="absolute inset-0 flex items-center justify-center text-text-main disabled:opacity-40"
                    aria-label={status === 'running' || status === 'break' ? 'Pausar' : 'Iniciar'}>
                    {status === 'running' || status === 'break'
                      ? <Pause size={14} fill="currentColor" />
                      : <Play size={14} fill="currentColor" className="ml-0.5" />}
                  </button>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); onExpand(); }}
                  className="rounded-full p-2 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-main" aria-label="Expandir"><Maximize2 size={16} /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); requestClose(); }}
                  className="rounded-full p-2 text-text-muted transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Fechar"><X size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
