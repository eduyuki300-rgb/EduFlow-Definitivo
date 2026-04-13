import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GripVertical, Maximize2, Pause, Play, X } from 'lucide-react';
import { Task } from '../types';
import type { FocusSessionApi } from '../hooks/useFocusSession';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const { mode, status, timeLeft, timeElapsed, toggleTimer } = session;
  const displaySeconds = mode === 'pomodoro' ? timeLeft : timeElapsed;

  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { x: 0, y: 0 };
      const p = JSON.parse(raw) as { x: number; y: number };
      return { x: p.x ?? 0, y: p.y ?? 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);

  const onPointerDownDrag = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  }, [pos.x, pos.y]);

  const onPointerMoveDrag = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setPos({ x: d.origX + dx, y: d.origY + dy });
  }, []);

  const onPointerUpDrag = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const requestClose = () => {
    if (status === 'running' || status === 'break') {
      if (!window.confirm('O timer está ativo. Sair salva o tempo focado até agora. Continuar?')) return;
    }
    void onClose();
  };

  const label =
    status === 'idle'
      ? 'Pronto'
      : status === 'paused'
        ? 'Pausado'
        : status === 'break'
          ? 'Pausa'
          : status === 'finished'
            ? 'Concluído'
            : mode === 'pomodoro'
              ? 'Foco'
              : 'Cronômetro';

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'fixed z-[95] w-[min(calc(100vw-1.5rem),20rem)]',
        'left-4 bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4.5rem)] sm:left-6 sm:bottom-28',
      )}
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
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-2.5 pr-2 pl-0">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-xs font-bold text-text-main" title={task.title}>
              {task.title}
            </p>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-text-muted">{label}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-text-main">
              {formatTime(displaySeconds)}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTimer();
                }}
                disabled={status === 'finished'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-text-main text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-40"
                aria-label={status === 'running' || status === 'break' ? 'Pausar' : 'Iniciar'}
              >
                {status === 'running' || status === 'break' ? (
                  <Pause size={18} fill="currentColor" className="size-[18px]" />
                ) : (
                  <Play size={18} fill="currentColor" className="ml-0.5 size-[18px]" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand();
                }}
                className="rounded-full p-2 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-main"
                aria-label="Abrir tela de foco"
                title="Expandir"
              >
                <Maximize2 size={18} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  requestClose();
                }}
                className="rounded-full p-2 text-text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Encerrar sessão de foco"
              >
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
