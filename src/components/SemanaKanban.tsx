import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Status } from '../types';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Star, Pencil, CheckCircle2, Circle, Clock, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLUMNS: { id: Status; title: string; color: string }[] = [
  { id: 'inbox', title: '📥 Inbox', color: 'bg-gray-100' },
  { id: 'semana', title: '🗓️ A Fazer (Semana)', color: 'bg-blue-50' },
  { id: 'hoje', title: '🎯 Em Andamento (Hoje)', color: 'bg-orange-50' },
  { id: 'concluida', title: '✅ Concluído', color: 'bg-green-50' }
];

export function SemanaKanban({ tasks, onEdit, onFocus, playSuccessSound, subjectInfo }: { tasks: Task[], onEdit: (task: Task) => void, onFocus: (task: Task) => void, playSuccessSound: () => void, subjectInfo: any }) {
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
    <div className="flex flex-col h-full bg-white/50 rounded-3xl border border-white/60 shadow-sm overflow-hidden">
      {/* Filters Header */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/40">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar tarefas..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pastel-blue bg-white"
          />
        </div>
        <select 
          value={filterSubject} 
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-600 outline-none focus:border-pastel-blue cursor-pointer w-full sm:w-auto"
        >
          <option value="all">Todas as Matérias</option>
          {subjects.map(sub => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4 custom-scrollbar">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(column => {
              const columnTasks = filteredTasks.filter(t => t.status === column.id);
              
              return (
                <div key={column.id} className="flex flex-col w-80 h-full">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-bold text-gray-700 text-sm">{column.title}</h3>
                    <span className="bg-white text-gray-500 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                      {columnTasks.length}
                    </span>
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 rounded-2xl p-2 transition-colors overflow-y-auto custom-scrollbar",
                          column.color,
                          snapshot.isDraggingOver ? "ring-2 ring-pastel-blue/50 bg-opacity-80" : ""
                        )}
                      >
                        {columnTasks.map((task, index) => {
                          const info = subjectInfo[task.subject] || subjectInfo['Geral'];
                          
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
                                    "bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 group relative select-none",
                                    snapshot.isDragging ? "shadow-lg ring-2 ring-pastel-blue scale-105" : "hover:shadow-md transition-all"
                                  )}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border inline-flex items-center gap-1", info.tagColor)}>
                                      <span>{info.emoji}</span> {task.subject}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {task.status !== 'concluida' && (
                                        <button 
                                          onClick={() => onFocus(task)}
                                          className="text-orange-400 hover:text-orange-600 transition-colors p-1 bg-orange-50 hover:bg-orange-100 rounded-md"
                                          title="Focar nesta tarefa"
                                        >
                                          <Play size={14} fill="currentColor" />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => onEdit(task)}
                                        className="text-gray-300 hover:text-pastel-blue transition-colors p-1"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <h4 className={cn("font-bold text-sm mb-2", task.status === 'concluida' ? "line-through text-gray-400" : "text-gray-800")}>
                                    {task.title}
                                  </h4>

                                  {task.tags && task.tags.length > 0 && (
                                    <div className="flex gap-1 mb-3 flex-wrap">
                                      {task.tags.map(tag => (
                                        <span key={tag} className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                      {totalItems > 0 && (
                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                          {completedItems}/{totalItems}
                                        </span>
                                      )}
                                      {task.difficulty > 0 && (
                                        <div className="flex gap-0.5">
                                          {[...Array(task.difficulty)].map((_, i) => (
                                            <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {task.liquidTime && task.liquidTime > 0 ? (
                                      <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                        <Clock size={10} /> {formatDuration(task.liquidTime)}
                                      </span>
                                    ) : null}
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
