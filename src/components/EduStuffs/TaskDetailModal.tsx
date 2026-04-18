import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Trash2, Clock, Check, ChevronDown, Flame, 
  Activity, CalendarClock, Timer, RefreshCw, Tag as TagIcon,
  Plus, Calendar, AlertCircle, Save, RotateCcw
} from 'lucide-react';
import { EduStuff, SubTask, CustomTag } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TaskDetailModalProps {
  task: EduStuff;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<EduStuff>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  tags: CustomTag[];
}

const COLOR_MAP: Record<string, {bg: string, text: string, border: string}> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300' },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300' },
  slate:  { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
  rose:   { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-300' },
  cyan:   { bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'border-cyan-300' },
};

export function TaskDetailModal({ task, isOpen, onClose, onUpdate, onDelete, tags }: TaskDetailModalProps) {
  const [localTask, setLocalTask] = useState<EduStuff>(task);
  const [newSubtask, setNewSubtask] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalTask(task);
    setHasChanges(false);
  }, [task]);

  const handleUpdate = async (updates: Partial<EduStuff>) => {
    const updated = { ...localTask, ...updates };
    setLocalTask(updated);
    setHasChanges(true);
    await onUpdate(task.id, updates);
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('Deseja salvar as alterações antes de fechar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    
    const newTask: SubTask = {
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: newSubtask.trim(),
      completed: false
    };
    
    const updatedSubtasks = [...(localTask.subtasks || []), newTask];
    await handleUpdate({ subtasks: updatedSubtasks });
    setNewSubtask('');
  };

  const toggleSubtask = async (subId: string) => {
    const updatedSubtasks = localTask.subtasks?.map(st => 
      st.id === subId ? { ...st, completed: !st.completed } : st
    );
    await handleUpdate({ subtasks: updatedSubtasks });
  };

  const deleteSubtask = async (subId: string) => {
    const updatedSubtasks = localTask.subtasks?.filter(st => st.id !== subId);
    await handleUpdate({ subtasks: updatedSubtasks });
  };

  const completedSubtasks = localTask.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = localTask.subtasks?.length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const isExpired = localTask.dueDate && new Date(localTask.dueDate) < new Date();
  const isToday = localTask.dueDate && new Date(localTask.dueDate).toDateString() === new Date().toDateString();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        className="relative w-full max-w-lg bg-white rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* HANDLE BAR */}
        <div className="flex justify-center p-3 md:hidden">
          <div className="w-12 h-1.5 bg-gray-100 rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {/* BLOCO 1 - HERO */}
          <section className="mb-8">
            <textarea 
              ref={titleRef}
              value={localTask.title}
              onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
              onBlur={() => handleUpdate({ title: localTask.title })}
              className="w-full bg-transparent border-none text-3xl font-black text-gray-900 placeholder:text-gray-200 focus:ring-0 resize-none p-0 tracking-tight leading-tight"
              rows={2}
            />
            
            <div className="flex items-center gap-2 mt-4">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                localTask.completed ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-400 border-gray-200"
              )}>
                {localTask.completed ? '✅ CONCLUÍDO' : '📋 EM ABERTO'}
              </span>
              {task.priority === 'alta' && (
                <span className="px-3 py-1 bg-rose-100 text-rose-600 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                  URGENTE
                </span>
              )}
            </div>
          </section>

          {/* BLOCO 2 - METADADOS GRID */}
          <section className="grid grid-cols-2 gap-4 mb-10">
            {/* PRIORIDADE */}
            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
               <div className="flex items-center gap-2 text-gray-400 mb-3">
                 <Flame size={14} />
                 <span className="text-[10px] font-black uppercase tracking-wider">Prioridade</span>
               </div>
               <div className="flex flex-wrap gap-1.5">
                 {[
                   { id: 'urgente', color: 'bg-rose-500', label: '🔴' },
                   { id: 'alta', color: 'bg-orange-500', label: '🟠' },
                   { id: 'media', color: 'bg-amber-400', label: '🟡' },
                   { id: 'baixa', color: 'bg-slate-300', label: '⚪' }
                 ].map((p) => (
                   <button 
                     key={p.id}
                     onClick={() => handleUpdate({ priority: p.id as any })}
                     className={cn(
                       "flex-1 py-2 rounded-lg text-xs font-black transition-all border-2",
                       localTask.priority === p.id ? `${p.color} border-white text-white shadow-md scale-105` : "bg-white border-transparent text-gray-400 opacity-50 hover:opacity-100"
                     )}
                   >
                     {p.label}
                   </button>
                 ))}
               </div>
            </div>

            {/* STATUS */}
            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
               <div className="flex items-center gap-2 text-gray-400 mb-3">
                 <Activity size={14} />
                 <span className="text-[10px] font-black uppercase tracking-wider">Status</span>
               </div>
               <select 
                  value={localTask.status || 'todo'}
                  onChange={(e) => handleUpdate({ status: e.target.value as any })}
                  className="w-full bg-white border-none rounded-lg text-xs font-bold py-2 focus:ring-0 cursor-pointer shadow-sm"
               >
                 <option value="todo">⬜ A fazer</option>
                 <option value="doing">🔄 Fazendo</option>
                 <option value="blocked">🚫 Bloqueado</option>
               </select>
            </div>

            {/* VENCIMENTO */}
            <div className={cn(
              "p-4 rounded-2xl border transition-all",
              isExpired ? "bg-rose-50 border-rose-100" : isToday ? "bg-amber-50 border-amber-100" : "bg-gray-50/50 border-gray-100"
            )}>
               <div className={cn("flex items-center gap-2 mb-3", isExpired ? "text-rose-500" : "text-gray-400")}>
                 <CalendarClock size={14} />
                 <span className="text-[10px] font-black uppercase tracking-wider">Vencimento</span>
                 {isExpired && <span className="ml-auto text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded">ATRASADO</span>}
               </div>
               <input 
                 type="datetime-local"
                 value={localTask.dueDate ? localTask.dueDate.slice(0, 16) : ''}
                 onChange={(e) => handleUpdate({ dueDate: new Date(e.target.value).toISOString() })}
                 className="w-full bg-transparent border-none text-xs font-bold p-0 focus:ring-0"
               />
            </div>

            {/* DURAÇÃO */}
            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
               <div className="flex items-center gap-2 text-gray-400 mb-3">
                 <Timer size={14} />
                 <span className="text-[10px] font-black uppercase tracking-wider">Estimativa</span>
               </div>
               <select 
                  value={localTask.estimatedTime || '30min'}
                  onChange={(e) => handleUpdate({ estimatedTime: e.target.value })}
                  className="w-full bg-white border-none rounded-lg text-xs font-bold py-2 focus:ring-0 cursor-pointer shadow-sm"
               >
                 <option value="15min">15 min</option>
                 <option value="30min">30 min</option>
                 <option value="45min">45 min</option>
                 <option value="1h">1 hora</option>
                 <option value="1h30">1h 30m</option>
                 <option value="2h">2 horas</option>
                 <option value="3h+">3h ou mais</option>
                 <option value="livre">Tempo livre</option>
               </select>
            </div>

            {/* RECORRÊNCIA */}
            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
               <div className="flex items-center gap-2 text-gray-400 mb-3">
                 <RefreshCw size={14} />
                 <span className="text-[10px] font-black uppercase tracking-wider">Repetir</span>
               </div>
               <select 
                  value={localTask.recurrence || 'none'}
                  onChange={(e) => handleUpdate({ recurrence: e.target.value as any })}
                  className="w-full bg-white border-none rounded-lg text-xs font-bold py-2 focus:ring-0 cursor-pointer shadow-sm"
               >
                 <option value="none">Não repete</option>
                 <option value="daily">Todo dia</option>
                 <option value="weekly">Toda semana</option>
                 <option value="monthly">Todo mês</option>
               </select>
            </div>

            {/* TAG SELECTOR */}
            <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
               <div className="flex items-center gap-2 text-gray-400 mb-3">
                 <TagIcon size={14} />
                 <span className="text-[10px] font-black uppercase tracking-wider">Tag</span>
               </div>
               <select 
                  value={localTask.category}
                  onChange={(e) => handleUpdate({ category: e.target.value })}
                  className="w-full bg-white border-none rounded-lg text-xs font-bold py-2 focus:ring-0 cursor-pointer shadow-sm"
               >
                 {tags.map(tag => (
                   <option key={tag.id} value={tag.id}>{tag.emoji} {tag.label}</option>
                 ))}
                 {!tags.find(t => t.id === localTask.category) && <option value="pessoal">✨ Pessoal</option>}
               </select>
            </div>
          </section>

          {/* BLOCO 3 - SUBTAREFAS */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                SUBTAREFAS <span className="text-gray-400 font-bold">({completedSubtasks}/{totalSubtasks})</span>
              </h3>
              <span className="text-[10px] font-black text-indigo-500">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full mb-6 overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progressPercent}%` }}
                 className="h-full bg-indigo-500"
               />
            </div>

            <div className="space-y-2">
              {localTask.subtasks?.map((st) => (
                <div key={st.id} className="group flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                  <button 
                    onClick={() => toggleSubtask(st.id)}
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                      st.completed ? "bg-indigo-500 text-white" : "border-2 border-gray-200 bg-white"
                    )}
                  >
                    {st.completed && <Check size={12} strokeWidth={4} />}
                  </button>
                  <span className={cn(
                    "flex-1 text-sm font-medium transition-all",
                    st.completed ? "text-gray-400 line-through opacity-60" : "text-gray-700 underline-offset-4"
                  )}>
                    {st.title}
                  </span>
                  <button 
                    onClick={() => deleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-500 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <form onSubmit={handleAddSubtask} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 focus-within:border-indigo-200 mt-2 transition-all">
                <Plus size={16} className="text-gray-300" />
                <input 
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Nova subtarefa... (Pressione Enter)"
                  className="flex-1 bg-transparent border-none text-sm font-medium placeholder:text-gray-300 focus:ring-0 p-0"
                />
              </form>
            </div>
          </section>

          {/* BLOCO 4 - NOTAS */}
          <section className="mb-8">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">NOTAS</h3>
            <textarea 
              value={localTask.notes || ''}
              onChange={(e) => setLocalTask({ ...localTask, notes: e.target.value })}
              onBlur={() => {
                if (localTask.notes !== task.notes) {
                  handleUpdate({ notes: localTask.notes }).catch(console.error);
                }
              }}
              placeholder="Adicione detalhes, links, contexto..."
              className="w-full min-h-[120px] bg-gray-50/50 border border-gray-100 rounded-2xl p-4 text-sm font-medium text-gray-700 placeholder:text-gray-300 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50 transition-all outline-none resize-none"
            />
          </section>

          {/* BLOCO 5 - RODAPÉ DE AÇÕES */}
          <section className="space-y-3 pt-6 border-t border-gray-100">
            <div className="flex gap-3">
              <button 
                onClick={() => handleUpdate({ isDeferred: true, deferredUntil: new Date(Date.now() + 86400000).toISOString() })}
                className="flex-1 h-12 bg-white border border-gray-100 hover:border-amber-200 hover:bg-amber-50 text-gray-500 hover:text-amber-600 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Clock size={16} /> Adiar para Amanhã
              </button>
              <button 
                onClick={() => { if(confirm('Excluir esta missão permanentemente?')) onDelete(task.id); }}
                className="w-12 h-12 bg-white border border-gray-100 hover:border-rose-200 hover:bg-rose-50 text-gray-300 hover:text-rose-500 rounded-2xl flex items-center justify-center transition-all"
                title="Excluir Missão"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <button 
              onClick={() => {
                if (localTask.completed) {
                   handleUpdate({ completed: false, completedAt: undefined });
                } else {
                   handleUpdate({ completed: true, completedAt: new Date().toISOString() });
                   onClose();
                }
              }}
              className={cn(
                "w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3",
                localTask.completed 
                  ? "bg-white border-2 border-gray-900 text-gray-900 shadow-gray-100" 
                  : "bg-gray-900 text-white shadow-gray-200 hover:bg-black"
              )}
            >
              {localTask.completed ? (
                <> <RotateCcw size={18} strokeWidth={3} /> REABRIR TAREFA </>
              ) : (
                <> <Check size={18} strokeWidth={4} /> SALVAR & CONCLUÍRAR </>
              )}
            </button>
          </section>

          {/* TIMESTAMPS */}
          <div className="flex justify-between items-center mt-8 px-2 opacity-50">
            <span className="text-[9px] font-black text-gray-400 uppercase">CRIADO EM: {new Date(task.createdAt).toLocaleDateString()}</span>
            {task.updatedAt && (
              <span className="text-[9px] font-black text-gray-400 uppercase">MODIFICADO: {new Date(task.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
