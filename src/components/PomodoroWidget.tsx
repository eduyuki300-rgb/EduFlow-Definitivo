import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, ChevronRight } from 'lucide-react';
import { Task } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PomodoroWidgetProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  /** Oculta o botão (ex.: durante o modo foco em ecrã inteiro). */
  hidden?: boolean;
}

export function PomodoroWidget({ tasks, onSelectTask, hidden }: PomodoroWidgetProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const focusableTasks = tasks
    .filter((t) => t.status !== 'concluida')
    .sort((a, b) => {
      const order: Record<string, number> = { hoje: 0, semana: 1, inbox: 2 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9);
    });

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  if (hidden) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute bottom-24 left-4 z-30 flex flex-col items-start gap-2 sm:left-6"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto mb-1 w-[min(calc(100vw-2rem),18rem)] max-h-[min(50dvh,22rem)] overflow-y-auto rounded-2xl border border-gray-200/80 bg-white/95 p-2 shadow-xl backdrop-blur-md custom-scrollbar"
          >
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Pomodoro — escolher tarefa
            </p>
            {focusableTasks.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-text-muted">
                Sem tarefas ativas. Crie um módulo ou mova um para Hoje.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {focusableTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTask(task);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold text-text-main">
                        {task.title}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-text-muted">
                        {task.status === 'hoje' ? 'Hoje' : task.status === 'semana' ? 'Semana' : 'Inbox'}
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-shadow hover:shadow-xl',
          'bg-gradient-to-br from-rose-500 to-orange-500',
          open && 'ring-2 ring-orange-200 ring-offset-2 ring-offset-pastel-bg'
        )}
        aria-expanded={open}
        aria-label="Abrir seletor de tarefa para Pomodoro"
        title="Pomodoro"
      >
        <Timer size={26} strokeWidth={2.25} className="drop-shadow-sm" />
      </motion.button>
    </div>
  );
}
