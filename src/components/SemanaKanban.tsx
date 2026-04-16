import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Status } from '../types';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Star, Pencil, CheckCircle2, Circle, Clock, Target, Play } from 'lucide-react';
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

export function SemanaKanban({ tasks, onEdit, playSuccessSound }: { tasks: Task[], onEdit: (task: Task) => void, playSuccessSound: () => void }) {
  const { setActiveTask } = useFocus();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const subjects = Array.from(new Set(tasks.map(t => t.subject)));

  const filteredTasks = tasks.filter(task => {
    if (filterSubject !== 'all' && task.subject !== filterSubject) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Status;
    
    try {
      await updateDoc(doc(db, 'tasks', draggableId), { 
        status: newStatus, 
        updatedAt: serverTimestamp() 
      });
      
      if (newStatus === 'concluida' && source.droppableId !== 'concluida') {
        playSuccessSound();
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-sm rounded-3xl border border-gray-100/50 shadow-xl overflow-hidden">
      {/* Filters Header */}
      <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50/50">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar tarefas..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-100 text-sm focus:outline-none focus:border-orange-500/30 bg-white text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <select 
          value={filterSubject} 
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-100 text-sm bg-white text-gray-500 outline-none focus:border-orange-500/30 cursor-pointer w-full sm:w-auto font-medium"
        >
          <option value="all" className="bg-white">Todas as Matérias</option>
          {subjects.map(sub => (
            <option key={sub} value={sub} className="bg-white">{sub}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4 custom-scrollbar bg-transparent">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(column => {
              const columnTasks = filteredTasks.filter(t => t.status === column.id);
              
              return (
                <div key={column.id} className="flex flex-col w-[calc(100vw-3rem)] sm:w-[320px] md:w-[350px] lg:w-[400px] h-full shrink-0">
                  <div className="flex items-center justify-between mb-5 px-3">
                    <h3 className="font-bold text-gray-400 text-[10px] uppercase tracking-[0.2em]">{column.title}</h3>
                    <span className="bg-gray-50 text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-gray-100 shadow-sm">
                      {columnTasks.length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 rounded-[2rem] p-3 transition-all overflow-y-auto custom-scrollbar border border-gray-50 shadow-inner",
                          column.color,
                          snapshot.isDraggingOver ? "ring-2 ring-orange-500/10" : ""
                        )}
                        style={{ minHeight: '400px' }}
                      >
                        {columnTasks.map((task, index) => {
                          const info = SUBJECT_INFO[task.subject] || SUBJECT_INFO['Geral'];
                          
                          let totalItems = 0;
                          let completedItems = 0;
                          task.subtasks?.forEach(st => {
                            st.items?.forEach(item => {
                              totalItems++;
                              if (item.completed) completedItems++;
                            });
                          });
                          const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                          return (
                            // @ts-ignore
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "p-4 rounded-[2rem] border border-white/50 backdrop-blur-sm mb-3 group relative select-none shadow-sm",
                                    info.cardBg,
                                    snapshot.isDragging ? "shadow-2xl ring-2 ring-orange-100 scale-105" : "hover:shadow-md hover:border-gray-100 transition-all"
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

                                  {/* --- RECOVERY: VISUAL PROGRESS BAR --- */}
                                  {totalItems > 0 && (
                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-1 h-3 bg-gray-200 rounded-full" />
                                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Progresso</span>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-700 bg-white/50 px-1.5 py-0.5 rounded-md border border-black/5 tabular-nums">
                                          {completedItems} <span className="text-gray-300 font-medium">/</span> {totalItems}
                                        </span>
                                      </div>
                                      <div className="h-1.5 w-full rounded-full bg-black/5 overflow-hidden border border-white/50 shadow-inner p-[1px]">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${progressPct}%` }}
                                          className={cn(
                                            "h-full rounded-full transition-all duration-1000 ease-out relative",
                                            progressPct === 100 ? "bg-emerald-500" : 
                                            progressPct >= 50 ? "bg-indigo-500" : 
                                            "bg-orange-500"
                                          )}
                                        >
                                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </motion.div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Metrics & Performance */}
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Time Badge */}
                                      <div className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all shadow-sm",
                                        (task.liquidTime || 0) > 0 ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"
                                      )}>
                                        <Clock size={12} className="opacity-60" />
                                        <span>{task.liquidTime ? Math.floor(task.liquidTime / 60) + 'm' : '0m'}</span>
                                      </div>

                                      {/* Accuracy Badge */}
                                      {(task.questionsTotal || 0) > 0 && (
                                        <div className={cn(
                                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border shadow-sm",
                                          (task.questionsCorrect || 0) / (task.questionsTotal || 1) >= 0.8 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                          (task.questionsCorrect || 0) / (task.questionsTotal || 1) >= 0.6 ? "bg-amber-50 text-amber-600 border-amber-100" : 
                                          "bg-rose-50 text-rose-600 border-rose-100"
                                        )}>
                                          <Target size={12} className="opacity-60" />
                                          <span>{Math.round(((task.questionsCorrect || 0) / (task.questionsTotal || 1)) * 100)}%</span>
                                        </div>
                                      )}

                                      {/* Pomodoro */}
                                      {((task.pomodoros || 0) > 0) && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-bold shadow-sm">
                                          <span>🍅</span> {task.pomodoros}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {task.tags && task.tags.length > 0 && (
                                      <div className="flex gap-1.5 flex-wrap">
                                        {task.tags.map(tag => (
                                          <span key={tag} className="text-[8px] font-bold uppercase tracking-widest bg-black/5 text-gray-500/80 px-2 py-0.5 rounded-lg border border-black/5">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5 group-hover:border-black/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                      {task.theoryCompleted && (
                                        <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[10px]" title="Teoria OK">📖</div>
                                      )}
                                      {task.flashcardsCompleted && (
                                        <div className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-[10px]" title="Flashcards OK">🧠</div>
                                      )}
                                      {task.difficulty > 0 && (
                                        <div className="flex gap-0.5 ml-1">
                                          {[...Array(task.difficulty)].map((_, i) => (
                                            <Star key={i} size={10} className="fill-orange-400 text-orange-400" />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {task.status !== 'concluida' && (
                                      <button 
                                        onClick={() => setActiveTask(task)}
                                        className="p-1.5 bg-orange-500 text-white rounded-lg shadow-md shadow-orange-200 active:scale-90 transition-transform"
                                      >
                                        <Play size={10} fill="currentColor" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
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
