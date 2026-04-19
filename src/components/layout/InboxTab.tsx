import React from 'react';
import { 
  Search, X, Inbox, LayoutList, Grid 
} from 'lucide-react';
import { Task } from '../../types';
import { SUBJECT_INFO } from '../../constants/subjects';
import { cn } from '../../lib/cn';
import { TaskCard } from './TaskCard';

interface InboxTabProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  isEduStuffsOpen?: boolean;
}

export function InboxTab({ tasks, onEdit, isEduStuffsOpen }: InboxTabProps) {
  const [isGrouped, setIsGrouped] = React.useState(() => localStorage.getItem('eduflow_inbox_grouped') !== 'false');
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    localStorage.setItem('eduflow_inbox_grouped', String(isGrouped));
  }, [isGrouped]);

  const inboxTasks = tasks.filter(t => 
    t.status === 'inbox' && 
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  );
  
  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, Task[]> = {};
    inboxTasks.forEach(task => {
      if (!groups[task.subject]) groups[task.subject] = [];
      groups[task.subject].push(task);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [inboxTasks]);

  return (
    <div className="flex h-full min-h-0 flex-col max-w-2xl mx-auto w-full px-1 pb-20">
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
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-4.5">
                  {inboxTasks.length} {inboxTasks.length === 1 ? 'item pendente' : 'itens pendentes'}
                </p>
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

          <div className="space-y-8">
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
                    <div className="space-y-3">
                      {items.map(task => (
                        <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-3">
                {inboxTasks.map(task => (
                  <TaskCard key={task.id} task={task} onEdit={() => onEdit(task)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
