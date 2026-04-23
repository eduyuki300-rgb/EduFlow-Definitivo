import React, { useState, useMemo } from 'react';
import { 
  Search, X, Inbox, LayoutList, Grid, Target, CalendarDays, Edit2, CheckSquare, Square
} from 'lucide-react';
import { Task, Status } from '../../types';
import { SUBJECT_INFO } from '../../constants/subjects';
import { cn } from '../../lib/cn';
import { useTasksContext } from '../../context/TasksContext';
import { motion, AnimatePresence } from 'motion/react';

interface InboxTabProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  isEduStuffsOpen?: boolean;
}

interface InboxRowProps {
  key?: string | number;
  task: Task; 
  onEdit: (task: Task) => void; 
  onMove: (id: string, status: Status) => void | Promise<void>; 
  isSelected: boolean; 
  onToggleSelect: () => void;
}

function InboxRow({ 
  task, 
  onEdit, 
  onMove, 
  isSelected, 
  onToggleSelect 
}: InboxRowProps) {
  const info = SUBJECT_INFO[task.subject] || SUBJECT_INFO['Geral'];
  
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border hover:shadow-md group transition-all relative overflow-hidden",
      isSelected ? "border-orange-200 bg-orange-50/30" : "border-gray-100 hover:border-orange-100"
    )}>
      <button 
        onClick={onToggleSelect}
        className="shrink-0 text-gray-300 hover:text-orange-500 transition-colors"
      >
        {isSelected ? <CheckSquare size={20} className="text-orange-500" /> : <Square size={20} />}
      </button>
      
      <span className="text-xl shrink-0">{info.emoji}</span>
      
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-bold text-sm text-gray-900 truncate">{task.title}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{task.subject}</p>
      </div>
      
      <div className="hidden sm:flex shrink-0 items-center justify-center w-16">
        <span className={cn(
          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
          task.priority === 'alta' ? "bg-red-50 text-red-600" :
          task.priority === 'media' ? "bg-amber-50 text-amber-600" :
          "bg-emerald-50 text-emerald-600"
        )}>
          {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
        </span>
      </div>
      
      {/* Quick Actions */}
      <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button 
          onClick={() => onMove(task.id, 'hoje')} 
          title="Mover para Hoje"
          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
        >
          <Target size={16} />
        </button>
        <button 
          onClick={() => onMove(task.id, 'semana')} 
          title="Mover para Semana"
          className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
        >
          <CalendarDays size={16} />
        </button>
        <button 
          onClick={() => onEdit(task)} 
          title="Editar"
          className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
        >
          <Edit2 size={16} />
        </button>
      </div>
    </div>
  );
}

export function InboxTab({ tasks, onEdit, isEduStuffsOpen }: InboxTabProps) {
  const [isGrouped, setIsGrouped] = useState(() => localStorage.getItem('eduflow_inbox_grouped') !== 'false');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { moveTaskToStatus } = useTasksContext();

  React.useEffect(() => {
    localStorage.setItem('eduflow_inbox_grouped', String(isGrouped));
  }, [isGrouped]);

  const inboxTasks = tasks.filter(t => 
    t.status === 'inbox' && 
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  );
  
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    inboxTasks.forEach(task => {
      if (!groups[task.subject]) groups[task.subject] = [];
      groups[task.subject].push(task);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [inboxTasks]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === inboxTasks.length && inboxTasks.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(inboxTasks.map(t => t.id)));
    }
  };

  const handleBatchMove = async (status: Status) => {
    const promises = Array.from(selectedIds).map(id => moveTaskToStatus(id, status));
    await Promise.all(promises);
    setSelectedIds(new Set());
  };

  const handleSingleMove = async (id: string, status: Status) => {
    await moveTaskToStatus(id, status);
  };

  return (
    <div className="flex h-full min-h-0 flex-col max-w-5xl mx-auto w-full px-1 pb-20 relative">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
        <input
          type="text"
          placeholder="Filtrar inbox..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {inboxTasks.length === 0 ? (
        <div className="mt-12 flex min-h-[40dvh] flex-col items-center justify-center px-4 text-center sm:mt-20">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
            <Inbox size={40} className="text-gray-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Inbox Limpo!</h3>
          <p className="text-gray-500 text-sm max-w-xs">{search ? 'Nenhuma tarefa encontrada para esta busca.' : 'Sua caixa de entrada está vazia. Capture novas ideias ou tarefas pendentes aqui.'}</p>
        </div>
      ) : (
        <>
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-3 tracking-tight">
                  <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                  CENTRO DE TRIAGEM
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <button 
                    onClick={handleToggleAll}
                    className="p-1 -ml-1 text-gray-400 hover:text-orange-500 rounded transition-colors"
                  >
                    {selectedIds.size === inboxTasks.length && inboxTasks.length > 0
                      ? <CheckSquare size={16} className="text-orange-500" />
                      : <Square size={16} />
                    }
                  </button>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {inboxTasks.length} {inboxTasks.length === 1 ? 'item pendente' : 'itens pendentes'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsGrouped(!isGrouped)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl border border-gray-100 bg-white text-[10px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm uppercase tracking-widest active:scale-95"
              >
                {isGrouped ? <LayoutList size={14} /> : <Grid size={14} />}
                {isGrouped ? 'Lista' : 'Agrupar'}
              </button>
            </div>

            {isGrouped && (
              <div className="flex flex-wrap gap-2 py-1">
                {groupedTasks.map(([subject, items]) => {
                  const info = SUBJECT_INFO[subject] || SUBJECT_INFO['Geral'];
                  return (
                    <div key={subject} className={cn("px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-2 shadow-sm", info.tagColor)}>
                      <span>{info.emoji}</span>
                      {subject.toUpperCase()}
                      <span className="opacity-40 ml-0.5">{items.length}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {isGrouped ? (
              groupedTasks.map(([subject, items]) => {
                const info = SUBJECT_INFO[subject] || SUBJECT_INFO['Geral'];
                return (
                  <div key={subject} className="space-y-4">
                    <div className="flex items-center gap-4 px-2">
                      <div className={cn("w-1 h-3 rounded-full", info.tagColor.split(' ')[1])} />
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{subject}</h3>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="space-y-2">
                      {items.map(task => (
                        <InboxRow 
                          key={task.id} 
                          task={task} 
                          onEdit={onEdit} 
                          onMove={handleSingleMove}
                          isSelected={selectedIds.has(task.id)}
                          onToggleSelect={() => handleToggleSelect(task.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-2">
                {inboxTasks.map(task => (
                  <InboxRow 
                    key={task.id} 
                    task={task} 
                    onEdit={onEdit}
                    onMove={handleSingleMove}
                    isSelected={selectedIds.has(task.id)}
                    onToggleSelect={() => handleToggleSelect(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Batch Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50 border border-gray-800"
          >
            <span className="text-sm font-bold bg-gray-800 px-3 py-1 rounded-lg">
              {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
            </span>
            
            <div className="w-px h-6 bg-gray-700" />
            
            <button 
              onClick={() => handleBatchMove('hoje')}
              className="flex items-center gap-2 text-sm font-bold hover:text-orange-400 transition-colors"
            >
              <Target size={16} /> Hoje
            </button>
            <button 
              onClick={() => handleBatchMove('semana')}
              className="flex items-center gap-2 text-sm font-bold hover:text-indigo-400 transition-colors"
            >
              <CalendarDays size={16} /> Semana
            </button>
            
            <div className="w-px h-6 bg-gray-700" />
            
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="p-1 hover:text-rose-400 transition-colors"
              title="Cancelar seleção"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
