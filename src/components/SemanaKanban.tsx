import React, { useState, useMemo, memo, useCallback } from 'react';
import { motion } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Status } from '../types';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Star, Pencil, Clock, Target, Play, CircleOff, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useFocus } from '../context/FocusContext';
import { SUBJECT_INFO } from '../constants/subjects';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLUMNS: { id: Status; title: string; color: string }[] = [
  { id: 'inbox', title: '📥 Inbox', color: 'bg-white' },
  { id: 'semana', title: '🗓️ Semana', color: 'bg-blue-50/30' },
  { id: 'hoje', title: '🎯 Hoje', color: 'bg-orange-50/30' },
  { id: 'concluida', title: '✅ Pronto', color: 'bg-emerald-50/30' }
];

// OTIMIZAÇÃO: TaskCard Memoizado com Verificação de Props Profundas
const TaskCard = memo(({ task, index, onEdit, setActiveTask }: { 
  task: Task, 
  index: number, 
  onEdit: (t: Task) => void,
  setActiveTask: (t: Task) => void
}) => {
  const info = SUBJECT_INFO[task.subject] || SUBJECT_INFO['Geral'];
  
  const metrics = useMemo(() => {
    let total = 0;
    let completed = 0;
    task.subtasks?.forEach(st => {
      st.items?.forEach(item => {
        total++;
        if (item.completed) completed++;
      });
    });
    return { total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [task.subtasks]);

  return (
    // @ts-ignore
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "p-4 rounded-4xl border border-white/50 backdrop-blur-sm mb-3 group relative select-none shadow-sm",
            info.cardBg,
            snapshot.isDragging ? "shadow-2xl ring-2 ring-orange-100 scale-105 z-50" : "hover:shadow-md hover:border-gray-100 transition-all"
          )}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 shadow-sm transition-transform group-hover:scale-105", info.tagColor)}>
              <span>{info.emoji}</span> {task.subject}
            </span>
            <div className="flex items-center gap-1">
              {task.priority === 'alta' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Alta Prioridade" />}
              <button 
                onClick={() => onEdit(task)}
                className="text-gray-300 hover:text-gray-900 transition-colors p-1.5 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
          
          <h4 className={cn("font-bold text-[15px] leading-snug mb-3 tracking-tight", task.status === 'concluida' ? "line-through text-gray-300" : "text-gray-800")}>
            {task.title}
          </h4>

          {metrics.total > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Progresso</span>
                <span className="text-[10px] font-black text-gray-700 bg-white/50 px-1.5 py-0.5 rounded-md border border-black/5 tabular-nums">
                  {metrics.completed} / {metrics.total}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/5 overflow-hidden border border-white/50 shadow-inner p-px">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.pct}%` }}
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out relative",
                    metrics.pct === 100 ? "bg-emerald-500" : metrics.pct >= 50 ? "bg-indigo-500" : "bg-orange-500"
                  )}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all shadow-sm",
                (task.liquidTime || 0) > 0 ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"
              )}>
                <Clock size={12} className="opacity-60" />
                <span>{task.liquidTime ? Math.floor(task.liquidTime / 60) + 'm' : '0m'}</span>
              </div>

              {(task.questionsTotal || 0) > 0 && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border shadow-sm",
                  (task.questionsCorrect || 0) / (task.questionsTotal || 1) >= 0.8 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  <Target size={12} />
                  <span>{Math.round(((task.questionsCorrect || 0) / (task.questionsTotal || 1)) * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5 group-hover:border-black/10 transition-colors">
            <div className="flex items-center gap-3">
              {task.theoryCompleted && <div className="text-[10px]">📖</div>}
              {task.flashcardsCompleted && <div className="text-[10px]">🧠</div>}
              {task.difficulty > 0 && (
                <div className="flex gap-0.5">
                  {[...Array(task.difficulty)].map((_, i) => (
                    <Star key={i} size={10} className="fill-orange-400 text-orange-400" />
                  ))}
                </div>
              )}
            </div>
            
            {task.status !== 'concluida' && (
              <button 
                onClick={() => setActiveTask(task)}
                className="p-1.5 bg-orange-500 text-white rounded-lg shadow-md hover:scale-110 active:scale-95 transition-all"
              >
                <Play size={10} fill="currentColor" />
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});

TaskCard.displayName = "TaskCard";

export function SemanaKanban({ tasks, onEdit, playSuccessSound }: { tasks: Task[], onEdit: (task: Task) => void, playSuccessSound: () => void }) {
  const { setActiveTask } = useFocus();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const subjects = useMemo(() => Array.from(new Set(tasks.map(t => t.subject))), [tasks]);

  // OTIMIZAÇÃO: Filtragem Global Estabilizada
  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => {
      const matchesSearch = query === '' || task.title.toLowerCase().includes(query);
      const matchesSubject = filterSubject === 'all' || task.subject === filterSubject;
      return matchesSearch && matchesSubject;
    });
  }, [tasks, filterSubject, searchQuery]);

  // AUDIT FIX: 60FPS Performance - Distribuição de tarefas em colunas centralizada
  const tasksByColumn = useMemo(() => {
    const map: Record<Status, Task[]> = { inbox: [], semana: [], hoje: [], concluida: [] };
    filteredTasks.forEach(task => {
      if (map[task.status]) map[task.status].push(task);
    });
    return map;
  }, [filteredTasks]);

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Status;
    try {
      await updateDoc(doc(db, 'tasks', draggableId), { 
        status: newStatus, 
        updatedAt: serverTimestamp() 
      });
      if (newStatus === 'concluida' && source.droppableId !== 'concluida') playSuccessSound();
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  }, [playSuccessSound]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white/40 backdrop-blur-sm rounded-3xl border border-gray-100/50 shadow-xl overflow-hidden">
      <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50/50">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar tarefas..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-100 text-sm focus:outline-none focus:border-orange-500/30 bg-white"
          />
        </div>
        <div className="relative flex items-center w-full sm:w-auto">
          <select 
            value={filterSubject} 
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-2 pr-9 rounded-xl border border-gray-100 text-[11px] uppercase tracking-widest bg-white cursor-pointer w-full sm:w-auto font-bold text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all appearance-none shadow-sm"
          >
            <option value="all">Todas as Matérias</option>
            {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
          <div className="absolute right-3 pointer-events-none text-gray-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 bg-transparent">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 flex-1 custom-scrollbar snap-x">
            {COLUMNS.map(column => {
              const columnTasks = tasksByColumn[column.id] || [];
              
              return (
                <div key={column.id} className="flex flex-col shrink-0 w-80 snap-start h-full">
                  <div className="flex items-center justify-between mb-4 px-3">
                    <h3 className="font-bold text-gray-400 text-[10px] uppercase tracking-[0.2em]">{column.title}</h3>
                    <span className="bg-white/60 text-gray-500 text-[10px] font-black px-2.5 py-1 rounded-xl border border-gray-100 shadow-xs tabular-nums">
                      {columnTasks.length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 min-h-0 space-y-3 p-3 rounded-4xl transition-all overflow-y-auto custom-scrollbar border border-transparent",
                          column.color,
                          snapshot.isDraggingOver && "bg-orange-50/20 border-orange-500/10"
                        )}
                      >
                        {columnTasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-black/5 bg-black/2 flex-1">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
                              <Plus size={16} className="text-gray-300" />
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center">Solte algo aqui</span>
                          </div>
                        )}
                        {columnTasks.map((task, index) => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            index={index} 
                            onEdit={onEdit} 
                            setActiveTask={setActiveTask} 
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
